from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from app.corpus.database import connect
from app.main import app
from fastapi.testclient import TestClient
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, imported, pytestmark  # noqa: F401

client = corpus_client_fixture


def character(client, text="學校很好。"):
    job = imported(client, text)
    row = client.get("/api/corpus/characters?character=學").json()["items"][0]
    return row, job


def test_flags_are_independent_persistent_idempotent_and_shared_across_own_stories(
    client,
):
    row, first = character(client)
    _, second = character(client)
    endpoint = f"/api/corpus/characters/{row['id']}"
    assert row["learned"] is False and row["learning"] is False
    for update, expected in [
        ({"learned": True}, (True, False)),
        ({"learned": True}, (True, False)),
        ({"learning": True}, (True, True)),
        ({"learned": False}, (False, True)),
        ({"learning": False}, (False, False)),
        ({"learned": True, "learning": True}, (True, True)),
    ]:
        result = client.patch(endpoint + "/progress", json=update)
        assert result.status_code == 200, result.text
        assert result.headers["cache-control"] == "private, no-store"
        assert result.json() == {
            "character_id": row["id"],
            "learned": expected[0],
            "learning": expected[1],
        }
        detail = client.get(endpoint).json()
        assert (detail["learned"], detail["learning"]) == expected
        for story in (first, second):
            page = client.get(
                "/api/corpus/characters",
                params={
                    "character": "學",
                    "story_id": story["story_id"],
                    "sort": "distinct_segment_count",
                },
            ).json()["items"][0]
            assert (page["learned"], page["learning"]) == expected
            assert page["occurrence_count"] == row["occurrence_count"]
    with connect() as db:
        assert (
            db.execute(
                "SELECT count(*) AS n FROM corpus.user_character_progress"
            ).fetchone()["n"]
            == 1
        )


def test_progress_is_private_and_only_owned_completed_characters_can_be_marked(client):
    row, _ = character(client)
    endpoint = f"/api/corpus/characters/{row['id']}"
    assert (
        client.patch(endpoint + "/progress", json={"learned": True}).status_code == 200
    )
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        assert (
            bob.patch(endpoint + "/progress", json={"learning": True}).status_code
            == 404
        )
        assert (
            bob.patch(
                "/api/corpus/characters/999999999/progress", json={"learned": True}
            ).status_code
            == 404
        )
        own, _ = character(bob, "我去學校。")
        assert own["id"] == row["id"]
        assert own["learned"] is False and own["learning"] is False
        assert bob.patch(endpoint + "/progress", json={"learning": True}).json() == {
            "character_id": row["id"],
            "learned": False,
            "learning": True,
        }
        alice = client.get(endpoint).json()
        assert alice["learned"] is True and alice["learning"] is False
        unique = client.get("/api/corpus/characters?character=很").json()["items"][0]
        assert (
            bob.patch(
                f"/api/corpus/characters/{unique['id']}/progress",
                json={"learned": True},
            ).status_code
            == 404
        )
    with TestClient(app) as anonymous:
        assert (
            anonymous.patch(endpoint + "/progress", json={"learned": True}).status_code
            == 401
        )
    with connect() as db:
        assert (
            db.execute(
                "SELECT count(*) AS n FROM corpus.user_character_progress"
            ).fetchone()["n"]
            == 2
        )


def test_invalid_progress_payloads_are_rejected_without_changes(client):
    row, _ = character(client)
    endpoint = f"/api/corpus/characters/{row['id']}/progress"
    for payload in (
        {},
        {"learned": None},
        {"learning": None},
        {"learned": "true"},
        {"learning": 1},
        {"status": "learned"},
        {"learned": True, "user_id": "other"},
    ):
        result = client.patch(endpoint, json=payload)
        assert result.status_code == 422, result.text
    with connect() as db:
        assert (
            db.execute(
                "SELECT count(*) AS n FROM corpus.user_character_progress"
            ).fetchone()["n"]
            == 0
        )


def test_concurrent_partial_updates_preserve_both_flags(client):
    row, _ = character(client)
    endpoint = f"/api/corpus/characters/{row['id']}"
    for value in (True, False):
        barrier = Barrier(2)

        def update(flag, barrier=barrier, value=value):
            barrier.wait(timeout=5)
            response = client.patch(endpoint + "/progress", json={flag: value})
            assert response.status_code == 200, response.text

        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(update, ("learned", "learning")))
        result = client.get(endpoint).json()
        assert result["learned"] is value and result["learning"] is value
