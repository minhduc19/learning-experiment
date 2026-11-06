from uuid import uuid4

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb

from app.auth.dependencies import user_id
from app.corpus.database import connect
from app.corpus.study import select_study


def generate(learned_count, new_count):
    data = select_study(learned_count, new_count)
    with connect() as db:
        row = db.execute(
            "INSERT INTO corpus.study_history(id,user_id,learned_count,new_count,data) VALUES (%s,%s,%s,%s,%s) RETURNING id,created_at",
            (
                uuid4(),
                user_id(),
                learned_count,
                new_count,
                Jsonb(jsonable_encoder(data)),
            ),
        ).fetchone()
    return {**row, "data": data}


def listing(before=0):
    with connect() as db:
        rows = db.execute(
            """SELECT id,created_at,json_build_object('learned',learned_count,'new',new_count) AS requested FROM corpus.study_history
            WHERE user_id=%s ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET %s""",
            (user_id(), before),
        ).fetchall()
    return {"items": rows[:50], "next": before + 50 if len(rows) > 50 else None}


def retrieve(identifier):
    with connect() as db:
        row = db.execute(
            "SELECT id,created_at,data FROM corpus.study_history WHERE id=%s AND user_id=%s",
            (identifier, user_id()),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Saved selection not found")
    return row
