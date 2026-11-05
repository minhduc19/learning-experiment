import json
import os
import re
import tempfile
from uuid import UUID, uuid4

import jieba
from pypinyin import Style, lazy_pinyin

from app.core.config import get_reading_directory
from app.readings.schemas import ReadingCreate, ReadingDocument, Segment, SentenceBlock

# Keep sentence punctuation, closing quotation marks, and internal whitespace.
SENTENCES = re.compile(r'.+?(?:[。！？!?]+[”’」』]*|[\r\n]+|$)\s*', re.DOTALL)
tokenizer = jieba.Tokenizer()


def generate_reading(data: ReadingCreate) -> ReadingDocument:
    blocks = []
    for sentence_index, match in enumerate(SENTENCES.finditer(data.text), start=1):
        segments = []
        for word_index, word in enumerate(tokenizer.cut(match.group()), start=1):
            syllables = lazy_pinyin(word, style=Style.TONE, errors=lambda _: [])
            segments.append(Segment(
                id=f"s{sentence_index}-w{word_index}", text=word,
                pinyin=" ".join(syllables) or None,
            ))
        blocks.append(SentenceBlock(id=f"sentence-{sentence_index}", segments=segments))
    return ReadingDocument(id=uuid4(), title=data.title.strip() or data.text[:30], blocks=blocks)


def save_reading(document: ReadingDocument) -> None:
    directory = get_reading_directory()
    directory.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=directory, suffix=".tmp", delete=False) as file:
            temporary = file.name
            file.write(document.model_dump_json(indent=2))
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary, directory / f"{document.id}.json")
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def read_reading(reading_id: UUID) -> ReadingDocument:
    path = get_reading_directory() / f"{reading_id}.json"
    return ReadingDocument.model_validate(json.loads(path.read_text(encoding="utf-8")))
