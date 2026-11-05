from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ReadingCreate(BaseModel):
    text: str = Field(min_length=1, max_length=100_000)
    title: str = Field(default="", max_length=200)

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Text must not be blank")
        if not any("\u3400" <= char <= "\u9fff" or "\U00020000" <= char <= "\U000323af" for char in value):
            raise ValueError("Text must contain Chinese characters")
        return value


class Segment(BaseModel):
    id: str
    text: str
    pinyin: str | None


class SentenceBlock(BaseModel):
    id: str
    type: Literal["sentence"] = "sentence"
    segments: list[Segment]


class ReadingDocument(BaseModel):
    id: UUID
    title: str
    language: Literal["zh-Hans"] = "zh-Hans"
    blocks: list[SentenceBlock]


class ReadingSummary(BaseModel):
    id: UUID
    title: str
    language: Literal["zh-Hans"]
    sentence_count: int
    url: str
    reader_url: str


class ReadingList(BaseModel):
    items: list[ReadingSummary]
    total: int
    limit: int
    offset: int
    has_more: bool
