from datetime import datetime
from typing import Generic, Literal, TypeVar
from uuid import UUID

from pydantic import BaseModel, Field


class UploadCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=255, examples=["story.txt"])
    size: int = Field(gt=0, description="Exact byte size of the UTF-8 file")


class ImportCreate(BaseModel):
    upload_id: UUID
    title: str = Field(min_length=1, max_length=300)


Status = Literal["queued", "processing", "completed", "failed"]
T = TypeVar("T")


class UploadStatus(BaseModel):
    id: UUID
    filename: str
    size: int
    offset_bytes: int
    created_at: datetime


class ImportAccepted(BaseModel):
    id: UUID
    story_id: UUID
    status: Status


class ImportStatus(ImportAccepted):
    error: str | None
    attempts: int
    updated_at: datetime
    title: str
    byte_offset: int
    character_count: int
    fragment_count: int
    completed_sentence_count: int
    segmentation_version: str
    conversion_version: str | None
    checksum: str | None
    total_bytes: int
    progress: float


class Character(BaseModel):
    id: int
    value: str
    traditional_value: str
    simplified_value: str
    is_han: bool
    occurrence_count: int
    distinct_segment_count: int
    segment_occurrence_count: int


class CharacterDetail(Character):
    sentence_count: int


class Segment(BaseModel):
    id: int
    text: str
    traditional_text: str
    simplified_text: str
    is_word: bool
    count_in_segment: int
    occurrence_count: int
    sentence_count: int | None = None


class Match(BaseModel):
    start_offset: int
    end_offset: int


class Sentence(BaseModel):
    story_title: str
    id: int
    story_id: UUID
    position: int
    sentence_position: int
    part_position: int
    is_final: bool
    raw_text: str
    traditional_text: str
    simplified_text: str
    start_offset: int
    end_offset: int
    matches: list[Match]


class Page(BaseModel, Generic[T]):
    items: list[T]
    next_cursor: str | None
