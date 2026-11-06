from app.main import app
from fastapi.testclient import TestClient
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, pytestmark  # noqa: F401

client = corpus_client_fixture


def document():
    def item(identifier):
        return {
            "id": identifier,
            "type": "multiple-choice",
            "data": {
                "id": "same-question",
                "instruction": "Fill in the blank",
                "sentence": "我[[blank]]中文。",
                "answer": "learn",
                "translation": "I study Chinese.",
                "options": [
                    {"id": "learn", "label": "学习", "feedback": "Correct"},
                    {"id": "walk", "label": "走路", "feedback": "Try again"},
                ],
            },
        }

    return {
        "schemaVersion": 1,
        "title": "Test lesson",
        "items": [item("second"), item("first")],
    }


def test_lesson_crud_order_revision_and_private_access(client):
    response = client.post("/api/lessons", json=document())
    assert response.status_code == 201, response.text
    saved = response.json()
    identifier = saved["id"]
    assert [item["id"] for item in saved["document"]["items"]] == ["second", "first"]
    assert client.get("/api/lessons").json()["items"][0]["id"] == identifier
    assert (
        client.get("/api/lessons/" + identifier).json()["document"] == saved["document"]
    )
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        assert bob.get("/api/lessons").json()["items"] == []
        assert bob.get("/api/lessons/" + identifier).status_code == 404
        assert (
            bob.put(
                "/api/lessons/" + identifier,
                json={"revision": 1, "document": document()},
            ).status_code
            == 404
        )
        assert (
            bob.delete("/api/lessons/" + identifier + "?revision=1").status_code == 404
        )
    edited = document()
    edited["title"] = "Edited"
    edited["items"].reverse()
    response = client.put(
        "/api/lessons/" + identifier, json={"revision": 1, "document": edited}
    )
    assert response.status_code == 200, response.text
    assert response.json()["revision"] == 2
    assert response.json()["document"]["items"][0]["id"] == "first"
    assert (
        client.put(
            "/api/lessons/" + identifier, json={"revision": 1, "document": document()}
        ).status_code
        == 409
    )
    assert (
        client.delete("/api/lessons/" + identifier + "?revision=1").status_code == 409
    )
    assert (
        client.delete("/api/lessons/" + identifier + "?revision=2").status_code == 204
    )
    assert client.get("/api/lessons/" + identifier).status_code == 404
    assert client.get("/api/lessons").json()["items"] == []
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/lessons").status_code == 401
        assert anonymous.post("/api/lessons", json=document()).status_code == 401


def test_lesson_validation_and_size_limit(client):
    invalid = []
    value = document()
    value["items"][0]["type"] = "future-type"
    invalid.append(value)
    value = document()
    value["items"][1]["id"] = value["items"][0]["id"]
    invalid.append(value)
    value = document()
    value["items"][0]["data"]["answer"] = "missing"
    invalid.append(value)
    value = document()
    value["items"][0]["data"]["sentence"] = "No marker"
    invalid.append(value)
    value = document()
    value["items"][0]["data"]["options"][1]["id"] = "learn"
    invalid.append(value)
    value = document()
    value["items"] = []
    invalid.append(value)
    for value in invalid:
        assert client.post("/api/lessons", json=value).status_code == 422
    assert client.post("/api/lessons", content="not json").status_code == 422
    assert client.post("/api/lessons", content="x" * 1048577).status_code == 413
    assert client.get("/api/lessons").json()["items"] == []
