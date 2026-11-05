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


def test_list_readings_empty_and_generated_document_links(client):
    assert client.get('/api/readings').json() == {
        'items': [], 'total': 0, 'limit': 50, 'offset': 0, 'has_more': False,
    }
    document = client.post('/api/readings', json={'text': '我喜欢散步。今天天气很好！', 'title': '公园'}).json()
    response = client.get('/api/readings')
    assert response.status_code == 200
    result = response.json()
    assert result['total'] == 1
    assert result['items'] == [{
        'id': document['id'], 'title': '公园', 'language': 'zh-Hans', 'sentence_count': 2,
        'url': f"/api/readings/{document['id']}", 'reader_url': f"/reading-app?reading={document['id']}",
    }]
    assert client.get(result['items'][0]['url']).json() == document
    assert 'blocks' not in result['items'][0]


def test_list_readings_pagination(client):
    documents = [client.post('/api/readings', json={'text': '我喜欢中文。', 'title': str(i)}).json() for i in range(3)]
    expected_ids = sorted(doc['id'] for doc in documents)
    first = client.get('/api/readings?limit=2').json()
    assert [item['id'] for item in first['items']] == expected_ids[:2]
    assert first['has_more'] is True
    last = client.get('/api/readings?limit=2&offset=2').json()
    assert [item['id'] for item in last['items']] == expected_ids[2:]
    assert last['has_more'] is False
    assert last['total'] == 3
    assert client.get('/api/readings?offset=100').json()['items'] == []


@pytest.mark.parametrize('query', ['limit=0', 'limit=101', 'offset=-1', 'limit=invalid'])
def test_list_readings_rejects_invalid_pagination(client, query):
    assert client.get('/api/readings?' + query).status_code == 422


def test_list_readings_ignores_invalid_and_unrelated_files(client, tmp_path):
    document = client.post('/api/readings', json={'text': '我喜欢中文。'}).json()
    directory = tmp_path / 'readings'
    (directory / 'draft.tmp').write_text('partial')
    (directory / 'unrelated.json').write_text('{}')
    (directory / f'{uuid4()}.json').write_text('corrupted')
    mismatch = dict(document, id=str(uuid4()))
    (directory / f'{uuid4()}.json').write_text(json.dumps(mismatch))
    (directory / f'{uuid4()}.json').symlink_to(directory / f"{document['id']}.json")
    result = client.get('/api/readings').json()
    assert result['total'] == 1
    assert result['items'][0]['id'] == document['id']


def test_list_readings_storage_failure(client, monkeypatch, tmp_path):
    invalid = tmp_path / 'file'
    invalid.write_text('not a directory')
    monkeypatch.setenv('READING_DATA_DIR', str(invalid))
    response = client.get('/api/readings')
    assert response.status_code == 503
    assert response.json() == {'detail': 'Reading storage is unavailable'}
    assert str(tmp_path) not in response.text
