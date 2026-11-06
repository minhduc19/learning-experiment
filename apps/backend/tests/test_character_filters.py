from itertools import pairwise

from test_corpus import client as corpus_client_fixture
from test_corpus import collect, corpus_database, imported, pytestmark  # noqa: F401

client = corpus_client_fixture


def test_statuses_and_both_sort_directions_paginate_without_duplicates(client):
    imported(client, "學學學中文文校。學校。")
    rows = client.get("/api/corpus/characters").json()["items"]
    for row in rows:
        if row["value"] != "校":
            response = client.patch(
                f"/api/corpus/characters/{row['id']}/progress",
                json={
                    "learned": row["value"] in ("學", "文"),
                    "learning": row["value"] in ("中", "文"),
                },
            )
            assert response.status_code == 200
    expected = {
        "all": set("學中文校"),
        "unmarked": {"校"},
        "learned_only": {"學"},
        "learning_only": {"中"},
        "revision": {"文"},
        "learned": set("學文"),
        "learning": set("中文"),
        "marked": set("學中文"),
    }
    for status, characters in expected.items():
        for sort in ("occurrence_count", "distinct_segment_count"):
            for direction in ("asc", "desc"):
                result = collect(
                    client,
                    f"/api/corpus/characters?status={status}&sort={sort}&direction={direction}",
                    limit=1,
                )
                assert {row["value"] for row in result} == characters
                assert len(result) == len(characters)
                counts = [row[sort] for row in result]
                assert counts == sorted(counts, reverse=direction == "desc")
                for a, b in pairwise(result):
                    if a[sort] == b[sort]:
                        assert a["id"] < b["id"]


def test_invalid_filters_and_reusing_cursor_for_different_query(client):
    imported(client, "學中文。")
    for query in ("status=unknown", "direction=sideways", "sort=unsafe"):
        assert client.get("/api/corpus/characters?" + query).status_code == 422
    cursor = client.get("/api/corpus/characters?limit=1").json()["next_cursor"]
    for query in ("direction=asc", "status=unmarked", "sort=distinct_segment_count"):
        response = client.get(
            "/api/corpus/characters",
            params={**dict([query.split("=", 1)]), "cursor": cursor},
        )
        assert response.status_code == 422
