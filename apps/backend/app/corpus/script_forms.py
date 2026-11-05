"""OpenCC script variants; the uploaded text is always the source of truth."""

from functools import lru_cache
from importlib.metadata import version
from typing import NamedTuple

from opencc import OpenCC

CONVERSION_VERSION = (
    f"opencc-python-reimplemented-{version('opencc-python-reimplemented')}:s2t+t2s:v1"
)


class ScriptForms(NamedTuple):
    traditional: str
    simplified: str


@lru_cache(maxsize=1)
def _converters():
    return OpenCC("s2t"), OpenCC("t2s")


def convert_forms(original: str) -> ScriptForms:
    traditional, simplified = _converters()
    return ScriptForms(traditional.convert(original), simplified.convert(original))


@lru_cache(maxsize=8192)
def vocabulary_forms(original: str) -> ScriptForms:
    # Vocabulary entries are bounded to 256 source code points. Never cache
    # arbitrarily many full sentence fragments while importing a huge story.
    return convert_forms(original)


def hydrate_forms(row, source, *, vocabulary=False):
    """Older rows remain usable while their persisted forms are backfilled."""
    suffix = "value" if source == "value" else "text"
    traditional, simplified = f"traditional_{suffix}", f"simplified_{suffix}"
    if row.get(traditional) is None or row.get(simplified) is None:
        forms = (
            vocabulary_forms(row[source]) if vocabulary else convert_forms(row[source])
        )
        row[traditional], row[simplified] = forms
    return row
