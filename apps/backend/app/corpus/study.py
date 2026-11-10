from app.corpus.story_filter import story_predicate
"""Read-only study selection using the practice sentence ranking CTE."""

from fastapi import HTTPException

from app.auth.dependencies import user_id
from app.corpus.database import connect
from app.corpus.practice import ranking_cte
from app.corpus.script_forms import hydrate_forms


def select_study(learned_count, new_count, story_ids=None):
    if learned_count + new_count == 0:
        raise HTTPException(422, "Request at least one character")
    owner = user_id()
    with connect() as db:
        learned = (
            db.execute(
                """WITH frequencies AS (
              SELECT st.character_id,sum(st.occurrence_count)::bigint AS occurrence_count
              FROM corpus.story_character_stats st JOIN corpus.stories d ON d.id=st.story_id
              WHERE d.user_id=%s AND d.status='completed'""" + story_predicate(story_ids) + """ GROUP BY st.character_id
            ) SELECT c.*,f.occurrence_count,count(*) OVER() AS available_count
            FROM frequencies f JOIN corpus.characters c ON c.id=f.character_id AND c.is_han
            JOIN corpus.user_character_progress p ON p.character_id=c.id AND p.user_id=%s AND p.learned
            ORDER BY random() LIMIT %s""",
                (owner, owner, learned_count),
            ).fetchall()
            if learned_count
            else []
        )
        new = (
            db.execute(
                ranking_cte(story_ids)
                + """, frequencies AS (
              SELECT st.character_id,sum(st.occurrence_count)::bigint AS occurrence_count
              FROM corpus.story_character_stats st JOIN corpus.stories d ON d.id=st.story_id
              WHERE d.user_id=%s AND d.status='completed'""" + story_predicate(story_ids) + """ GROUP BY st.character_id
            ), candidates AS (
              SELECT c.*,f.occurrence_count,s.id AS sentence_id,s.story_id,s.sentence_position,
                coalesce(r.matched_count,0)::bigint AS learned_sentence_count,
                row_number() OVER(PARTITION BY c.id ORDER BY coalesce(r.matched_count,0) DESC,
                  s.story_id,s.sentence_position,s.position,o.position,co.position_in_segment) AS choice
              FROM frequencies f JOIN corpus.characters c ON c.id=f.character_id AND c.is_han
              LEFT JOIN corpus.user_character_progress p ON p.character_id=c.id AND p.user_id=%s
              JOIN corpus.character_occurrences co ON co.character_id=c.id
              JOIN corpus.segment_occurrences o ON o.id=co.segment_occurrence_id
              JOIN corpus.sentences s ON s.id=o.sentence_id
              JOIN corpus.stories d ON d.id=s.story_id AND d.user_id=%s AND d.status='completed'""" + story_predicate(story_ids) + """
              LEFT JOIN ranked r ON r.story_id=s.story_id AND r.sentence_position=s.sentence_position
              WHERE NOT coalesce(p.learned,false)
            ) SELECT *,count(*) OVER() AS available_count FROM candidates WHERE choice=1
              ORDER BY learned_sentence_count DESC,story_id,sentence_position,occurrence_count DESC,id
              LIMIT %s""",
                (owner, owner, False, owner, owner, owner, new_count),
            ).fetchall()
            if new_count
            else []
        )
        cache = {}

        def sentence(identifier):
            if identifier not in cache:
                row = db.execute(
                    """SELECT s.*,d.title AS story_title,
                    EXISTS(SELECT 1 FROM corpus.sentences parts WHERE parts.story_id=s.story_id
                      AND parts.sentence_position=s.sentence_position AND parts.id<>s.id) AS is_excerpt
                    FROM corpus.sentences s JOIN corpus.stories d ON d.id=s.story_id
                    WHERE s.id=%s AND d.user_id=%s AND d.status='completed'""" + story_predicate(story_ids) + """""",
                    (identifier, owner),
                ).fetchone()
                hydrate_forms(row, "raw_text")
                segments = db.execute(
                    """SELECT v.id,v.text,v.traditional_text,v.simplified_text,v.is_word,o.position,o.start_offset,o.end_offset
                    FROM corpus.segment_occurrences o JOIN corpus.segments v ON v.id=o.segment_id
                    WHERE o.sentence_id=%s ORDER BY o.position""",
                    (identifier,),
                ).fetchall()
                row["segments"] = [
                    hydrate_forms(segment, "text", vocabulary=True)
                    for segment in segments
                ]
                cache[identifier] = row
            return cache[identifier]

        for row in learned:
            hydrate_forms(row, "value", vocabulary=True)
            segments = db.execute(
                """SELECT v.*,sum(st.occurrence_count)::bigint AS occurrence_count
                FROM corpus.segment_characters sc JOIN corpus.segments v ON v.id=sc.segment_id AND v.is_word
                JOIN corpus.story_segment_stats st ON st.segment_id=v.id
                JOIN corpus.stories d ON d.id=st.story_id AND d.user_id=%s AND d.status='completed'""" + story_predicate(story_ids) + """
                WHERE sc.character_id=%s GROUP BY v.id ORDER BY occurrence_count DESC,v.id LIMIT 3""",
                (owner, row["id"]),
            ).fetchall()
            row["popular_segments"] = []
            for segment in segments:
                hydrate_forms(segment, "text", vocabulary=True)
                example = db.execute(
                    """SELECT s.id FROM corpus.segment_occurrences o JOIN corpus.sentences s ON s.id=o.sentence_id
                    JOIN corpus.stories d ON d.id=s.story_id AND d.user_id=%s AND d.status='completed'""" + story_predicate(story_ids) + """
                    WHERE o.segment_id=%s ORDER BY s.story_id,s.position,o.position LIMIT 1""",
                    (owner, segment["id"]),
                ).fetchone()
                segment["sentence"] = sentence(example["id"])
                row["popular_segments"].append(segment)
        for row in new:
            hydrate_forms(row, "value", vocabulary=True)
            row["sentence"] = sentence(row.pop("sentence_id"))
            row.pop("choice")
        learned_available = learned[0]["available_count"] if learned else 0
        new_available = new[0]["available_count"] if new else 0
        if learned_count == 0 or new_count == 0:
            totals = db.execute(
                """SELECT count(*) FILTER(WHERE p.learned) AS learned,
                count(*) FILTER(WHERE NOT coalesce(p.learned,false)) AS new
                FROM corpus.characters c LEFT JOIN corpus.user_character_progress p
                ON p.character_id=c.id AND p.user_id=%s WHERE c.is_han AND EXISTS(
                  SELECT 1 FROM corpus.story_character_stats st JOIN corpus.stories d ON d.id=st.story_id
                  WHERE st.character_id=c.id AND d.user_id=%s AND d.status='completed'""" + story_predicate(story_ids) + """)""",
                (owner, owner),
            ).fetchone()
            learned_available, new_available = totals["learned"], totals["new"]
        for row in learned + new:
            row.pop("available_count")
        return {
            "learned": learned,
            "new": new,
            "story_ids": list(story_ids or []),
            "requested": {"learned": learned_count, "new": new_count},
            "available": {"learned": learned_available, "new": new_available},
        }
