import pytest
from app.corpus.script_forms import convert_forms, hydrate_forms, vocabulary_forms


@pytest.mark.parametrize(
    ("original", "traditional", "simplified"),
    [
        (
            "學校的學生正在學習中文。",
            "學校的學生正在學習中文。",
            "学校的学生正在学习中文。",
        ),
        (
            "学校的学生正在学习中文。",
            "學校的學生正在學習中文。",
            "学校的学生正在学习中文。",
        ),
        ("頭髮和头发", "頭髮和頭髮", "头发和头发"),
        ("發髮发", "發髮發", "发发发"),
        (
            "\ufeff  國體\r\n😀𠀀 123 abc\t",
            "\ufeff  國體\r\n😀𠀀 123 abc\t",
            "\ufeff  国体\r\n😀𠀀 123 abc\t",
        ),
    ],
)
def test_opencc_forms_preserve_original_and_non_chinese(
    original, traditional, simplified
):
    forms = convert_forms(original)
    assert forms.traditional == traditional
    assert forms.simplified == simplified


def test_sentence_conversion_uses_phrase_context_instead_of_concatenating_characters():
    text = "乾坤"
    assert convert_forms(text).simplified == "乾坤"
    assert "".join(vocabulary_forms(c).simplified for c in text) == "干坤"


def test_long_fragments_are_supported_without_unbounded_sentence_caching():
    forms = convert_forms("學" * 4096)
    assert forms.simplified == "学" * 4096
    assert forms.traditional == "學" * 4096
    assert vocabulary_forms.cache_info().maxsize == 8192


def test_legacy_row_hydration_only_supplies_missing_forms():
    row = {"raw_text": "學習。", "traditional_text": None, "simplified_text": None}
    assert hydrate_forms(row, "raw_text")["simplified_text"] == "学习。"
    assert row["raw_text"] == "學習。"
    present = {"value": "發", "traditional_value": "發", "simplified_value": "发"}
    assert hydrate_forms(present, "value", vocabulary=True) == present
