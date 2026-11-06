"""Personal learning flags for shared character and segment definitions."""

from app.auth.dependencies import user_id
from app.corpus.database import connect
from app.corpus.queries import require_vocabulary


def update_segment_progress(segment_id, data):
    with connect() as db:
        require_vocabulary(db, "segment", segment_id)
        return db.execute(
            """INSERT INTO corpus.user_segment_progress AS p
            (user_id,segment_id,learned,learning)
            VALUES (%s,%s,coalesce(%s,false),coalesce(%s,false))
            ON CONFLICT (user_id,segment_id) DO UPDATE SET
            learned=coalesce(%s,p.learned),learning=coalesce(%s,p.learning),updated_at=now()
            RETURNING segment_id,learned,learning""",
            (
                user_id(),
                segment_id,
                data.learned,
                data.learning,
                data.learned,
                data.learning,
            ),
        ).fetchone()


def update_character_progress(character_id, data):
    with connect() as db:
        require_vocabulary(db, "character", character_id)
        # Partial, idempotent updates preserve the other flag, even when two
        # requests insert/update the same user's character concurrently.
        return db.execute(
            """INSERT INTO corpus.user_character_progress AS p
            (user_id,character_id,learned,learning)
            VALUES (%s,%s,coalesce(%s,false),coalesce(%s,false))
            ON CONFLICT (user_id,character_id) DO UPDATE SET
            learned=coalesce(%s,p.learned),learning=coalesce(%s,p.learning),updated_at=now()
            RETURNING character_id,learned,learning""",
            (
                user_id(),
                character_id,
                data.learned,
                data.learning,
                data.learned,
                data.learning,
            ),
        ).fetchone()
