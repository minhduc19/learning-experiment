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
from app.lessons.prompts import PromptFields
from app.readings.schemas import ReadingDocument


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


class Question(PromptFields, Model):
    id: str = Field(min_length=1, max_length=200)
    instruction: str = "Fill in the blank"
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
        if self.text_prompt.count("[[blank]]") != 1:
            raise ValueError(
                "Each multiple-choice text-prompt needs exactly one [[blank]]"
            )
        if len(set(ids)) != len(ids) or self.answer not in ids:
            raise ValueError(
                "Option IDs must be unique and answer must reference an option ID"
            )
        return self


class Tile(Model):
    id: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=2000)


class Jumble(PromptFields, Model):
    id: str
    instruction: str
    text_prompt: str | None = Field(default=None, alias="text-prompt", max_length=20000)
    sourceLanguage: str | None = None
    targetLanguage: str
    tiles: list[Tile] = Field(min_length=2, max_length=40)
    answers: list[list[str]] = Field(min_length=1, max_length=20)
    translation: str
    explanation: str

    @model_validator(mode="before")
    @classmethod
    def default_visibility(cls, value):
        if isinstance(value, dict) and 'text-prompt-available' not in value:
            value = {**value, 'text-prompt-available': bool(value.get('text-prompt', value.get('prompt')))}
        return value

    @model_validator(mode="after")
    def valid_tiles(self):
        if not all(tile.id.strip() and tile.text.strip() for tile in self.tiles):
            raise ValueError("Tiles must contain text")
        ids = [tile.id for tile in self.tiles]
        if len(ids) != len(set(ids)) or any(not answer or len(answer) != len(set(answer)) or not set(answer) <= set(ids) for answer in self.answers):
            raise ValueError("Tile IDs must be unique and accepted answers must reference each tile at most once")
        if self.text_prompt_available and not self.text_prompt:
            raise ValueError("An available text prompt needs text")
        return self


class Pair(Model):
    id: str = Field(min_length=1, max_length=200)
    source: str = Field(min_length=1, max_length=2000)
    target: str = Field(min_length=1, max_length=2000)


class Matching(Model):
    title: str
    instruction: str
    sourceLanguage: str
    targetLanguage: str
    pairs: list[Pair] = Field(min_length=2, max_length=5)

    @model_validator(mode="after")
    def valid_pairs(self):
        if not all(pair.id.strip() and pair.source.strip() and pair.target.strip() for pair in self.pairs):
            raise ValueError("Pairs must contain text")
        if len({pair.id for pair in self.pairs}) != len(self.pairs):
            raise ValueError("Pair IDs must be unique")
        return self


class Reading(ReadingDocument):
    model_config = ConfigDict(extra="forbid", strict=True)

    @model_validator(mode="after")
    def valid_blocks(self):
        if not self.blocks or len(self.blocks)>200 or len({block.id for block in self.blocks}) != len(self.blocks):
            raise ValueError("Reading needs 1–200 blocks with unique IDs")
        for block in self.blocks:
            if not block.id.strip():
                raise ValueError("Reading block IDs must not be blank")
            if block.type == 'Multiple-choice':
                Question.model_validate(block.question.model_dump(by_alias=True, exclude_unset=True))
            elif not block.segments or len({s.id for s in block.segments}) != len(block.segments):
                raise ValueError("Reading segments need unique IDs")
        return self


class Item(Model):
    id: str = Field(min_length=1, max_length=200)
    type: Literal["multiple-choice"]
    data: Question


class ReadingItem(Model):
    id: str = Field(min_length=1, max_length=200)
    type: Literal["reading"]
    data: Reading


class JumbleItem(Model):
    id: str = Field(min_length=1, max_length=200)
    type: Literal["sentence-jumble"]
    data: Jumble


class MatchingItem(Model):
    id: str = Field(min_length=1, max_length=200)
    type: Literal["matching-pairs"]
    data: Matching


LessonItem = Annotated[Item | ReadingItem | JumbleItem | MatchingItem, Field(discriminator="type")]


class Lesson(Model):
    schemaVersion: Literal[1]
    title: str = Field(min_length=1, max_length=200)
    items: list[LessonItem] = Field(min_length=1, max_length=200)

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
        options = item.data.options if item.type == 'multiple-choice' else [option for block in item.data.blocks if block.type == 'Multiple-choice' for option in block.question.options] if item.type == 'reading' else []
        for option in options:
            if getattr(option, 'audio_id', None) and not db.execute(
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
