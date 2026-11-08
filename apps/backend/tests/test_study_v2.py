from app.main import app
from fastapi.testclient import TestClient
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, imported, pytestmark  # noqa: F401
from test_study import mark
from app.corpus.database import connect

client = corpus_client_fixture


def test_segments_follow_sentence_rank_and_order_without_popularity(client):
    imported(client, '我我我看学校出来。你看苹果。苹果。苹果。')
    mark(client, '我', learned=True)
    mark(client, '你', learned=True)
    # Exclude already Learned segments; Learning alone must remain eligible.
    with connect() as db:
        segments = {row['text']: row['id'] for row in db.execute('SELECT id,text FROM corpus.segments WHERE is_word').fetchall()}
    for text in ('我', '看', '你'):
        response = client.patch(f"/api/corpus/segments/{segments[text]}/progress", json={'learned': True})
        assert response.status_code == 200
    client.patch(f"/api/corpus/segments/{segments['学校']}/progress", json={'learning': True})
    response = client.post('/api/corpus/study-selection-v2?learned_count=1&segment_count=3')
    assert response.status_code == 201, response.text
    saved = response.json()
    rows = saved['data']['segments']
    assert [row['text'] for row in rows] == ['学校', '出来', '苹果']
    assert [row['learned_sentence_count'] for row in rows] == [3, 3, 1]
    assert len({row['id'] for row in rows}) == 3
    assert saved['data']['learned'][0]['value'] in ('我', '你')
    assert saved['data']['available']['segments'] == 3
    assert saved['data']['requested'] == {'learned': 1, 'new': 0, 'segments': 3}
    for row in rows:
        assert row['text'] in row['sentence']['raw_text']
        assert row['sentence']['id']
        assert row['traditional_text'] and row['simplified_text']
    assert client.get('/api/corpus/study-history-v2').json()['items'][0]['id'] == saved['id']
    assert client.get('/api/corpus/study-history-v2/' + saved['id']).json() == saved
    assert client.get('/api/corpus/study-history').json()['items'] == []
    # Mark changes do not alter historical snapshots or make suggestions mark items.
    client.patch(f"/api/corpus/segments/{segments['学校']}/progress", json={'learned': True})
    assert client.get('/api/corpus/study-history-v2/' + saved['id']).json() == saved
    fresh = client.post('/api/corpus/study-selection-v2?learned_count=0&segment_count=50').json()['data']
    assert [row['text'] for row in fresh['segments']] == ['出来', '苹果']
    assert fresh['learned'] == []


def test_v2_validation_empty_corpus_and_owner_isolation(client):
    for query in ('learned_count=0&segment_count=0', 'segment_count=51', 'learned_count=-1', 'segment_count=abc'):
        assert client.post('/api/corpus/study-selection-v2?' + query).status_code == 422
    empty = client.post('/api/corpus/study-selection-v2?learned_count=0&segment_count=5').json()
    assert empty['data']['segments'] == []
    imported(client, '学校。')
    saved = client.post('/api/corpus/study-selection-v2?learned_count=0&segment_count=5').json()
    assert [row['text'] for row in saved['data']['segments']] == ['学校']
    with TestClient(app, base_url='https://testserver') as other:
        account(other)
        assert other.get('/api/corpus/study-history-v2').json()['items'] == []
        assert other.get('/api/corpus/study-history-v2/' + saved['id']).status_code == 404
        assert other.post('/api/corpus/study-selection-v2?learned_count=0&segment_count=5').json()['data']['segments'] == []
    with TestClient(app) as anonymous:
        assert anonymous.post('/api/corpus/study-selection-v2').status_code == 401
