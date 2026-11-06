from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy

from app.main import app
from fastapi.testclient import TestClient
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, imported, pytestmark  # noqa: F401
from test_lessons import document

client = corpus_client_fixture


def prepare(client):
    imported(client, "学校很好。")
    lesson = document()
    for item in lesson["items"]:
        item["data"]["target-character"] = "学"
        item["data"]["target-segment"] = "学校"
    response = client.post("/api/lessons", json=lesson)
    assert response.status_code == 201, response.text
    return response.json()


def test_completion_awards_correct_targets_once_and_keeps_marks(client):
    lesson = prepare(client)
    char = client.get("/api/corpus/characters?character=学").json()["items"][0]
    segment = client.get(f"/api/corpus/characters/{char['id']}/segments").json()[
        "items"
    ][0]
    client.patch(
        f"/api/corpus/characters/{char['id']}/progress",
        json={"learned": True, "learning": True},
    )
    client.patch(
        f"/api/corpus/segments/{segment['id']}/progress", json={"learning": True}
    )
    attempt = client.post(f"/api/lessons/{lesson['id']}/attempts").json()
    payload = {
        "answers": [
            {"item_id": item["id"], "option_id": "learn"}
            for item in attempt["document"]["items"]
        ]
    }

    def complete(_):
        response = client.post(
            f"/api/lessons/attempts/{attempt['id']}/complete", json=payload
        )
        assert response.status_code == 200, response.text
        return response.json()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(complete, range(2)))
    assert results[0] == results[1]
    assert results[0]["characters"][0]["practice"] == 2
    assert results[0]["characters"][0]["earned"] == 2
    assert results[0]["characters"][0]["learned"] is True
    assert results[0]["segments"][0]["practice"] == 2
    assert results[0]["segments"][0]["learning"] is True
    client.patch(
        f"/api/corpus/characters/{char['id']}/progress", json={"learning": False}
    )
    assert client.get(f"/api/corpus/characters/{char['id']}").json()["practice"] == 2
    assert client.get(f"/api/corpus/segments/{segment['id']}").json()["practice"] == 2


def test_attempt_snapshot_grading_incorrect_and_private_access(client):
    lesson = prepare(client)
    attempt = client.post(f"/api/lessons/{lesson['id']}/attempts").json()
    updated = deepcopy(lesson["document"])
    for item in updated["items"]:
        item["data"]["answer"] = "walk"
    client.put(
        "/api/lessons/" + lesson["id"], json={"revision": 1, "document": updated}
    )
    endpoint = f"/api/lessons/attempts/{attempt['id']}/complete"
    assert client.post(endpoint, json={"answers": []}).status_code == 422
    answers = [
        {"item_id": item["id"], "option_id": "walk"}
        for item in attempt["document"]["items"]
    ]
    result = client.post(endpoint, json={"answers": answers}).json()
    assert result["correct"] == 0 and result["incorrect"] == 2
    assert (
        result["characters"][0]["practice"] == 0
        and result["segments"][0]["practice"] == 0
    )
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        assert bob.post(f"/api/lessons/{lesson['id']}/attempts").status_code == 404
        assert bob.post(endpoint, json={"answers": answers}).status_code == 404
    with TestClient(app) as anonymous:
        assert anonymous.post(endpoint, json={"answers": answers}).status_code == 401


def test_unresolved_targets_and_legacy_questions(client):
    lesson = document()
    lesson["items"][0]["data"].update(
        {"target-character": "心", "target-segment": "道心"}
    )
    saved = client.post("/api/lessons", json=lesson).json()
    attempt = client.post(f"/api/lessons/{saved['id']}/attempts").json()
    result = client.post(
        f"/api/lessons/attempts/{attempt['id']}/complete",
        json={
            "answers": [
                {"item_id": item["id"], "option_id": "learn"}
                for item in lesson["items"]
            ]
        },
    ).json()
    assert result["correct"] == 2
    assert len(result["unresolved"]) == 2
    assert result["characters"] == result["segments"] == []
