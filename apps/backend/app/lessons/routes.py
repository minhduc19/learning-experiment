import json
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from psycopg.types.json import Jsonb
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    ValidationError,
    model_validator,
)

from app.auth.dependencies import current_user, user_id
from app.corpus.database import connect
from app.corpus.routes import CorpusRoute


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Option(Model):
    id: str = Field(min_length=1, max_length=200)
    label: str = Field(min_length=1, max_length=2000)
    feedback: str = Field(min_length=1, max_length=10000)
    fill: str | None = None
    audio_id: str | None = Field(default=None, pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
    audio_text: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def current_audio(self):
        if self.audio_text != self.label:
            self.audio_id = None
            self.audio_text = None
        return self


class Question(Model):
    id: str = Field(min_length=1, max_length=200)
    instruction: str = "Fill in the blank"
    sentence: str = Field(min_length=1, max_length=20000)
    answer: str
    translation: str | None = None
    target_character: str | None = Field(
        default=None, alias="target-character", min_length=1, max_length=1
    )
    target_segment: str | None = Field(
        default=None, alias="target-segment", min_length=1, max_length=256
    )
    options: list[Option] = Field(min_length=2, max_length=20)

    @model_validator(mode="after")
    def valid_question(self):
        ids = [option.id for option in self.options]
        if self.sentence.count("[[blank]]") != 1:
            raise ValueError(
                "Each multiple-choice sentence needs exactly one [[blank]]"
            )
        if len(set(ids)) != len(ids) or self.answer not in ids:
            raise ValueError(
                "Option IDs must be unique and answer must reference an option ID"
            )
        return self


class Item(Model):
    id: str = Field(min_length=1, max_length=200)
    type: Literal["multiple-choice"]
    data: Question


class Lesson(Model):
    schemaVersion: Literal[1]
    title: str = Field(min_length=1, max_length=200)
    items: list[Item] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def valid_items(self):
        if not self.title.strip() or len({item.id for item in self.items}) != len(
            self.items
        ):
            raise ValueError("Title must not be blank and item IDs must be unique")
        return self


class Update(Model):
    revision: StrictInt = Field(ge=1)
    document: Lesson


async def read_json(request: Request):
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > 1048576:
            raise HTTPException(413, "Lesson JSON must be at most 1 MiB")
        data.extend(chunk)
    try:
        return json.loads(data)
    except (ValueError, UnicodeError):
        raise HTTPException(422, "Invalid JSON") from None


def validate(model, raw):
    try:
        return model.model_validate(raw)
    except ValidationError as error:
        messages = [
            ".".join(map(str, item["loc"])) + ": " + item["msg"]
            for item in error.errors()
        ]
        raise HTTPException(422, "; ".join(messages)) from None


def validate_audio_ownership(db, document):
    for item in document.items:
        for option in item.data.options:
            if option.audio_id and not db.execute(
                "SELECT id FROM corpus.option_audio WHERE id=%s AND user_id=%s AND text=%s AND status='ready'",
                (UUID(option.audio_id), user_id(), option.label),
            ).fetchone():
                raise HTTPException(422, "An option audio reference is unavailable or does not match its text.")


router = APIRouter(route_class=CorpusRoute, dependencies=[Depends(current_user)])


@router.post("", status_code=201)
def create_lesson(raw: Annotated[object, Depends(read_json)]):
    document = validate(Lesson, raw)
    with connect() as db:
        validate_audio_ownership(db, document)
        return db.execute(
            """INSERT INTO corpus.lessons(id,user_id,title,document) VALUES (%s,%s,%s,%s)
            RETURNING id,title,document,revision,created_at,updated_at""",
            (
                uuid4(),
                user_id(),
                document.title,
                Jsonb(document.model_dump(by_alias=True)),
            ),
        ).fetchone()


@router.get("")
def list_lessons(offset: int = Query(default=0, ge=0)):
    with connect() as db:
        rows = db.execute(
            """SELECT id,title,revision,created_at,updated_at FROM corpus.lessons
            WHERE user_id=%s ORDER BY updated_at DESC,id DESC LIMIT 51 OFFSET %s""",
            (user_id(), offset),
        ).fetchall()
    return {"items": rows[:50], "next": offset + 50 if len(rows) > 50 else None}


@router.get("/{identifier}")
def get_lesson(identifier: UUID):
    with connect() as db:
        row = db.execute(
            "SELECT id,title,document,revision,created_at,updated_at FROM corpus.lessons WHERE id=%s AND user_id=%s",
            (identifier, user_id()),
        ).fetchone()
    if not row:
        raise HTTPException(404, "Lesson not found")
    return row


@router.put("/{identifier}")
def update_lesson(identifier: UUID, raw: Annotated[object, Depends(read_json)]):
    update = validate(Update, raw)
    with connect() as db:
        current = db.execute(
            "SELECT revision FROM corpus.lessons WHERE id=%s AND user_id=%s FOR UPDATE",
            (identifier, user_id()),
        ).fetchone()
        if not current:
            raise HTTPException(404, "Lesson not found")
        if current["revision"] != update.revision:
            raise HTTPException(
                409,
                "This lesson changed elsewhere. Reload it before saving; keep a copy of your JSON first.",
            )
        validate_audio_ownership(db, update.document)
        return db.execute(
            """UPDATE corpus.lessons SET title=%s,document=%s,revision=revision+1,updated_at=now()
            WHERE id=%s AND user_id=%s RETURNING id,title,document,revision,created_at,updated_at""",
            (
                update.document.title,
                Jsonb(update.document.model_dump(by_alias=True)),
                identifier,
                user_id(),
            ),
        ).fetchone()


@router.delete("/{identifier}", status_code=204)
def delete_lesson(identifier: UUID, revision: int = Query(ge=1)):
    with connect() as db:
        current = db.execute(
            "SELECT revision FROM corpus.lessons WHERE id=%s AND user_id=%s FOR UPDATE",
            (identifier, user_id()),
        ).fetchone()
        if not current:
            raise HTTPException(404, "Lesson not found")
        if current["revision"] != revision:
            raise HTTPException(
                409, "This lesson changed elsewhere. Reload before deleting."
            )
        db.execute(
            "DELETE FROM corpus.lessons WHERE id=%s AND user_id=%s",
            (identifier, user_id()),
        )
    return Response(status_code=204)


@router.post("/{identifier}/attempts", status_code=201)
def start_attempt(identifier: UUID):
    from app.lessons.attempts import start

    return start(identifier)


@router.post("/attempts/{identifier}/complete")
def complete_attempt(identifier: UUID, raw: Annotated[object, Depends(read_json)]):
    from app.lessons.attempts import finish

    return finish(identifier, raw)
