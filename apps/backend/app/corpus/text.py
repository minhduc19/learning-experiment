"""Lossless UTF-8 framing; offsets are Unicode code points, end-exclusive."""

import codecs
from dataclasses import dataclass

from app.corpus.config import MAX_FRAGMENT_CHARACTERS

TERMINATORS = frozenset("。！？!?\n\r")
CLOSERS = frozenset("。！？!?\n\r”’」』）》】\"' \t\u3000")


def is_han(character):
    code = ord(character)
    return (
        0x3400 <= code <= 0x4DBF
        or 0x4E00 <= code <= 0x9FFF
        or 0xF900 <= code <= 0xFAFF
        or 0x20000 <= code <= 0x323AF
    )


@dataclass
class Fragment:
    text: str
    is_final: bool
    pending_boundary: bool = False


def fragments(
    stream, *, max_characters=MAX_FRAGMENT_CHARACTERS, initial_boundary=False
):
    decoder = codecs.getincrementaldecoder("utf-8")("strict")
    buffer = []
    ended = initial_boundary
    while True:
        chunk = stream.read(65536)
        text = decoder.decode(chunk, final=not chunk)
        for character in text:
            if character == "\x00":
                raise ValueError("NUL characters cannot be stored in PostgreSQL text")
            if ended and character not in CLOSERS:
                yield Fragment("".join(buffer), True)
                buffer = []
                ended = False
            # Defer emission until another character arrives: the last fragment
            # must be final even when the file length is an exact multiple.
            if len(buffer) == max_characters:
                yield Fragment("".join(buffer), False, ended)
                buffer = []
            buffer.append(character)
            if character in TERMINATORS:
                ended = True
        if not chunk:
            break
    if buffer:
        yield Fragment("".join(buffer), True)
