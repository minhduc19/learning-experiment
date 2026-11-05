"""Assign quarantined legacy uploads explicitly using server administrator access."""

import argparse
from uuid import UUID

from app.corpus.database import connect


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--upload-id", type=UUID)
    group.add_argument(
        "--all", action="store_true", help="Assign all currently unowned uploads"
    )
    args = parser.parse_args()
    with connect(worker=True) as db:
        owner = db.execute(
            "SELECT id FROM auth.users WHERE lower(email)=lower(%s)", (args.email,)
        ).fetchone()
        if not owner:
            parser.error("Create the target account first")
        uploads = db.execute(
            "UPDATE corpus.uploads SET user_id=%s WHERE user_id IS NULL AND (%s::uuid IS NULL OR id=%s) RETURNING id",
            (owner["id"], args.upload_id, args.upload_id),
        ).fetchall()
        stories = db.execute(
            """UPDATE corpus.stories s SET user_id=%s FROM corpus.uploads u
            WHERE s.upload_id=u.id AND s.user_id IS NULL AND u.id=ANY(%s) RETURNING s.id""",
            (owner["id"], [u["id"] for u in uploads]),
        ).fetchall()
    print(f"Assigned {len(uploads)} uploads and {len(stories)} stories")


if __name__ == "__main__":
    main()
