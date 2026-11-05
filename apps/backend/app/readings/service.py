import json
import logging
import os
import re
import tempfile
from uuid import UUID, uuid4

import jieba
from pypinyin import Style, lazy_pinyin

from app.core.config import get_reading_directory
from app.readings.schemas import ReadingCreate, ReadingDocument, ReadingList, ReadingSummary, Segment, SentenceBlock

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


def list_readings(limit: int = 50, offset: int = 0) -> ReadingList:
    directory = get_reading_directory()
    try:
        paths = sorted(directory.iterdir(), key=lambda path: path.name)
    except FileNotFoundError:
        paths = []
    summaries = []
    for path in paths:
        if path.suffix != ".json" or path.is_symlink() or not path.is_file():
            continue
        try:
            reading_id = UUID(path.stem)
        except ValueError:
            continue
        if str(reading_id) != path.stem:
            continue
        try:
            document = read_reading(reading_id)
            if document.id != reading_id:
                raise ValueError("Document ID does not match its filename")
        except FileNotFoundError:
            # Another process may remove a document during the listing.
            continue
        except ValueError:
            logging.getLogger(__name__).warning("Skipping invalid reading file %s", path.name)
            continue
        summaries.append(ReadingSummary(
            id=document.id, title=document.title, language=document.language,
            sentence_count=len(document.blocks), url=f"/api/readings/{document.id}",
            reader_url=f"/reading-app?reading={document.id}",
        ))
    total = len(summaries)
    return ReadingList(items=summaries[offset:offset + limit], total=total,
                       limit=limit, offset=offset, has_more=offset + limit < total)
