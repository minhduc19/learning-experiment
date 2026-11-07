"""Private, persistent system prompt libraries, including each user's selection."""

from pathlib import Path
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field, StrictInt, model_validator

from app.auth.dependencies import current_user, user_id
from app.corpus.database import connect
from app.corpus.routes import CorpusRoute
from app.lessons.routes import Model, read_json, validate

DEFAULT_TITLE = "First multiple choice quiz"
DEFAULT_CONTENT = Path(__file__).with_name("default_system_prompt.txt").read_text(encoding="utf-8")
router = APIRouter(route_class=CorpusRoute, dependencies=[Depends(current_user)])


class Prompt(Model):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=50000)

    @model_validator(mode="after")
    def nonblank(self):
        if not self.title.strip() or not self.content.strip():
            raise ValueError("Title and prompt text must not be blank")
        return self


class UpdatePrompt(Prompt):
    revision: StrictInt = Field(ge=1)


def library(db):
    # Seed exactly once, even if the user later deletes every prompt.
    created = db.execute(
        "INSERT INTO corpus.ai_prompt_libraries(user_id) VALUES (%s) "
        "ON CONFLICT DO NOTHING RETURNING user_id",
        (user_id(),),
    ).fetchone()
    if created:
        identifier = uuid4()
        db.execute(
            "INSERT INTO corpus.ai_system_prompts(id,user_id,title,content) VALUES (%s,%s,%s,%s)",
            (identifier, user_id(), DEFAULT_TITLE, DEFAULT_CONTENT),
        )
        db.execute(
            "UPDATE corpus.ai_prompt_libraries SET selected_id=%s WHERE user_id=%s",
            (identifier, user_id()),
        )
    # Serialize mutations and snapshots for this user's library.
    return db.execute(
        "SELECT selected_id FROM corpus.ai_prompt_libraries WHERE user_id=%s FOR UPDATE",
        (user_id(),),
    ).fetchone()


def snapshot(db):
    selected = db.execute(
        "SELECT selected_id FROM corpus.ai_prompt_libraries WHERE user_id=%s",
        (user_id(),),
    ).fetchone()
    items = db.execute(
        "SELECT id,title,content,revision,created_at,updated_at FROM corpus.ai_system_prompts "
        "WHERE user_id=%s ORDER BY created_at,id",
        (user_id(),),
    ).fetchall()
    return {"items": items, "selected_id": selected["selected_id"]}


def owned(db, identifier, revision=None):
    row = db.execute(
        "SELECT revision FROM corpus.ai_system_prompts WHERE id=%s AND user_id=%s",
        (identifier, user_id()),
    ).fetchone()
    if not row:
        raise HTTPException(404, "System prompt not found")
    if revision is not None and row["revision"] != revision:
        raise HTTPException(
            409,
            "This prompt changed elsewhere. Copy your edits, then reload prompts before trying again.",
        )


@router.get("")
def list_prompts():
    with connect() as db:
        library(db)
        return snapshot(db)


@router.post("", status_code=201)
def create_prompt(raw: Annotated[object, Depends(read_json)]):
    prompt = validate(Prompt, raw)
    with connect() as db:
        library(db)
        db.execute(
            "INSERT INTO corpus.ai_system_prompts(id,user_id,title,content) VALUES (%s,%s,%s,%s)",
            (uuid4(), user_id(), prompt.title, prompt.content),
        )
        return snapshot(db)


@router.put("/{identifier}/select")
def select_prompt(identifier: UUID):
    with connect() as db:
        library(db)
        owned(db, identifier)
        db.execute(
            "UPDATE corpus.ai_prompt_libraries SET selected_id=%s WHERE user_id=%s",
            (identifier, user_id()),
        )
        return snapshot(db)


@router.put("/{identifier}")
def update_prompt(identifier: UUID, raw: Annotated[object, Depends(read_json)]):
    prompt = validate(UpdatePrompt, raw)
    with connect() as db:
        library(db)
        owned(db, identifier, prompt.revision)
        db.execute(
            "UPDATE corpus.ai_system_prompts SET title=%s,content=%s,revision=revision+1,updated_at=now() "
            "WHERE id=%s AND user_id=%s",
            (prompt.title, prompt.content, identifier, user_id()),
        )
        return snapshot(db)


@router.delete("/{identifier}")
def delete_prompt(identifier: UUID, revision: int = Query(ge=1)):
    with connect() as db:
        library(db)
        owned(db, identifier, revision)
        db.execute(
            "DELETE FROM corpus.ai_system_prompts WHERE id=%s AND user_id=%s",
            (identifier, user_id()),
        )
        return snapshot(db)
