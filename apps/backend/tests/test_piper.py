import hashlib
import io
import json
import subprocess
import wave
from pathlib import Path

import pytest
from fastapi import HTTPException
from app.ai import audio, piper_service, piper_models
from app.corpus.database import connect
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, pytestmark  # noqa: F401

client = corpus_client_fixture
ROOT = '/api/ai/option-audio'


def wav(path):
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(22050)
        output.writeframes(b'\0\0' * 2205)


def test_default_piper_generates_wav_without_external_key_and_caches_separately(client, monkeypatch):
    calls = []
    monkeypatch.delenv('ELEVEN', raising=False)
    monkeypatch.setattr(piper_service, 'check_ready', lambda: None)
    def synthesize(text, path):
        calls.append(text)
        wav(path)
        return (None, None, None)
    monkeypatch.setattr(piper_service, 'synthesize', synthesize)
    response = client.post(ROOT, json={'text':'你好'})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['status'] == 'ready'
    stored = client.get(ROOT + '/' + result['audio_id'])
    assert stored.headers['content-type'] == 'audio/wav'
    assert stored.content[:4] == b'RIFF'
    assert audio.audio_path(result['audio_id'], 'wav').is_file()
    assert client.post(ROOT, json={'text':'你好'}).json()['audio_id'] == result['audio_id']
    assert calls == ['你好']
    with connect() as db:
        row = db.execute('SELECT * FROM corpus.option_audio WHERE id=%s', (result['audio_id'],)).fetchone()
    assert row['provider'] == 'piper'
    assert row['voice_id'] == piper_models.VOICE
    assert row['file_extension'] == 'wav'
    monkeypatch.setenv('ELEVEN', 'test')
    def eleven(text, path, key, voice_id):
        path.write_bytes(b'ID3-test')
        return (None, None, None)
    monkeypatch.setattr(audio, 'synthesize', eleven)
    other = client.post(ROOT, json={'text':'你好','provider':'elevenlabs'}).json()
    assert other['audio_id'] != result['audio_id']
    assert client.get(ROOT + '/' + other['audio_id']).headers['content-type'] == 'audio/mpeg'


def test_piper_limit_missing_model_retry_and_single_generation_lock(client, monkeypatch, tmp_path):
    monkeypatch.setenv('PIPER_MODEL_DIR', str(tmp_path / 'missing'))
    assert client.post(ROOT, json={'text':'你好'}).status_code == 503
    assert client.post(ROOT, json={'text':'你'*201}).status_code == 422
    assert client.post(ROOT, json={'text':'你好','provider':'unknown'}).status_code == 422
    with piper_service.generation_slot():
        assert client.post(ROOT, json={'text':'你好'}).status_code == 429
    monkeypatch.setattr(piper_service, 'check_ready', lambda: None)
    calls = []
    def broken(text, path):
        calls.append(text)
        raise subprocess.TimeoutExpired('piper', 60)
    monkeypatch.setattr(piper_service, 'synthesize', broken)
    assert client.post(ROOT, json={'text':'你好'}).json()['can_retry']
    assert client.post(ROOT, json={'text':'你好'}).json()['attempts'] == 1
    second = client.post(ROOT, json={'text':'你好','retry':True}).json()
    assert not second['can_retry'] and second['attempts'] == 2
    client.post(ROOT, json={'text':'你好','retry':True})
    assert calls == ['你好','你好']


def test_piper_subprocess_is_bounded_single_threaded_and_uses_stdin(monkeypatch, tmp_path):
    monkeypatch.setattr(piper_service, 'check_ready', lambda: None)
    seen = []
    def run(command, **kwargs):
        seen.append((command, kwargs))
        wav(Path(command[-1]))
    monkeypatch.setattr(piper_service.subprocess, 'run', run)
    target = tmp_path / 'test.wav'
    assert piper_service.synthesize('你好', target) == (None, None, None)
    command, options = seen[0]
    assert command[1:3] == ['-m','app.ai.piper_worker']
    assert options['input'] == '你好' and '你好' not in command
    assert options['timeout'] == 60 and options['check']
    assert options['env']['OMP_NUM_THREADS'] == '1'
    assert options['env']['OPENBLAS_NUM_THREADS'] == '1'


def test_model_setup_verifies_downloads_and_reuses_verified_files(monkeypatch, tmp_path):
    payload = b'model-test'
    config = b'{}'
    files = {piper_models.VOICE + '.onnx': payload, piper_models.VOICE + '.onnx.json': config, 'MODEL_CARD': b'license'}
    monkeypatch.setattr(piper_models, 'FILES', {name:(len(data), hashlib.md5(data).hexdigest()) for name,data in files.items()})
    calls = []
    def fetch(url, timeout):
        calls.append(url)
        return io.BytesIO(files[url.rsplit('/',1)[1]])
    monkeypatch.setattr(piper_models, 'urlopen', fetch)
    piper_models.download(tmp_path)
    piper_models.download(tmp_path)
    assert len(calls) == 3
    (tmp_path / (piper_models.VOICE + '.onnx')).write_bytes(b'corrupt')
    piper_models.download(tmp_path)
    assert len(calls) == 4
    assert not list(tmp_path.glob('*.part'))
