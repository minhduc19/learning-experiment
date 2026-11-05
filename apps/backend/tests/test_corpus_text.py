from io import BytesIO

import pytest
from app.corpus.text import fragments, is_han


@pytest.mark.parametrize(
    "text",
    [
        "  我学习中文。\r\n谢谢你！ 谢谢。\n",
        "\ufeff你好。\r\n\r\n第二句？“是的！”  \n",
        "a😀𠀀中\t\r\n",
        "没有标点" * 100,
        "。" + " " * 50 + "你好",
        "字" * 8,
        "",
    ],
)
def test_lossless_and_resumable_fragments(text):
    pieces = list(fragments(BytesIO(text.encode()), max_characters=8))
    assert "".join(p.text for p in pieces) == text
    assert all(len(p.text) <= 8 for p in pieces)
    offset = 0
    for index, piece in enumerate(pieces):
        offset += len(piece.text.encode())
        boundary = False if piece.is_final else piece.pending_boundary
        resumed = list(
            fragments(
                BytesIO(text.encode()[offset:]),
                max_characters=8,
                initial_boundary=boundary,
            )
        )
        assert "".join(p.text for p in resumed) == "".join(
            p.text for p in pieces[index + 1 :]
        )


def test_multibyte_decoding_at_byte_boundaries():
    class TinyStream(BytesIO):
        def read(self, size=-1):
            return super().read(1)

    text = "你好😀。\r\n再见"
    assert "".join(p.text for p in fragments(TinyStream(text.encode()))) == text


@pytest.mark.parametrize("data", [b"\xff", b"\xe4\xb8", b"hello\x00world"])
def test_invalid_input_fails(data):
    with pytest.raises((UnicodeError, ValueError)):
        list(fragments(BytesIO(data)))


def test_han_detection():
    assert all(is_han(c) for c in "学𠀀")
    assert not any(is_han(c) for c in "a😀。 ")
