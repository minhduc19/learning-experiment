"""Versioned transactional SQL migrations, serialized across replicas."""

from pathlib import Path

from app.corpus.database import connect


def migrate():
    with connect(worker=True) as db:
        db.execute("SELECT pg_advisory_xact_lock(735981642)")
        db.execute("CREATE SCHEMA IF NOT EXISTS corpus")
        db.execute(
            "CREATE TABLE IF NOT EXISTS corpus.schema_migrations (version text PRIMARY KEY)"
        )
        for path in sorted((Path(__file__).parent / "migrations").glob("*.sql")):
            if not db.execute(
                "SELECT 1 FROM corpus.schema_migrations WHERE version=%s", (path.name,)
            ).fetchone():
                db.execute(path.read_text())
                db.execute(
                    "INSERT INTO corpus.schema_migrations VALUES (%s)", (path.name,)
                )


if __name__ == "__main__":
    migrate()
