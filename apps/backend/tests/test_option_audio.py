import json
from uuid import uuid4

import httpx
from elevenlabs.client import ElevenLabs as RealClient
from fastapi.testclient import TestClient
from app.ai import audio
from app.corpus.database import connect
from app.main import app
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, pytestmark  # noqa: F401
from test_lessons import document

client = corpus_client_fixture
ROOT = '/api/ai/option-audio'


def provider(monkeypatch, handler):
    monkeypatch.setenv('ELEVEN', 'test-eleven-secret')
    monkeypatch.setattr(audio, 'ElevenLabs', lambda **kwargs: RealClient(
        api_key=kwargs['api_key'], httpx_client=httpx.Client(transport=httpx.MockTransport(handler))))


def test_real_sdk_stores_bytes_headers_and_reuses_matching_text(client, monkeypatch):
    requests = []
    def respond(request):
        requests.append(request)
        assert str(request.url).startswith(f'https://api.elevenlabs.io/v1/text-to-speech/{audio.VOICE}')
        assert request.headers['xi-api-key'] == 'test-eleven-secret'
        assert json.loads(request.content)['text'] == '学习'
        assert json.loads(request.content)['model_id'] == 'eleven_multilingual_v2'
        return httpx.Response(200, content=b'ID3-recording', headers={
            'content-type': 'audio/mpeg', 'character-cost': '2', 'request-id': 'provider-id', 'x-trace-id': 'trace'})
    provider(monkeypatch, respond)
    generated = client.post(ROOT, json={'text': '学习'})
    assert generated.status_code == 200, generated.text
    data = generated.json()
    assert data['status'] == 'ready' and data['attempts'] == 1
    assert audio.audio_path(data['audio_id']).read_bytes() == b'ID3-recording'
    response = client.get(ROOT + '/' + data['audio_id'])
    assert response.content == b'ID3-recording'
    assert response.headers['content-type'] == 'audio/mpeg'
    assert response.headers['cache-control'] == 'private, no-store'
    assert client.post(ROOT, json={'text': '学习'}).json() == data
    assert client.post(ROOT, json={'text': '学习', 'retry': True}).json() == data
    assert len(requests) == 1
    with connect() as db:
        row = db.execute('SELECT * FROM corpus.option_audio WHERE id=%s', (data['audio_id'],)).fetchone()
    assert (row['character_cost'], row['request_id'], row['trace_id']) == ('2', 'provider-id', 'trace')
    lesson = document()
    option = lesson['items'][0]['data']['options'][0]
    option.update(audio_id=data['audio_id'], audio_text=option['label'])
    saved = client.post('/api/lessons', json=lesson)
    assert saved.status_code == 201, saved.text
    assert saved.json()['document']['items'][0]['data']['options'][0]['audio_id'] == data['audio_id']
    # An edited label drops stale audio instead of silently playing the old word.
    option['label'] = '不同'
    stale = client.post('/api/lessons', json=lesson)
    assert stale.status_code == 201, stale.text
    assert stale.json()['document']['items'][0]['data']['options'][0]['audio_id'] is None
    with TestClient(app, base_url='https://testserver') as bob:
        account(bob)
        assert bob.get(ROOT + '/' + data['audio_id']).status_code == 404
        option.update(label='学习', audio_text='学习')
        assert bob.post('/api/lessons', json=lesson).status_code == 422
    assert client.get(ROOT + '/' + str(uuid4())).status_code == 404
    with TestClient(app) as anonymous:
        assert anonymous.get(ROOT + '/' + data['audio_id']).status_code == 401
        assert anonymous.post(ROOT, json={'text': '学习'}).status_code == 401


def test_failed_options_get_only_one_explicit_retry_and_never_sdk_retries(client, monkeypatch):
    calls = []
    provider(monkeypatch, lambda request: (calls.append(1) or httpx.Response(500, json={'secret': 'test-eleven-secret'})))
    initial = client.post(ROOT, json={'text': 'bad'}).json()
    assert initial['status'] == 'failed' and initial['can_retry']
    assert len(calls) == 1
    for _ in range(3):
        assert client.post(ROOT, json={'text': 'bad'}).json()['attempts'] == 1
    assert len(calls) == 1
    retry = client.post(ROOT, json={'text': 'bad', 'retry': True})
    assert retry.json()['status'] == 'failed' and retry.json()['attempts'] == 2
    assert not retry.json()['can_retry']
    assert 'test-eleven-secret' not in retry.text
    assert len(calls) == 2
    for _ in range(3):
        assert client.post(ROOT, json={'text': 'bad', 'retry': True}).json()['attempts'] == 2
    assert len(calls) == 2
    assert list(audio.audio_path(uuid4()).parent.glob('*.tmp')) == []


def test_successful_retry_keeps_one_record_and_validates_inputs(client, monkeypatch):
    attempts = []
    def respond(_):
        attempts.append(1)
        if len(attempts) == 1: return httpx.Response(429, json={'detail': 'quota'})
        return httpx.Response(200, content=b'ID3-ok')
    provider(monkeypatch, respond)
    client.post(ROOT, json={'text': 'word'})
    result = client.post(ROOT, json={'text': 'word', 'retry': True}).json()
    assert result['status'] == 'ready' and result['attempts'] == 2
    assert len(attempts) == 2
    for payload in [{'text': ''}, {'text': ' '}, {'text': 'x'*2001}, {'text': 'word', 'retry': 'yes'}, {'text': 'word', 'voice_id': 'other'}]:
        assert client.post(ROOT, json=payload).status_code == 422
    assert client.post(ROOT, json={'text': 'not-generated', 'retry': True}).status_code == 422
    monkeypatch.delenv('ELEVEN')
    assert client.post(ROOT, json={'text': 'new'}).status_code == 503
    # Existing successful recordings still work when the provider is unconfigured.
    assert client.post(ROOT, json={'text': 'word'}).json()['audio_id'] == result['audio_id']


def test_empty_or_oversized_audio_never_becomes_playable(client, monkeypatch):
    provider(monkeypatch, lambda _: httpx.Response(200, content=b''))
    assert client.post(ROOT, json={'text': 'empty'}).json()['status'] == 'failed'
    monkeypatch.setattr(audio, 'MAX_BYTES', 4)
    provider(monkeypatch, lambda _: httpx.Response(200, content=b'ID3-too-large'))
    assert client.post(ROOT, json={'text': 'large'}).json()['status'] == 'failed'


def test_pending_generation_does_not_duplicate_paid_calls(client, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Event
    entered, release = Event(), Event()
    def synthesize(text, path, key):
        entered.set()
        assert release.wait(5)
        path.write_bytes(b'ID3-ready')
        return (None, None, None)
    monkeypatch.setenv('ELEVEN', 'test')
    monkeypatch.setattr(audio, 'synthesize', synthesize)
    with ThreadPoolExecutor() as pool:
        first = pool.submit(lambda: client.post(ROOT, json={'text': 'concurrent'}))
        assert entered.wait(5)
        try:
            assert client.post(ROOT, json={'text': 'concurrent'}).status_code == 409
            assert client.post(ROOT, json={'text': 'concurrent', 'retry': True}).status_code == 409
        finally: release.set()
        assert first.result().json()['attempts'] == 1
