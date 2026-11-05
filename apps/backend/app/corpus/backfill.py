"""Resumable, bounded conversion of corpus rows created before OpenCC support."""

import logging
import time

from psycopg import sql

from app.corpus.database import connect
from app.corpus.script_forms import CONVERSION_VERSION, convert_forms, vocabulary_forms

ENTITIES = {
    "characters": ("value", "traditional_value", "simplified_value"),
    "segments": ("text", "traditional_text", "simplified_text"),
    "sentences": ("raw_text", "traditional_text", "simplified_text"),
}


def backfill_once(batch_size=64):
    """Return True when one batch advances; another worker can continue it."""
    if not 1 <= batch_size <= 256:
        raise ValueError("Backfill batch size must be between 1 and 256")
    with connect(worker=True) as db:
        if not db.execute(
            "SELECT pg_try_advisory_xact_lock(735981644) AS locked"
        ).fetchone()["locked"]:
            return False
        db.execute(
            """INSERT INTO corpus.script_backfill_progress(singleton,conversion_version)
            VALUES (true,%s) ON CONFLICT DO NOTHING""",
            (CONVERSION_VERSION,),
        )
        progress = db.execute(
            "SELECT * FROM corpus.script_backfill_progress WHERE singleton"
        ).fetchone()
        if progress["conversion_version"] != CONVERSION_VERSION:
            raise ValueError(
                "Script conversion version changed; a new backfill migration is required"
            )
        if progress["completed"]:
            return False
        entity = progress["entity"]
        source, traditional, simplified = ENTITIES[entity]
        # Lock/update vocabulary in the same database collation order as the
        # importer's upserts. The bounded inner page still advances by source ID.
        rows = db.execute(
            sql.SQL(
                "SELECT * FROM (SELECT id,{},{},{} FROM corpus.{} WHERE id>%s ORDER BY id LIMIT %s) pending ORDER BY {},id"
            ).format(
                *map(sql.Identifier, (source, traditional, simplified, entity, source))
            ),
            (progress["last_id"], batch_size),
        ).fetchall()
        updates = []
        converter = convert_forms if entity == "sentences" else vocabulary_forms
        for row in rows:
            if row[traditional] is None or row[simplified] is None:
                forms = converter(row[source])
                updates.append((forms.traditional, forms.simplified, row["id"]))
        if updates:
            with db.cursor() as cursor:
                cursor.executemany(
                    sql.SQL(
                        "UPDATE corpus.{} SET {}=%s,{}=%s WHERE id=%s AND ({} IS NULL OR {} IS NULL)"
                    ).format(
                        *map(
                            sql.Identifier,
                            (entity, traditional, simplified, traditional, simplified),
                        )
                    ),
                    updates,
                )
        if len(rows) == batch_size:
            db.execute(
                "UPDATE corpus.script_backfill_progress SET last_id=%s WHERE singleton",
                (max(row["id"] for row in rows),),
            )
        elif entity != "sentences":
            next_entity = list(ENTITIES)[list(ENTITIES).index(entity) + 1]
            db.execute(
                "UPDATE corpus.script_backfill_progress SET entity=%s,last_id=0 WHERE singleton",
                (next_entity,),
            )
        else:
            db.execute(
                "UPDATE corpus.stories SET conversion_version=%s WHERE conversion_version IS NULL",
                (CONVERSION_VERSION,),
            )
            db.execute(
                "UPDATE corpus.script_backfill_progress SET completed=true WHERE singleton"
            )
    return True


def main():
    from app.corpus.migrate import migrate

    logging.basicConfig(level=logging.INFO)
    migrate()
    batches = 0
    while True:
        if backfill_once():
            batches += 1
            continue
        # False can also mean another worker holds this batch's lock.
        with connect() as db:
            progress = db.execute(
                "SELECT completed FROM corpus.script_backfill_progress WHERE singleton"
            ).fetchone()
        if progress and progress["completed"]:
            break
        time.sleep(0.2)
    logging.info("Script backfill complete (%s batches)", batches)


if __name__ == "__main__":
    main()
