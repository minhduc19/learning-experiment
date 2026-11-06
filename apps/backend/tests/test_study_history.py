from app.corpus import history
from app.main import app
from fastapi.testclient import TestClient
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, pytestmark  # noqa: F401

client = corpus_client_fixture


def test_saved_snapshot_is_private_and_retrieval_does_not_search(client, monkeypatch):
    calls = []

    def generate(learned, new):
        calls.append(1)
        return {
            "learned": [],
            "new": [],
            "requested": {"learned": learned, "new": new},
            "available": {"learned": 0, "new": 0},
        }

    monkeypatch.setattr(history, "select_study", generate)
    saved = client.post("/api/corpus/study-history?learned_count=2&new_count=3")
    assert saved.status_code == 201
    data = saved.json()
    assert (
        client.get("/api/corpus/study-history").json()["items"][0]["id"] == data["id"]
    )
    assert (
        client.get("/api/corpus/study-history/" + data["id"]).json()["data"]
        == data["data"]
    )
    assert len(calls) == 1
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        assert bob.get("/api/corpus/study-history").json()["items"] == []
        assert bob.get("/api/corpus/study-history/" + data["id"]).status_code == 404
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/corpus/study-history").status_code == 401


def test_real_selection_json_round_trips(client):
    from test_corpus import imported

    imported(client, "学校。")
    response = client.post("/api/corpus/study-history?learned_count=0&new_count=1")
    assert response.status_code == 201, response.text
    saved = response.json()
    assert len(saved["data"]["new"]) == 1
    assert (
        client.get("/api/corpus/study-history/" + saved["id"]).json()["data"]
        == saved["data"]
    )
