from app.corpus import history
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, pytestmark  # noqa: F401

client = corpus_client_fixture


def test_vocabulary_endpoint_generates_and_saves_once(client, monkeypatch):
    calls = []
    data = {
        "learned": [],
        "new": [],
        "requested": {"learned": 0, "new": 1},
        "available": {"learned": 0, "new": 0},
    }

    def select(learned, new, story_ids=None):
        assert story_ids is None
        calls.append((learned, new))
        return data

    monkeypatch.setattr(history, "select_study", select)
    response = client.post("/api/corpus/study-selection?learned_count=0&new_count=1")
    assert response.status_code == 201, response.text
    saved = response.json()
    assert saved["data"] == data
    assert calls == [(0, 1)]
    listing = client.get("/api/corpus/study-history").json()
    assert [entry["id"] for entry in listing["items"]] == [saved["id"]]
    assert client.get("/api/corpus/study-history/" + saved["id"]).json()["data"] == data
    assert (
        client.get(
            "/api/corpus/study-selection?learned_count=0&new_count=1"
        ).status_code
        == 200
    )
    assert len(client.get("/api/corpus/study-history").json()["items"]) == 1
