from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from app.corpus.database import connect
from app.main import app
from fastapi.testclient import TestClient
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, imported, pytestmark  # noqa: F401

client = corpus_client_fixture


def segment_for(http, character="学"):
    row = http.get("/api/corpus/characters", params={"character": character}).json()[
        "items"
    ][0]
    segments = http.get(f"/api/corpus/characters/{row['id']}/segments").json()["items"]
    return row, next(segment for segment in segments if segment["text"] == "学校")


def test_marks_persist_across_character_associations_without_marking_characters(client):
    job = imported(client, "学校很大。学校很好。")
    char, segment = segment_for(client)
    endpoint = f"/api/corpus/segments/{segment['id']}/progress"
    assert segment["learned"] is False and segment["learning"] is False
    for update, expected in [
        ({"learned": True}, (True, False)),
        ({"learned": True}, (True, False)),
        ({"learning": True}, (True, True)),
        ({"learned": False}, (False, True)),
        ({"learning": False}, (False, False)),
    ]:
        response = client.patch(endpoint, json=update)
        assert response.status_code == 200, response.text
        assert response.headers["cache-control"] == "private, no-store"
        assert response.json() == {
            "segment_id": segment["id"],
            "learned": expected[0],
            "learning": expected[1],
        }
        for character in ("学", "校"):
            _, saved = segment_for(client, character)
            assert (saved["learned"], saved["learning"]) == expected
            assert saved["occurrence_count"] == 2
        page = client.get(
            f"/api/corpus/characters/{char['id']}/segments",
            params={"story_id": job["story_id"], "include_sentence_counts": True},
        ).json()["items"]
        assert (
            next(row for row in page if row["id"] == segment["id"])["learned"]
            is expected[0]
        )
    assert client.get(f"/api/corpus/characters/{char['id']}").json()["learned"] is False
    with connect() as db:
        assert (
            db.execute(
                "SELECT count(*) AS n FROM corpus.user_segment_progress"
            ).fetchone()["n"]
            == 1
        )


def test_segment_marks_are_private_and_require_owned_completed_vocabulary(client):
    imported(client, "学校。")
    _, segment = segment_for(client)
    endpoint = f"/api/corpus/segments/{segment['id']}/progress"
    assert client.patch(endpoint, json={"learned": True}).status_code == 200
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        assert bob.patch(endpoint, json={"learning": True}).status_code == 404
        assert (
            bob.patch(
                "/api/corpus/segments/999999999/progress", json={"learned": True}
            ).status_code
            == 404
        )
        imported(bob, "我去学校。")
        _, shared = segment_for(bob)
        assert shared["id"] == segment["id"] and shared["learned"] is False
        assert bob.patch(endpoint, json={"learning": True}).json() == {
            "segment_id": segment["id"],
            "learned": False,
            "learning": True,
        }
        _, own = segment_for(client)
        assert own["learned"] is True and own["learning"] is False
    with TestClient(app) as anonymous:
        assert anonymous.patch(endpoint, json={"learned": True}).status_code == 401


def test_partial_updates_are_atomic_and_invalid_values_are_rejected(client):
    imported(client, "学校。")
    _, segment = segment_for(client)
    endpoint = f"/api/corpus/segments/{segment['id']}/progress"
    for payload in (
        {},
        {"learned": None},
        {"learning": None},
        {"learned": "true"},
        {"learning": 1},
        {"user_id": "other", "learned": True},
    ):
        assert client.patch(endpoint, json=payload).status_code == 422
    barrier = Barrier(2)

    def update(flag):
        barrier.wait(timeout=5)
        response = client.patch(endpoint, json={flag: True})
        assert response.status_code == 200, response.text

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(update, ("learned", "learning")))
    _, saved = segment_for(client)
    assert saved["learned"] is True and saved["learning"] is True
