from app.main import app
from fastapi.testclient import TestClient
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, imported, pytestmark  # noqa: F401

client = corpus_client_fixture


def test_long_logical_sentence_is_ranked_once_with_bounded_excerpt(client):
    imported(client, "學" * 4200 + "。")
    row = client.get("/api/corpus/characters?character=學").json()["items"][0]
    client.patch(f"/api/corpus/characters/{row['id']}/progress", json={"learned": True})
    rows = client.get("/api/corpus/practice-sentences").json()["items"]
    assert len(rows) == 1
    assert rows[0]["matched_count"] == 4200
    assert rows[0]["is_excerpt"] is True
    assert len(rows[0]["raw_text"]) == len(rows[0]["marks"]) == 1000


def test_ranking_counts_marks_pagination_and_changed_cursor(client):
    imported(client, "學學學。我學中文。你好。")
    chars = client.get("/api/corpus/characters").json()["items"]
    for char in chars:
        if char["value"] in ("學", "中"):
            result = client.patch(
                f"/api/corpus/characters/{char['id']}/progress",
                json={"learned": char["value"] == "學", "learning": True},
            )
            assert result.status_code == 200
    first = client.get("/api/corpus/practice-sentences?limit=1").json()
    row = first["items"][0]
    assert row["raw_text"] == "學學學。"
    assert row["matched_count"] == row["both_count"] == 3
    assert row["learned_count"] == row["learning_count"] == 0
    assert [mark["offset"] for mark in row["marks"]] == [0, 1, 2]
    second = client.get(
        "/api/corpus/practice-sentences",
        params={"cursor": first["next_cursor"], "limit": 1},
    ).json()
    assert second["items"][0]["raw_text"] == "我學中文。"
    assert second["items"][0]["matched_count"] == 2
    assert second["items"][0]["learning_count"] == 1
    assert second["next_cursor"] is None
    client.patch(
        f"/api/corpus/characters/{chars[0]['id']}/progress",
        json={"learned": False, "learning": False},
    )
    # Change a known marked character so the ranking cursor must be refreshed.
    marked = next(c for c in chars if c["value"] == "學")
    client.patch(
        f"/api/corpus/characters/{marked['id']}/progress",
        json={"learned": False, "learning": False},
    )
    assert (
        client.get(
            "/api/corpus/practice-sentences", params={"cursor": first["next_cursor"]}
        ).status_code
        == 422
    )


def test_practice_is_private_and_requires_marks(client):
    imported(client, "學校。")
    assert client.get("/api/corpus/practice-sentences").json()["items"] == []
    row = client.get("/api/corpus/characters?character=學").json()["items"][0]
    client.patch(f"/api/corpus/characters/{row['id']}/progress", json={"learned": True})
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        imported(bob, "學校。")
        assert bob.get("/api/corpus/practice-sentences").json()["items"] == []
        bob.patch(
            f"/api/corpus/characters/{row['id']}/progress", json={"learning": True}
        )
        result = bob.get("/api/corpus/practice-sentences")
        assert result.headers["cache-control"] == "private, no-store"
        assert len(result.json()["items"]) == 1
        assert result.json()["items"][0]["learning_count"] == 1
        assert result.json()["items"][0]["learned_count"] == 0
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/corpus/practice-sentences").status_code == 401
