import base64
import json
from uuid import UUID

from fastapi import HTTPException
from psycopg import sql

from app.corpus.database import connect


def encode_cursor(values):
    return base64.urlsafe_b64encode(json.dumps(values, default=str).encode()).decode()


def decode_cursor(cursor, kind, scope, length):
    if cursor is None:
        return None
    try:
        data = json.loads(base64.b64decode(cursor, altchars=b"-_", validate=True))
        if (
            not isinstance(data, list)
            or len(data) != length + 2
            or data[:2] != [kind, scope]
        ):
            raise ValueError()
        return data[2:]
    except (ValueError, TypeError):
        raise HTTPException(422, "Invalid cursor for this query") from None


def integer_values(values):
    if any(type(v) is not int or v < 0 or v > 9223372036854775807 for v in values):
        raise HTTPException(422, "Invalid cursor values")
    return values


def page(rows, limit, kind, scope, positions):
    more = len(rows) > limit
    items = rows[:limit]
    cursor = (
        encode_cursor([kind, scope] + [items[-1][p] for p in positions])
        if more
        else None
    )
    return {"items": items, "next_cursor": cursor}


def require_story(db, identifier):
    if (
        identifier is not None
        and not db.execute(
            "SELECT 1 FROM corpus.stories WHERE id=%s AND status='completed'",
            (identifier,),
        ).fetchone()
    ):
        raise HTTPException(404, "Completed story not found")


def characters(sort, story_id, include_non_han, cursor, limit, character):
    scope = f"{story_id}:{include_non_han}:{character}"
    values = decode_cursor(cursor, sort, scope, 2)
    with connect() as db:
        require_story(db, story_id)
        table = "story_character_stats" if story_id else "character_stats"
        where, params = ["true"], []
        if story_id:
            where.append("st.story_id=%s")
            params.append(story_id)
        if not include_non_han:
            where.append("c.is_han")
        if character:
            where.append("c.value=%s")
            params.append(character)
        if values:
            count, identifier = integer_values(values)
            where.append(f"(st.{sort}<%s OR (st.{sort}=%s AND c.id>%s))")
            params.extend([count, count, identifier])
        # sort is a route-level Literal, and table comes from the fixed choices above.
        query = sql.SQL("""SELECT c.id,c.value,c.is_han,st.occurrence_count,
            st.distinct_segment_count,st.segment_occurrence_count FROM corpus.{} st
            JOIN corpus.characters c ON c.id=st.character_id WHERE {} ORDER BY st.{} DESC,c.id LIMIT %s""").format(
            sql.Identifier(table), sql.SQL(" AND ".join(where)), sql.Identifier(sort)
        )
        rows = db.execute(query, params + [limit + 1]).fetchall()
    return page(rows, limit, sort, scope, [sort, "id"])


def character_detail(character_id, story_id=None):
    with connect() as db:
        require_story(db, story_id)
        table = "story_character_stats" if story_id else "character_stats"
        condition = sql.SQL(" AND st.story_id=%s") if story_id else sql.SQL("")
        params = [character_id] + ([story_id] if story_id else [])
        row = db.execute(
            sql.SQL("""SELECT c.id,c.value,c.is_han,st.occurrence_count,
            st.distinct_segment_count,st.segment_occurrence_count FROM corpus.characters c
            JOIN corpus.{} st ON st.character_id=c.id WHERE c.id=%s{}""").format(
                sql.Identifier(table), condition
            ),
            params,
        ).fetchone()
        if row is None:
            raise HTTPException(404, "Character not found in the completed corpus")
        row["sentence_count"] = db.execute(
            """SELECT count(DISTINCT (s.story_id,s.sentence_position)) AS n
            FROM corpus.segment_characters sc JOIN corpus.segment_occurrences o ON o.segment_id=sc.segment_id
            JOIN corpus.sentences s ON s.id=o.sentence_id
            JOIN corpus.stories d ON d.id=s.story_id AND d.status='completed'
            WHERE sc.character_id=%s AND (%s::uuid IS NULL OR s.story_id=%s)""",
            (character_id, story_id, story_id),
        ).fetchone()["n"]
        return row


def character_segments(
    character_id,
    story_id,
    include_non_words,
    cursor,
    limit,
    include_sentence_counts=False,
):
    scope = f"{character_id}:{story_id}:{include_non_words}"
    values = decode_cursor(cursor, "segments", scope, 1)
    after = integer_values(values)[0] if values else 0
    with connect() as db:
        require_story(db, story_id)
        if not db.execute(
            "SELECT 1 FROM corpus.characters WHERE id=%s", (character_id,)
        ).fetchone():
            raise HTTPException(404, "Character not found")
        rows = db.execute(
            """SELECT s.id,s.text,s.is_word,sc.count_in_segment,
            sum(ss.occurrence_count)::bigint AS occurrence_count
            FROM corpus.segment_characters sc JOIN corpus.segments s ON s.id=sc.segment_id
            JOIN corpus.story_segment_stats ss ON ss.segment_id=s.id
            JOIN corpus.stories d ON d.id=ss.story_id AND d.status='completed'
            WHERE sc.character_id=%s AND s.id>%s AND (%s OR s.is_word)
            AND (%s::uuid IS NULL OR d.id=%s) GROUP BY s.id,sc.count_in_segment ORDER BY s.id LIMIT %s""",
            (character_id, after, include_non_words, story_id, story_id, limit + 1),
        ).fetchall()
        if include_sentence_counts:
            counts = db.execute(
                """SELECT o.segment_id,count(DISTINCT (s.story_id,s.sentence_position)) AS n
                FROM corpus.segment_occurrences o JOIN corpus.sentences s ON s.id=o.sentence_id
                JOIN corpus.stories d ON d.id=s.story_id AND d.status='completed'
                WHERE o.segment_id=ANY(%s) AND (%s::uuid IS NULL OR s.story_id=%s)
                GROUP BY o.segment_id""",
                ([row["id"] for row in rows[:limit]], story_id, story_id),
            ).fetchall()
            by_id = {count["segment_id"]: count["n"] for count in counts}
            for row in rows:
                row["sentence_count"] = by_id.get(row["id"], 0)
    return page(rows, limit, "segments", scope, ["id"])


def sentences(
    *, story_id=None, character_id=None, segment_id=None, cursor=None, limit=50
):
    scope = f"{story_id}:{character_id}:{segment_id}"
    values = decode_cursor(cursor, "sentences", scope, 2)
    after_story, after_position = UUID(int=0), -1
    if values:
        try:
            after_story = UUID(values[0])
        except (ValueError, TypeError, AttributeError):
            raise HTTPException(422, "Invalid cursor story") from None
        after_position = integer_values([values[1]])[0]
    with connect() as db:
        require_story(db, story_id)
        if (
            character_id is not None
            and not db.execute(
                "SELECT 1 FROM corpus.characters WHERE id=%s", (character_id,)
            ).fetchone()
        ):
            raise HTTPException(404, "Character not found")
        if (
            segment_id is not None
            and not db.execute(
                "SELECT 1 FROM corpus.segments WHERE id=%s", (segment_id,)
            ).fetchone()
        ):
            raise HTTPException(404, "Segment not found")
        conditions, params = [], []
        if character_id is not None:
            conditions.append("""EXISTS (SELECT 1 FROM corpus.segment_occurrences o
                JOIN corpus.character_occurrences co ON co.segment_occurrence_id=o.id
                WHERE o.sentence_id=s.id AND co.character_id=%s)""")
            params.append(character_id)
        if segment_id is not None:
            conditions.append(
                "EXISTS (SELECT 1 FROM corpus.segment_occurrences o WHERE o.sentence_id=s.id AND o.segment_id=%s)"
            )
            params.append(segment_id)
        extra = " AND " + " AND ".join(conditions) if conditions else ""
        rows = db.execute(
            """SELECT s.*,d.title AS story_title FROM corpus.sentences s JOIN corpus.stories d ON d.id=s.story_id AND d.status='completed'
            WHERE (%s::uuid IS NULL OR s.story_id=%s) AND (s.story_id,s.position)>(%s,%s)"""
            + extra
            + """
            ORDER BY s.story_id,s.position LIMIT %s""",
            [story_id, story_id, after_story, after_position] + params + [limit + 1],
        ).fetchall()
        for row in rows[:limit]:
            if character_id is not None:
                matches = db.execute(
                    """SELECT (o.start_offset+co.position_in_segment)::integer AS start_offset,
                    (o.start_offset+co.position_in_segment+1)::integer AS end_offset FROM corpus.segment_occurrences o
                    JOIN corpus.character_occurrences co ON co.segment_occurrence_id=o.id
                    WHERE o.sentence_id=%s AND co.character_id=%s ORDER BY start_offset""",
                    (row["id"], character_id),
                ).fetchall()
            elif segment_id is not None:
                matches = db.execute(
                    "SELECT start_offset,end_offset FROM corpus.segment_occurrences WHERE sentence_id=%s AND segment_id=%s ORDER BY start_offset",
                    (row["id"], segment_id),
                ).fetchall()
            else:
                matches = []
            row["matches"] = matches
    return page(rows, limit, "sentences", scope, ["story_id", "position"])


def stream_text(story_id):
    with connect() as db:
        with db.cursor(name="export_sentences") as cursor:
            cursor.execute(
                "SELECT raw_text FROM corpus.sentences WHERE story_id=%s ORDER BY position",
                (story_id,),
            )
            for row in cursor:
                yield row["raw_text"].encode("utf-8")
