"""Rank logical sentences by the owner's marked Han character occurrences."""

from uuid import UUID

from fastapi import HTTPException

from app.auth.dependencies import user_id
from app.corpus.database import connect
from app.corpus.queries import decode_cursor, integer_values, page


def practice_sentences(cursor=None, limit=20):
    owner = user_id()
    with connect() as db:
        # A changed set of marks invalidates old ranking cursors.
        revision = db.execute(
            """SELECT md5(coalesce(string_agg(character_id::text || ':' || learned::text || ':' || learning::text,
            ',' ORDER BY character_id),'')) AS value FROM corpus.user_character_progress WHERE user_id=%s""",
            (owner,),
        ).fetchone()["value"]
        scope = f"{owner}:{revision}"
        values = decode_cursor(cursor, "practice", scope, 3)
        after_count, after_story, after_position = 9223372036854775807, UUID(int=0), -1
        if values:
            after_count, after_position = integer_values([values[0], values[2]])
            try:
                after_story = UUID(values[1])
            except (ValueError, TypeError, AttributeError):
                raise HTTPException(422, "Invalid practice cursor") from None
        rows = db.execute(
            ranking_cte()
            + """, selected AS MATERIALIZED (
                SELECT * FROM ranked
                WHERE matched_count<%s OR (matched_count=%s AND (story_id,sentence_position)>(%s,%s))
                ORDER BY matched_count DESC,story_id,sentence_position LIMIT %s
            )
            SELECT r.*,d.title AS story_title,s.id,s.raw_text,s.part_position,s.is_final,
              (SELECT count(*) FROM corpus.sentences parts WHERE parts.story_id=r.story_id
                AND parts.sentence_position=r.sentence_position) AS fragment_count
            FROM selected r JOIN corpus.stories d ON d.id=r.story_id
            JOIN corpus.sentences s ON s.story_id=r.story_id AND s.position=r.preview_position
            ORDER BY r.matched_count DESC,r.story_id,r.sentence_position""",
            (
                owner,
                owner,
                True,
                after_count,
                after_count,
                after_story,
                after_position,
                limit + 1,
            ),
        ).fetchall()
        for row in rows[:limit]:
            start = max(0, row.pop("first_offset") - 200)
            original = row["raw_text"]
            row["raw_text"] = original[start : start + 1000]
            row["is_excerpt"] = (
                row.pop("fragment_count") > 1 or start > 0 or len(original) > 1000
            )
            row["excerpt_offset"] = start
            row["marks"] = db.execute(
                """SELECT (o.start_offset+co.position_in_segment-%s)::integer AS offset,p.learned,p.learning
                FROM corpus.segment_occurrences o JOIN corpus.character_occurrences co ON co.segment_occurrence_id=o.id
                JOIN corpus.characters c ON c.id=co.character_id AND c.is_han
                JOIN corpus.user_character_progress p ON p.character_id=c.id AND p.user_id=%s
                WHERE o.sentence_id=%s AND (p.learned OR p.learning)
                AND o.start_offset+co.position_in_segment >= %s
                AND o.start_offset+co.position_in_segment < %s ORDER BY 1""",
                (start, owner, row["id"], start, start + 1000),
            ).fetchall()
    return page(
        rows,
        limit,
        "practice",
        scope,
        ["matched_count", "story_id", "sentence_position"],
    )


def ranking_cte():
    """Shared logical sentence ranking; third parameter includes learning-only hits."""
    return """WITH hits AS (
                SELECT s.story_id,s.sentence_position,s.position,
                  (o.start_offset+co.position_in_segment)::integer AS offset,
                  p.learned,p.learning
                FROM corpus.user_character_progress p
                JOIN corpus.characters c ON c.id=p.character_id AND c.is_han
                JOIN corpus.character_occurrences co ON co.character_id=p.character_id
                JOIN corpus.segment_occurrences o ON o.id=co.segment_occurrence_id
                JOIN corpus.sentences s ON s.id=o.sentence_id
                JOIN corpus.stories d ON d.id=s.story_id AND d.status='completed' AND d.user_id=%s
                WHERE p.user_id=%s AND (p.learned OR p.learning) AND (%s OR p.learned)
            ), fragment_hits AS (
                SELECT story_id,sentence_position,position,count(*)::bigint AS matched_count,
                  count(*) FILTER(WHERE learned AND NOT learning)::bigint AS learned_count,
                  count(*) FILTER(WHERE learning AND NOT learned)::bigint AS learning_count,
                  count(*) FILTER(WHERE learned AND learning)::bigint AS both_count,
                  min(h.offset) AS first_offset
                FROM hits h GROUP BY story_id,sentence_position,position
            ), ranked AS (
                SELECT story_id,sentence_position,sum(matched_count)::bigint AS matched_count,
                  sum(learned_count)::bigint AS learned_count,
                  sum(learning_count)::bigint AS learning_count,
                  sum(both_count)::bigint AS both_count,
                  min(position) AS preview_position,
                  (array_agg(first_offset ORDER BY position))[1] AS first_offset
                FROM fragment_hits GROUP BY story_id,sentence_position
            )
"""
