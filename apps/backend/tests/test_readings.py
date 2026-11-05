import json
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("READING_DATA_DIR", str(tmp_path / "readings"))
    return TestClient(app)


def test_generate_save_and_read_json(client, tmp_path):
    text = '我喜欢在公园散步。\n今天天气很好！我们聊天。'
    response = client.post('/api/readings', json={'text': text, 'title': '公园'})
    assert response.status_code == 201
    document = response.json()
    UUID(document['id'])
    assert response.headers['Location'] == '/api/readings/' + document['id']
    assert document['title'] == '公园'
    assert len(document['blocks']) == 3
    segments = [segment for block in document['blocks'] for segment in block['segments']]
    assert ''.join(segment['text'] for segment in segments) == text
    assert len({segment['id'] for segment in segments}) == len(segments)
    assert next(segment['pinyin'] for segment in segments if segment['text'] == '散步') == 'sàn bù'
    assert all(segment['pinyin'] is None for segment in segments if segment['text'] in ['。', '！', '\n'])
    assert 'translation' not in document['blocks'][0]
    path = tmp_path / 'readings' / f"{document['id']}.json"
    assert json.loads(path.read_text()) == document
    # A new client retrieves the persisted file, independent of the creation request.
    assert TestClient(app).get(response.headers['Location']).json() == document
    assert not list(path.parent.glob('*.tmp'))


@pytest.mark.parametrize('text', ['', '   ', 'English only.', '我' * 100001])
def test_invalid_text_is_rejected(client, text):
    assert client.post('/api/readings', json={'text': text}).status_code == 422


def test_reading_ids_cannot_escape_storage(client):
    assert client.get('/api/readings/' + str(uuid4())).status_code == 404
    assert client.get('/api/readings/not-a-uuid').status_code == 422
    assert client.get('/api/readings/..%2F..%2F.env').status_code in [404, 422]


def test_multiple_readings_do_not_overwrite_each_other(client):
    one = client.post('/api/readings', json={'text': '我喜欢散步。'}).json()
    two = client.post('/api/readings', json={'text': '今天天气很好。'}).json()
    assert one['id'] != two['id']
    assert client.get('/api/readings/' + one['id']).json() == one
    assert client.get('/api/readings/' + two['id']).json() == two


def test_long_passage_and_no_terminal_punctuation(client):
    text = '我喜欢散步。' * 1000 + '今天天气很好'
    response = client.post('/api/readings', json={'text': text})
    assert response.status_code == 201
    blocks = response.json()['blocks']
    assert len(blocks) == 1001
    assert ''.join(s['text'] for b in blocks for s in b['segments']) == text


def test_storage_errors_and_invalid_saved_file(client, monkeypatch, tmp_path):
    invalid_storage = tmp_path / 'not-a-directory'
    invalid_storage.write_text('file')
    monkeypatch.setenv('READING_DATA_DIR', str(invalid_storage))
    response = client.post('/api/readings', json={'text': '我喜欢散步。'})
    assert response.status_code == 503
    assert str(tmp_path) not in response.text
    directory = tmp_path / 'valid'
    directory.mkdir()
    monkeypatch.setenv('READING_DATA_DIR', str(directory))
    reading_id = uuid4()
    (directory / f'{reading_id}.json').write_text('invalid json')
    assert client.get(f'/api/readings/{reading_id}').status_code == 500
