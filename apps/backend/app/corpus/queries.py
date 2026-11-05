import base64
import json
from uuid import UUID

from fastapi import HTTPException
from psycopg import sql

from app.auth.dependencies import user_id
from app.corpus.database import connect
from app.corpus.script_forms import convert_forms, hydrate_forms


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
            "SELECT 1 FROM corpus.stories WHERE id=%s AND status='completed' AND user_id=%s",
            (identifier, user_id()),
        ).fetchone()
    ):
        raise HTTPException(404, "Completed story not found")


def statistics(owner, story_id):
    return (
        """WITH owned AS (
      SELECT id FROM corpus.stories WHERE user_id=%s AND status='completed' AND (%s::uuid IS NULL OR id=%s)
    ), frequencies AS (
      SELECT cs.character_id,sum(cs.occurrence_count)::bigint AS occurrence_count
      FROM corpus.story_character_stats cs JOIN owned o ON o.id=cs.story_id GROUP BY cs.character_id
    ), vocabulary AS (
      SELECT sc.character_id,count(DISTINCT ss.segment_id)::bigint AS distinct_segment_count,
        sum(ss.occurrence_count)::bigint AS segment_occurrence_count
      FROM corpus.story_segment_stats ss JOIN owned o ON o.id=ss.story_id
      JOIN corpus.segments s ON s.id=ss.segment_id AND s.is_word
      JOIN corpus.segment_characters sc ON sc.segment_id=s.id GROUP BY sc.character_id
    ), stats AS (
      SELECT f.*,coalesce(v.distinct_segment_count,0) AS distinct_segment_count,
        coalesce(v.segment_occurrence_count,0) AS segment_occurrence_count
      FROM frequencies f LEFT JOIN vocabulary v USING(character_id)
    ) """,
        [owner, story_id, story_id],
    )


def characters(sort, story_id, include_non_han, cursor, limit, character):
    owner = user_id()
    scope = f"{owner}:{story_id}:{include_non_han}:{character}"
    values = decode_cursor(cursor, sort, scope, 2)
    with connect() as db:
        require_story(db, story_id)
        prefix, params = statistics(owner, story_id)
        params.append(owner)
        conditions = ["true"]
        if not include_non_han:
            conditions.append("c.is_han")
        if character:
            conditions.append("c.value=%s")
            params.append(character)
        if values:
            count, identifier = integer_values(values)
            conditions.append(f"(st.{sort}<%s OR (st.{sort}=%s AND c.id>%s))")
            params.extend([count, count, identifier])
        query = sql.SQL(
            prefix
            + """SELECT c.*,st.occurrence_count,st.distinct_segment_count,st.segment_occurrence_count,
            coalesce(p.learned,false) AS learned,coalesce(p.learning,false) AS learning
            FROM stats st JOIN corpus.characters c ON c.id=st.character_id
            LEFT JOIN corpus.user_character_progress p ON p.character_id=c.id AND p.user_id=%s
            WHERE {} ORDER BY {} DESC,c.id LIMIT %s"""
        ).format(sql.SQL(" AND ".join(conditions)), sql.Identifier("st", sort))
        rows = db.execute(query, params + [limit + 1]).fetchall()
    for row in rows:
        hydrate_forms(row, "value", vocabulary=True)
    return page(rows, limit, sort, scope, [sort, "id"])


def require_vocabulary(db, kind, identifier):
    table, column = (
        ("story_character_stats", "character_id")
        if kind == "character"
        else ("story_segment_stats", "segment_id")
    )
    found = db.execute(
        sql.SQL(
            "SELECT 1 FROM corpus.{} st JOIN corpus.stories d ON d.id=st.story_id WHERE st.{}=%s AND d.user_id=%s AND d.status='completed' LIMIT 1"
        ).format(sql.Identifier(table), sql.Identifier(column)),
        (identifier, user_id()),
    ).fetchone()
    if not found:
        raise HTTPException(404, f"{kind.capitalize()} not found")


def character_detail(character_id, story_id=None):
    with connect() as db:
        require_story(db, story_id)
        prefix, params = statistics(user_id(), story_id)
        row = db.execute(
            prefix
            + """SELECT c.*,st.occurrence_count,st.distinct_segment_count,st.segment_occurrence_count,
            coalesce(p.learned,false) AS learned,coalesce(p.learning,false) AS learning
            FROM corpus.characters c JOIN stats st ON st.character_id=c.id
            LEFT JOIN corpus.user_character_progress p ON p.character_id=c.id AND p.user_id=%s
            WHERE c.id=%s""",
            params + [user_id(), character_id],
        ).fetchone()
        if not row:
            raise HTTPException(404, "Character not found")
        row["sentence_count"] = db.execute(
            """SELECT count(DISTINCT (s.story_id,s.sentence_position)) AS n
            FROM corpus.segment_characters sc JOIN corpus.segment_occurrences o ON o.segment_id=sc.segment_id
            JOIN corpus.sentences s ON s.id=o.sentence_id JOIN corpus.stories d ON d.id=s.story_id
            WHERE d.status='completed' AND d.user_id=%s AND sc.character_id=%s AND (%s::uuid IS NULL OR s.story_id=%s)""",
            (user_id(), character_id, story_id, story_id),
        ).fetchone()["n"]
        return hydrate_forms(row, "value", vocabulary=True)


def character_segments(
    character_id,
    story_id,
    include_non_words,
    cursor,
    limit,
    include_sentence_counts=False,
):
    scope = f"{user_id()}:{character_id}:{story_id}:{include_non_words}"
    values = decode_cursor(cursor, "segments", scope, 1)
    after = integer_values(values)[0] if values else 0
    with connect() as db:
        require_story(db, story_id)
        require_vocabulary(db, "character", character_id)
        rows = db.execute(
            """SELECT s.id,s.text,s.traditional_text,s.simplified_text,s.is_word,sc.count_in_segment,
            sum(ss.occurrence_count)::bigint AS occurrence_count
            FROM corpus.segment_characters sc JOIN corpus.segments s ON s.id=sc.segment_id
            JOIN corpus.story_segment_stats ss ON ss.segment_id=s.id
            JOIN corpus.stories d ON d.id=ss.story_id AND d.status='completed'
            WHERE d.user_id=%s AND sc.character_id=%s AND s.id>%s AND (%s OR s.is_word)
            AND (%s::uuid IS NULL OR d.id=%s) GROUP BY s.id,sc.count_in_segment ORDER BY s.id LIMIT %s""",
            (
                user_id(),
                character_id,
                after,
                include_non_words,
                story_id,
                story_id,
                limit + 1,
            ),
        ).fetchall()
        if include_sentence_counts:
            counts = db.execute(
                """SELECT o.segment_id,count(DISTINCT (s.story_id,s.sentence_position)) AS n
                FROM corpus.segment_occurrences o JOIN corpus.sentences s ON s.id=o.sentence_id
                JOIN corpus.stories d ON d.id=s.story_id AND d.status='completed'
                WHERE d.user_id=%s AND o.segment_id=ANY(%s) AND (%s::uuid IS NULL OR s.story_id=%s)
                GROUP BY o.segment_id""",
                (user_id(), [row["id"] for row in rows[:limit]], story_id, story_id),
            ).fetchall()
            by_id = {count["segment_id"]: count["n"] for count in counts}
            for row in rows:
                row["sentence_count"] = by_id.get(row["id"], 0)
    for row in rows:
        hydrate_forms(row, "text", vocabulary=True)
    return page(rows, limit, "segments", scope, ["id"])


def sentences(
    *, story_id=None, character_id=None, segment_id=None, cursor=None, limit=50
):
    scope = f"{user_id()}:{story_id}:{character_id}:{segment_id}"
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
        if character_id is not None:
            require_vocabulary(db, "character", character_id)
        if segment_id is not None:
            require_vocabulary(db, "segment", segment_id)
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
            WHERE d.user_id=%s AND (%s::uuid IS NULL OR s.story_id=%s) AND (s.story_id,s.position)>(%s,%s)"""
            + extra
            + """
            ORDER BY s.story_id,s.position LIMIT %s""",
            [user_id(), story_id, story_id, after_story, after_position]
            + params
            + [limit + 1],
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
            hydrate_forms(row, "raw_text")
    return page(rows, limit, "sentences", scope, ["story_id", "position"])


def stream_text(story_id, script="original", *, owner_id=None):
    owner_id = owner_id or user_id()
    with connect() as db:
        fields = (
            sql.SQL("raw_text")
            if script == "original"
            else sql.SQL("raw_text,{}").format(sql.Identifier(f"{script}_text"))
        )
        with db.cursor(name="export_sentences") as cursor:
            cursor.execute(
                sql.SQL(
                    "SELECT {} FROM corpus.sentences WHERE story_id=%s AND EXISTS (SELECT 1 FROM corpus.stories d WHERE d.id=story_id AND d.user_id=%s) ORDER BY position"
                ).format(fields),
                (story_id, owner_id),
            )
            for row in cursor:
                text = (
                    row["raw_text"] if script == "original" else row[f"{script}_text"]
                )
                if text is None:
                    text = getattr(convert_forms(row["raw_text"]), script)
                yield text.encode("utf-8")
