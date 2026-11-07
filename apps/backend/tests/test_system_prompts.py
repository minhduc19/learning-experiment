from pathlib import Path
from uuid import uuid4

from app.ai.prompts import DEFAULT_CONTENT, DEFAULT_TITLE
from app.main import app
from fastapi.testclient import TestClient
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, pytestmark  # noqa: F401

client = corpus_client_fixture
ROOT = "/api/ai/system-prompts"


def test_prompt_library_crud_selection_revision_and_delete_all(client):
    first = client.get(ROOT)
    assert first.status_code == 200, first.text
    assert first.headers["cache-control"] == "private, no-store"
    initial = first.json()
    assert len(initial["items"]) == 1
    default = initial["items"][0]
    assert default["title"] == DEFAULT_TITLE == "First multiple choice quiz"
    assert default["content"] == DEFAULT_CONTENT
    assert initial["selected_id"] == default["id"]
    assert client.get(ROOT).json() == initial

    created = client.post(ROOT, json={"title": "Second quiz", "content": " New instructions\n"})
    assert created.status_code == 201, created.text
    state = created.json()
    assert state["selected_id"] == default["id"], "Creating a prompt does not select it"
    new = state["items"][1]
    assert new["content"] == " New instructions\n"
    chosen = client.put(f"{ROOT}/{new['id']}/select")
    assert chosen.json()["selected_id"] == new["id"]
    assert client.get(ROOT).json()["selected_id"] == new["id"]

    update = {"title": "Renamed quiz", "content": "Edited instructions", "revision": 1}
    updated = client.put(f"{ROOT}/{new['id']}", json=update)
    assert updated.status_code == 200, updated.text
    edited = updated.json()["items"][1]
    assert edited["title"] == "Renamed quiz"
    assert edited["content"] == "Edited instructions"
    assert edited["revision"] == 2
    assert updated.json()["selected_id"] == new["id"]
    assert client.put(f"{ROOT}/{new['id']}", json=update).status_code == 409
    assert client.delete(f"{ROOT}/{new['id']}?revision=1").status_code == 409

    deleted = client.delete(f"{ROOT}/{new['id']}?revision=2")
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()["selected_id"] is None, "Deleting the selection must not silently choose another prompt"
    assert client.get(ROOT).json()["selected_id"] is None
    assert client.delete(f"{ROOT}/{default['id']}?revision=1").json()["items"] == []
    assert client.get(ROOT).json() == {"items": [], "selected_id": None}, "Deleted prompts must not be reseeded"
    assert client.put(f"{ROOT}/{new['id']}/select").status_code == 404
    assert client.post(ROOT, json={"title": "Start again", "content": "Instructions"}).status_code == 201
    assert client.get(ROOT).json()["selected_id"] is None


def test_prompt_libraries_are_private_and_require_auth(client):
    owner = client.get(ROOT).json()["items"][0]
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        other = bob.get(ROOT).json()
        assert other["items"][0]["id"] != owner["id"]
        assert len(other["items"]) == 1
        assert bob.put(f"{ROOT}/{owner['id']}/select").status_code == 404
        assert bob.put(f"{ROOT}/{owner['id']}", json={"title": "Stolen", "content": "Changed", "revision": 1}).status_code == 404
        assert bob.delete(f"{ROOT}/{owner['id']}?revision=1").status_code == 404
    assert client.get(ROOT).json()["items"][0] == owner
    with TestClient(app) as anonymous:
        assert anonymous.get(ROOT).status_code == 401
        assert anonymous.post(ROOT, json={"title": "X", "content": "Y"}).status_code == 401
        assert anonymous.put(f"{ROOT}/{owner['id']}/select").status_code == 401
        assert anonymous.put(f"{ROOT}/{owner['id']}", json={"title": "X", "content": "Y", "revision": 1}).status_code == 401
        assert anonymous.delete(f"{ROOT}/{owner['id']}?revision=1").status_code == 401


def test_prompt_validation(client):
    initial = client.get(ROOT).json()
    identifier = initial["selected_id"]
    for payload in [
        {"title": " ", "content": "Text"}, {"title": "Title", "content": "\n"},
        {"title": "x" * 201, "content": "Text"}, {"title": "Title", "content": "x" * 50001},
        {"title": "Title", "content": 12}, {"title": "Title", "content": "Text", "user_id": str(uuid4())},
    ]:
        assert client.post(ROOT, json=payload).status_code == 422
    for revision in [True, 0, "1"]:
        assert client.put(f"{ROOT}/{identifier}", json={"title": "X", "content": "Y", "revision": revision}).status_code == 422
    assert client.post(ROOT, content="not JSON").status_code == 422
    assert client.post(ROOT, content="x" * 1048577).status_code == 413
    assert client.delete(f"{ROOT}/{identifier}?revision=0").status_code == 422
    assert client.get(ROOT).json() == initial
