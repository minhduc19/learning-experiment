from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator


ReadingId = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$")]


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


class SegmentDetails(BaseModel):
    translation: str | None = None
    partOfSpeech: str | None = None
    note: str | None = None


class Segment(BaseModel):
    id: str
    text: str
    pinyin: str | None = None
    details: SegmentDetails | None = None


class SentenceBlock(BaseModel):
    id: str
    type: Literal["sentence"] = "sentence"
    translation: str | None = None
    segments: list[Segment]


class QuestionOption(BaseModel):
    id: str
    label: str
    fill: str | None = None
    feedback: str = ""


class MultipleChoiceQuestion(BaseModel):
    id: str
    instruction: str = "Fill in the blank"
    sentence: str
    answer: str
    translation: str | None = None
    options: list[QuestionOption] = Field(min_length=2)

    @model_validator(mode="after")
    def validate_options(self):
        ids = [option.id for option in self.options]
        if len(ids) != len(set(ids)) or self.answer not in ids:
            raise ValueError("Options must have unique IDs and include the correct answer")
        return self


class MultipleChoiceBlock(BaseModel):
    id: str
    type: Literal["Multiple-choice"]
    question: MultipleChoiceQuestion


ReadingBlock = Annotated[SentenceBlock | MultipleChoiceBlock, Field(discriminator="type")]


class ReadingDocument(BaseModel):
    id: ReadingId
    title: str
    titleTranslation: str | None = None
    language: str = "zh-Hans"
    translationLanguage: str | None = None
    blocks: list[ReadingBlock]


class ReadingSummary(BaseModel):
    id: ReadingId
    title: str
    language: str
    sentence_count: int
    url: str
    reader_url: str


class ReadingList(BaseModel):
    items: list[ReadingSummary]
    total: int
    limit: int
    offset: int
    has_more: bool
