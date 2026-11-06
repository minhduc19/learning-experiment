from app.main import app
from fastapi.testclient import TestClient
from test_auth import account
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, imported, pytestmark  # noqa: F401

client = corpus_client_fixture


def mark(client, value, **flags):
    row = client.get("/api/corpus/characters", params={"character": value}).json()[
        "items"
    ][0]
    response = client.patch(f"/api/corpus/characters/{row['id']}/progress", json=flags)
    assert response.status_code == 200
    return row["id"]


def check_sentence(sentence):
    assert (
        "".join(segment["text"] for segment in sentence["segments"])
        == sentence["raw_text"]
    )
    assert sentence["traditional_text"] and sentence["simplified_text"]
    for segment in sentence["segments"]:
        assert segment["traditional_text"] and segment["simplified_text"]


def test_selection_ranks_sentences_then_frequency_deduplicates_and_includes_context(
    client,
):
    imported(client, "學學中國文。學校。天天天。文文文。學校。")
    learned_id = mark(client, "學", learned=True, learning=True)
    mark(client, "中", learning=True)
    response = client.get("/api/corpus/study-selection?learned_count=5&new_count=50")
    assert response.status_code == 200, response.text
    data = response.json()
    assert response.headers["cache-control"] == "private, no-store"
    assert len(data["learned"]) == 1 and data["learned"][0]["id"] == learned_id
    assert data["available"]["learned"] == 1
    assert [row["value"] for row in data["new"]][:1] == ["文"]
    assert data["new"][0]["learned_sentence_count"] == 2
    assert {row["value"] for row in data["new"]} == set("中國文校天")
    assert len({row["id"] for row in data["new"]}) == len(data["new"])
    assert [row["value"] for row in data["new"]][-1] == "天"
    for row in data["new"]:
        assert row["value"] in row["sentence"]["raw_text"]
        check_sentence(row["sentence"])
    popular = data["learned"][0]["popular_segments"]
    assert 0 < len(popular) <= 3
    counts = [segment["occurrence_count"] for segment in popular]
    assert counts == sorted(counts, reverse=True)
    for segment in popular:
        assert segment["text"] in segment["sentence"]["raw_text"]
        check_sentence(segment["sentence"])
    assert client.get(f"/api/corpus/characters/{learned_id}").json()["learned"] is True


def test_random_pool_membership_zero_counts_and_no_learned_bootstrap(client):
    imported(client, "學中文。")
    result = client.get(
        "/api/corpus/study-selection?learned_count=0&new_count=2"
    ).json()
    assert result["learned"] == [] and len(result["new"]) == 2
    assert all(row["learned_sentence_count"] == 0 for row in result["new"])
    ids = {mark(client, char, learned=True) for char in "學中文"}
    result = client.get(
        "/api/corpus/study-selection?learned_count=2&new_count=0"
    ).json()
    assert len(result["learned"]) == 2
    assert len({row["id"] for row in result["learned"]}) == 2
    assert {row["id"] for row in result["learned"]} <= ids
    assert result["new"] == []


def test_private_selection_and_parameter_limits(client):
    imported(client, "私人的學校。")
    mark(client, "學", learned=True)
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        empty = bob.get("/api/corpus/study-selection").json()
        assert empty["learned"] == empty["new"] == []
        imported(bob, "學中文。")
        own = bob.get("/api/corpus/study-selection").json()
        assert own["learned"] == []
        assert {row["value"] for row in own["new"]} == set("學中文")
        assert all(row["sentence"]["raw_text"] == "學中文。" for row in own["new"])
    for query in (
        "learned_count=-1",
        "new_count=51",
        "new_count=1.5",
        "learned_count=0&new_count=0",
    ):
        assert client.get("/api/corpus/study-selection?" + query).status_code == 422
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/corpus/study-selection").status_code == 401
