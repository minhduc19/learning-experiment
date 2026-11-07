import copy

import pytest
from pydantic import ValidationError
from app.lessons.routes import Lesson
from test_lessons import document

DEMO = 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3'


def test_legacy_lessons_load_and_serialize_with_canonical_prompt_keys():
    old = document()
    original = copy.deepcopy(old)
    result = Lesson.model_validate(old).model_dump(by_alias=True)
    q = result['items'][0]['data']
    assert q['text-prompt'] == old['items'][0]['data']['sentence']
    assert q['text-prompt-available'] is True
    assert q['audio-prompt'] is None
    assert 'sentence' not in q
    assert old == original


def test_audio_only_and_combined_prompts_are_preserved():
    value = document()
    q = value['items'][0]['data']
    q['text-prompt'] = q.pop('sentence')
    q['text-prompt-available'] = False
    q['audio-prompt'] = DEMO
    parsed = Lesson.model_validate(value).model_dump(by_alias=True)['items'][0]['data']
    assert parsed['text-prompt-available'] is False
    assert parsed['audio-prompt'] == DEMO
    q['text-prompt-available'] = True
    assert Lesson.model_validate(value).items[0].data.text_prompt_available


@pytest.mark.parametrize('field,value', [
    ('text-prompt-available', 'false'), ('text-prompt-available', 0),
    ('audio-prompt', 'javascript:alert(1)'), ('audio-prompt', 'file:///tmp/speech.mp3'),
    ('audio-prompt', 'https://user:password@example.com/speech.mp3'),
    ('audio-prompt', 'https://example.com/with space'), ('audio-prompt', 'not-a-url'),
    ('text-prompt', 'no blank'),
])
def test_prompt_validation(field, value):
    data = document()
    q = data['items'][0]['data']
    q['text-prompt'] = q.pop('sentence')
    q[field] = value
    with pytest.raises(ValidationError):
        Lesson.model_validate(data)
