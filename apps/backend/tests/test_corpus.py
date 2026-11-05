"""Actual PostgreSQL tests: never substitute SQLite for occurrence joins."""

import os
from urllib.parse import parse_qsl, urlsplit
from uuid import uuid4

import psycopg
import pytest
from app.corpus import worker
from app.corpus.database import connect
from app.corpus.migrate import migrate
from app.main import app
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo

pytestmark = pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"),
    reason="Set TEST_DATABASE_URL for corpus PostgreSQL integration",
)


@pytest.fixture(scope="module")
def corpus_database():
    name = "corpus_test_" + uuid4().hex
    admin = psycopg.connect(os.environ["TEST_DATABASE_URL"], autocommit=True)
    admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    try:
        yield make_conninfo(os.environ["TEST_DATABASE_URL"], dbname=name)
    finally:
        admin.execute(
            sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name))
        )
        admin.close()


@pytest.fixture
def client(corpus_database, monkeypatch, tmp_path):
    monkeypatch.setenv("DATABASE_URL", corpus_database)
    monkeypatch.setenv("CORPUS_DATA_DIR", str(tmp_path))
    with connect(worker=True) as db:
        db.execute("DROP SCHEMA IF EXISTS corpus CASCADE")
    migrate()
    with TestClient(app) as client:
        yield client


def upload(client, data, filename="story.txt"):
    result = client.post(
        "/api/corpus/uploads", json={"filename": filename, "size": len(data)}
    )
    assert result.status_code == 201, result.text
    identifier = result.json()["id"]
    chunk_size = 7 if len(data) < 1000 else 65536
    for offset in range(0, len(data), chunk_size):
        response = client.patch(
            f"/api/corpus/uploads/{identifier}",
            content=data[offset : offset + chunk_size],
            headers={
                "Content-Type": "application/octet-stream",
                "Upload-Offset": str(offset),
            },
        )
        assert response.status_code == 204, response.text
    return identifier


def queue(client, data):
    identifier = upload(client, data)
    response = client.post(
        "/api/corpus/imports", json={"upload_id": identifier, "title": "中文故事"}
    )
    assert response.status_code == 202, response.text
    return response.json()


def imported(client, text):
    job = queue(client, text.encode())
    assert worker.run_once()
    status = client.get("/api/corpus/imports/" + job["id"]).json()
    assert status["status"] == "completed", status
    return job


def collect(client, path, limit=2):
    rows = []
    cursor = None
    while True:
        response = client.get(
            urlsplit(path).path,
            params={
                **dict(parse_qsl(urlsplit(path).query)),
                "limit": limit,
                **({"cursor": cursor} if cursor else {}),
            },
        )
        assert response.status_code == 200, response.text
        data = response.json()
        rows.extend(data["items"])
        cursor = data["next_cursor"]
        if cursor is None:
            break
    return rows


def test_roundtrip_and_occurrence_joins(client):
    text = "\ufeff  谢谢你。\r\n谢谢你！\n我学习中文。我学习中文。\r\n😀𠀀\t"
    job = imported(client, text)
    story = job["story_id"]
    rows = collect(client, f"/api/corpus/stories/{story}/sentences")
    assert "".join(row["raw_text"] for row in rows) == text
    assert [r["position"] for r in rows] == list(range(len(rows)))
    assert all(r["end_offset"] - r["start_offset"] == len(r["raw_text"]) for r in rows)
    assert all(a["end_offset"] == b["start_offset"] for a, b in zip(rows, rows[1:]))
    assert client.get(f"/api/corpus/stories/{story}/text").content == text.encode()
    rank = client.get("/api/corpus/characters", params={"character": "谢"}).json()[
        "items"
    ][0]
    assert rank["occurrence_count"] == 4
    assert rank["distinct_segment_count"] == 1
    assert rank["segment_occurrence_count"] == 2
    segments = client.get(f"/api/corpus/characters/{rank['id']}/segments").json()[
        "items"
    ]
    assert [(s["text"], s["count_in_segment"]) for s in segments] == [("谢谢", 2)]
    matches = collect(client, f"/api/corpus/characters/{rank['id']}/sentences", limit=1)
    assert len(matches) == 2
    assert all(len(s["matches"]) == 2 for s in matches)
    segment_matches = collect(
        client, f"/api/corpus/segments/{segments[0]['id']}/sentences"
    )
    assert len(segment_matches) == 2
    with connect() as db:
        assert db.execute(
            "SELECT count(*) AS n FROM corpus.character_occurrences"
        ).fetchone()["n"] == len(text)


def test_distinct_counts_across_stories_and_filters(client):
    one = imported(client, "谢谢。谢谢。")
    two = imported(client, "谢谢。感谢。")
    result = client.get(
        "/api/corpus/characters",
        params={"character": "谢", "sort": "distinct_segment_count"},
    ).json()["items"][0]
    assert result["occurrence_count"] == 7
    assert result["distinct_segment_count"] == 2
    assert result["segment_occurrence_count"] == 4
    filtered = client.get(
        "/api/corpus/characters",
        params={"character": "谢", "story_id": one["story_id"]},
    ).json()["items"][0]
    assert filtered["occurrence_count"] == 4
    assert filtered["distinct_segment_count"] == 1
    assert (
        len(
            collect(
                client,
                f"/api/corpus/characters/{result['id']}/segments?story_id={two['story_id']}",
            )
        )
        == 2
    )
    assert all(row["is_han"] for row in collect(client, "/api/corpus/characters"))
    assert any(
        not row["is_han"]
        for row in collect(client, "/api/corpus/characters?include_non_han=true")
    )


def test_invalid_utf8_is_failed_and_hidden(client):
    job = queue(client, "你好。".encode() + b"\xff")
    worker.run_once()
    state = client.get("/api/corpus/imports/" + job["id"]).json()
    assert state["status"] == "failed"
    assert client.get("/api/corpus/stories").json()["items"] == []
    assert client.get("/api/corpus/characters").json()["items"] == []
    assert client.get(f"/api/corpus/stories/{job['story_id']}/text").status_code == 404


def test_crash_after_checkpoint_then_resume_without_duplicates(client, monkeypatch):
    text = ("我学习中文。\r\n谢谢你！\n" * 3000) + "最后。"
    job = queue(client, text.encode())
    original = worker.record_batch

    def interrupted(*args):
        original(*args)
        raise RuntimeError("Simulated worker failure after committed batch")

    monkeypatch.setattr(worker, "record_batch", interrupted)
    worker.run_once()
    failed = client.get("/api/corpus/imports/" + job["id"]).json()
    assert failed["status"] == "failed" and 0 < failed["byte_offset"] < len(
        text.encode()
    )
    assert client.get("/api/corpus/characters").json()["items"] == []
    monkeypatch.setattr(worker, "record_batch", original)
    assert client.post("/api/corpus/imports/" + job["id"] + "/retry").status_code == 202
    worker.run_once()
    assert (
        client.get("/api/corpus/imports/" + job["id"]).json()["status"] == "completed"
    )
    assert (
        client.get(f"/api/corpus/stories/{job['story_id']}/text").content
        == text.encode()
    )
    with connect() as db:
        assert db.execute(
            "SELECT count(*) AS n FROM corpus.character_occurrences"
        ).fetchone()["n"] == len(text)
        assert db.execute(
            "SELECT sum(occurrence_count) AS n FROM corpus.character_stats"
        ).fetchone()["n"] == len(text)


def test_long_sentence_parts(client):
    text = "学" * 10000 + "。" + " " * 9000 + "再见。"
    job = imported(client, text)
    rows = collect(client, f"/api/corpus/stories/{job['story_id']}/sentences")
    assert "".join(r["raw_text"] for r in rows) == text
    assert max(len(r["raw_text"]) for r in rows) <= 4096
    assert rows[0]["sentence_position"] == rows[1]["sentence_position"] == 0
    assert rows[-1]["sentence_position"] == 1
    assert rows[-1]["is_final"]


def test_upload_offsets_limits_immutability_and_idempotency(client, monkeypatch):
    monkeypatch.setenv("CORPUS_MAX_UPLOAD_BYTES", "20")
    assert (
        client.post(
            "/api/corpus/uploads", json={"filename": "a.txt", "size": 21}
        ).status_code
        == 413
    )
    assert (
        client.post(
            "/api/corpus/uploads", json={"filename": "a.pdf", "size": 5}
        ).status_code
        == 422
    )
    row = client.post(
        "/api/corpus/uploads", json={"filename": "../../story.txt", "size": 6}
    ).json()
    path = f"/api/corpus/uploads/{row['id']}"
    assert (
        client.post(
            "/api/corpus/imports", json={"upload_id": row["id"], "title": "test"}
        ).status_code
        == 409
    )
    assert (
        client.patch(
            path,
            content=b"abc",
            headers={"Content-Type": "application/octet-stream", "Upload-Offset": "1"},
        ).status_code
        == 409
    )
    assert (
        client.patch(
            path,
            content=b"abc",
            headers={"Content-Type": "text/plain", "Upload-Offset": "0"},
        ).status_code
        == 415
    )
    assert (
        client.patch(
            path,
            content=b"abc",
            headers={"Content-Type": "application/octet-stream", "Upload-Offset": "0"},
        ).status_code
        == 204
    )
    assert client.head(path).headers["upload-offset"] == "3"
    assert client.get(path).json()["offset_bytes"] == 3
    assert (
        client.patch(
            path,
            content=b"defg",
            headers={"Content-Type": "application/octet-stream", "Upload-Offset": "3"},
        ).status_code
        == 413
    )
    assert (
        client.patch(
            path,
            content=b"def",
            headers={"Content-Type": "application/octet-stream", "Upload-Offset": "3"},
        ).status_code
        == 204
    )
    data = {"upload_id": row["id"], "title": "test"}
    one = client.post("/api/corpus/imports", json=data).json()
    assert client.post("/api/corpus/imports", json=data).json() == one
    assert (
        client.patch(
            path,
            content=b"a",
            headers={"Content-Type": "application/octet-stream", "Upload-Offset": "6"},
        ).status_code
        == 409
    )


def test_invalid_cursors_and_missing_resources(client):
    imported(client, "你好。")
    assert client.get("/api/corpus/characters?cursor=not-base64").status_code == 422
    assert client.get("/api/corpus/characters?sort=sql_injection").status_code == 422
    assert client.get("/api/corpus/characters?limit=101").status_code == 422
    assert client.get("/api/corpus/characters/999999/segments").status_code == 404
    assert client.get("/api/corpus/segments/999999/sentences").status_code == 404
    assert client.get(f"/api/corpus/stories/{uuid4()}/sentences").status_code == 404
    result = client.get("/api/corpus/characters?limit=1").json()
    assert (
        client.get(
            "/api/corpus/characters",
            params={"sort": "distinct_segment_count", "cursor": result["next_cursor"]},
        ).status_code
        == 422
    )


def test_migrations_are_idempotent(client):
    migrate()
    with connect() as db:
        assert (
            db.execute("SELECT count(*) AS n FROM corpus.schema_migrations").fetchone()[
                "n"
            ]
            == 1
        )


def test_processing_job_is_reclaimed_after_process_death(client, monkeypatch):
    text = ("学" * 4095 + "。" + " " * 4096) * 6 + "最后一句。"
    job = queue(client, text.encode())
    original = worker.record_batch

    def process_dies(*args):
        original(*args)
        raise SystemExit("Simulated abrupt process exit")

    monkeypatch.setattr(worker, "record_batch", process_dies)
    with pytest.raises(SystemExit):
        worker.run_once()
    assert (
        client.get("/api/corpus/imports/" + job["id"]).json()["status"] == "processing"
    )
    monkeypatch.setattr(worker, "record_batch", original)
    worker.run_once()
    status = client.get("/api/corpus/imports/" + job["id"]).json()
    assert status["status"] == "completed"
    assert status["attempts"] == 2
    assert (
        client.get(f"/api/corpus/stories/{job['story_id']}/text").content
        == text.encode()
    )
    rows = collect(client, f"/api/corpus/stories/{job['story_id']}/sentences")
    assert rows[-1]["sentence_position"] == 6
    assert sum(r["is_final"] for r in rows) == 7


def test_locked_job_is_not_processed_by_second_worker(client):
    job = queue(client, "你好。".encode())
    with connect(worker=True) as db:
        db.execute("SELECT pg_advisory_lock(hashtextextended(%s,0))", (job["id"],))
        assert worker.run_once() is False
        assert client.get("/api/corpus/imports/" + job["id"]).json()["attempts"] == 0
    assert worker.run_once() is True


def test_oversized_chunk_and_empty_chunk(client, monkeypatch):
    from app.corpus import routes

    monkeypatch.setattr(routes, "MAX_PATCH_BYTES", 3)
    identifier = client.post(
        "/api/corpus/uploads", json={"filename": "a.txt", "size": 6}
    ).json()["id"]
    headers = {"Content-Type": "application/octet-stream", "Upload-Offset": "0"}
    assert (
        client.patch(
            "/api/corpus/uploads/" + identifier, content=b"abcd", headers=headers
        ).status_code
        == 413
    )
    assert (
        client.patch(
            "/api/corpus/uploads/" + identifier, content=b"", headers=headers
        ).status_code
        == 422
    )
    assert client.get("/api/corpus/uploads/" + identifier).json()["offset_bytes"] == 0


def test_concurrent_import_publication_counts_distinct_union(client):
    from concurrent.futures import ThreadPoolExecutor

    jobs = [queue(client, "谢谢你。".encode()), queue(client, "谢谢大家。".encode())]
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert all(pool.map(lambda _: worker.run_once(), range(2)))
    assert all(
        client.get("/api/corpus/imports/" + j["id"]).json()["status"] == "completed"
        for j in jobs
    )
    result = client.get("/api/corpus/characters?character=谢").json()["items"][0]
    assert result["occurrence_count"] == 4
    assert result["distinct_segment_count"] == 1
    assert result["segment_occurrence_count"] == 2


def test_batch_failure_rolls_back_data_and_checkpoint(client, monkeypatch):
    job = queue(client, "谢谢你。".encode())
    original = worker.record_batch

    class FailingConnection:
        def __init__(self, connection):
            self.connection = connection

        def __getattr__(self, name):
            return getattr(self.connection, name)

        def execute(self, query, params=None):
            if isinstance(query, str) and "SET byte_offset=" in query:
                raise RuntimeError(
                    "Failure after occurrence inserts, before checkpoint"
                )
            return self.connection.execute(query, params)

    def fail_before_checkpoint(db, *args):
        return original(FailingConnection(db), *args)

    monkeypatch.setattr(worker, "record_batch", fail_before_checkpoint)
    worker.run_once()
    status = client.get("/api/corpus/imports/" + job["id"]).json()
    assert status["status"] == "failed"
    assert status["byte_offset"] == 0
    with connect() as db:
        assert (
            db.execute(
                "SELECT count(*) AS n FROM corpus.character_occurrences"
            ).fetchone()["n"]
            == 0
        )
    monkeypatch.setattr(worker, "record_batch", original)
    assert client.post("/api/corpus/imports/" + job["id"] + "/retry").status_code == 202
    worker.run_once()
    assert (
        client.get("/api/corpus/imports/" + job["id"]).json()["status"] == "completed"
    )


def test_concurrent_chunks_only_append_once(client):
    from concurrent.futures import ThreadPoolExecutor

    identifier = client.post(
        "/api/corpus/uploads", json={"filename": "a.txt", "size": 3}
    ).json()["id"]

    def append(_):
        return client.patch(
            "/api/corpus/uploads/" + identifier,
            content=b"abc",
            headers={"Content-Type": "application/octet-stream", "Upload-Offset": "0"},
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(append, range(2))) == [204, 409]
    assert client.get("/api/corpus/uploads/" + identifier).json()["offset_bytes"] == 3


def test_segment_index_bounds_for_long_tokens(client):
    job = imported(client, "A" * 10000)
    rank = client.get("/api/corpus/characters?character=A&include_non_han=true").json()[
        "items"
    ][0]
    assert rank["occurrence_count"] == 10000
    segments = collect(client, f"/api/corpus/characters/{rank['id']}/segments")
    assert all(len(segment["text"]) <= 256 for segment in segments)
    assert (
        client.get(f"/api/corpus/stories/{job['story_id']}/text").content
        == b"A" * 10000
    )


def test_exit_before_checkpoint_does_not_commit_partial_batch(client, monkeypatch):
    job = queue(client, "谢谢你。".encode())
    original = worker.record_batch

    class InterruptedConnection:
        def __init__(self, connection):
            self.connection = connection

        def __getattr__(self, name):
            return getattr(self.connection, name)

        def execute(self, query, params=None):
            if isinstance(query, str) and "SET byte_offset=" in query:
                raise SystemExit("Process exits before batch checkpoint")
            return self.connection.execute(query, params)

    monkeypatch.setattr(
        worker,
        "record_batch",
        lambda db, *args: original(InterruptedConnection(db), *args),
    )
    with pytest.raises(SystemExit):
        worker.run_once()
    with connect() as db:
        assert (
            db.execute(
                "SELECT count(*) AS n FROM corpus.character_occurrences"
            ).fetchone()["n"]
            == 0
        )
        assert (
            db.execute("SELECT character_count FROM corpus.stories").fetchone()[
                "character_count"
            ]
            == 0
        )
    monkeypatch.setattr(worker, "record_batch", original)
    worker.run_once()
    assert (
        client.get("/api/corpus/imports/" + job["id"]).json()["status"] == "completed"
    )


def test_graceful_stop_exits_after_committed_checkpoint(client, monkeypatch):
    job = queue(client, ("我学习中文。" * 10000).encode())
    monkeypatch.setattr(worker, "stopping", True)
    with pytest.raises(SystemExit):
        worker.run_once()
    status = client.get("/api/corpus/imports/" + job["id"]).json()
    assert status["status"] == "processing"
    assert 0 < status["byte_offset"] < status["total_bytes"]
    monkeypatch.setattr(worker, "stopping", False)
    worker.run_once()
    assert (
        client.get("/api/corpus/imports/" + job["id"]).json()["status"] == "completed"
    )
