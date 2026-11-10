"""Multi-story filters must constrain counts, rankings, and every example."""
from uuid import uuid4

from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, imported, pytestmark  # noqa: F401
from test_study import mark

client = corpus_client_fixture


def test_story_union_counts_and_cursor_scope(client):
    one = imported(client, '我学中文。我学。')['story_id']
    two = imported(client, '我看书。')['story_id']
    imported(client, '他吃饭。')
    params = [('story_ids', one), ('story_ids', two)]
    rows = client.get('/api/corpus/characters', params=params).json()['items']
    assert {r['value'] for r in rows} == set('我学中文看书')
    assert next(r for r in rows if r['value'] == '我')['occurrence_count'] == 3
    first = client.get('/api/corpus/characters', params=params + [('limit', 1)]).json()
    assert first['next_cursor']
    assert client.get('/api/corpus/characters', params=[('story_ids', one), ('cursor', first['next_cursor'])]).status_code == 422
    mark(client, '我', learned=True)
    sentences = client.get('/api/corpus/practice-sentences', params=params).json()['items']
    assert {s['story_id'] for s in sentences} == {one, two}
    first = client.get('/api/corpus/practice-sentences', params=params + [('limit', 1)]).json()
    assert client.get('/api/corpus/practice-sentences', params=[('story_ids', one), ('cursor', first['next_cursor'])]).status_code == 422


def test_generators_keep_all_examples_in_selected_stories(client):
    one = imported(client, '我学中文。')['story_id']
    two = imported(client, '我看书。')['story_id']
    imported(client, '我吃饭。他走路。')
    mark(client, '我', learned=True)
    for path, count in [('/api/corpus/study-selection', 'new_count'), ('/api/corpus/study-history', 'new_count'), ('/api/corpus/study-selection-v2', 'segment_count')]:
        response = client.post(path, params=[('story_ids', one), ('story_ids', two), ('learned_count', 50), (count, 50)])
        assert response.status_code == 201, response.text
        data = response.json()['data']
        for char in data['learned']:
            assert char['value'] == '我'
            assert char['occurrence_count'] == 2
            for segment in char['popular_segments']:
                assert segment['sentence']['story_id'] in {one, two}
        for row in data.get('segments', data['new']):
            assert row['sentence']['story_id'] in {one, two}
        empty = client.post(path, params={'story_ids': str(uuid4()), 'learned_count': 1, count: 1}).json()['data']
        assert empty['learned'] == []
        assert empty.get('segments', empty['new']) == []
    assert client.get('/api/corpus/characters?story_ids=invalid').status_code == 422


def test_story_filters_do_not_grant_access_to_other_users(client):
    from app.main import app
    from fastapi.testclient import TestClient
    from test_auth import account

    story = imported(client, '我学中文。')['story_id']
    mark(client, '我', learned=True)
    with TestClient(app, base_url='https://testserver') as other:
        account(other)
        for path in ['/api/corpus/characters', '/api/corpus/practice-sentences']:
            response = other.get(path, params={'story_ids': story})
            assert response.status_code == 200, response.text
            assert response.json()['items'] == []
        for path in ['/api/corpus/study-selection', '/api/corpus/study-selection-v2']:
            response = other.post(path, params={'story_ids': story})
            assert response.status_code == 201, response.text
            data = response.json()['data']
            assert data['learned'] == data['new'] == []
            assert data.get('segments', []) == []
