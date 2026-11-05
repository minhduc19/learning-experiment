from datetime import datetime, timedelta, timezone

import jwt
import pytest
from app.auth.security import signing_key
from app.corpus.database import connect
from app.main import app
from fastapi.testclient import TestClient
from test_corpus import client as corpus_client_fixture
from test_corpus import corpus_database, imported, pytestmark, upload  # noqa: F401

client = corpus_client_fixture


def account(http, email="bob@example.com", username="bob"):
    response = http.post(
        "/api/auth/register",
        json={"email": email, "username": username, "password": "bob-password-123"},
    )
    assert response.status_code == 201, response.text
    response = http.post(
        "/api/auth/login", json={"email": email, "password": "bob-password-123"}
    )
    assert response.status_code == 200, response.text
    http.headers["Authorization"] = "Bearer " + response.json()["access_token"]
    return response.json()


@pytest.mark.usefixtures("client")
def test_account_hash_cookie_rotation_logout_and_constraints(client):
    with TestClient(app, base_url="https://testserver") as bob:
        session = account(bob)
        assert "password_hash" not in session["user"]
        assert session["user"]["role"] == "user"
        cookie = bob.cookies.get("corpus_refresh")
        assert cookie and client.get("/api/auth/me").status_code == 200
        response = bob.post("/api/auth/refresh")
        assert response.status_code == 200, response.text
        assert "Secure" in response.headers["set-cookie"]
        assert "HttpOnly" in response.headers["set-cookie"]
        assert bob.cookies.get("corpus_refresh") != cookie
        with TestClient(app, base_url="https://testserver") as replay:
            replay.cookies.set("corpus_refresh", cookie)
            assert replay.post("/api/auth/refresh").status_code == 401
        duplicate = bob.post(
            "/api/auth/register",
            json={
                "email": "BOB@example.com",
                "username": "someone",
                "password": "another-password",
            },
        )
        assert duplicate.status_code == 409
        assert (
            bob.post(
                "/api/auth/login",
                json={"email": "bob@example.com", "password": "wrong"},
            ).status_code
            == 401
        )
        with connect() as db:
            user = db.execute(
                "SELECT * FROM auth.users WHERE email=%s", ("bob@example.com",)
            ).fetchone()
            assert user["password_hash"].startswith("$argon2id$")
            assert "bob-password-123" not in user["password_hash"]
            saved = db.execute(
                "SELECT refresh_token_hash FROM auth.sessions WHERE user_id=%s",
                (user["id"],),
            ).fetchone()
            assert saved["refresh_token_hash"] != cookie
        token = bob.headers["Authorization"]
        assert bob.post("/api/auth/logout").status_code == 204
        assert (
            bob.get("/api/auth/me", headers={"Authorization": token}).status_code == 401
        )
        assert bob.post("/api/auth/refresh").status_code == 401


def test_two_users_share_vocabulary_but_never_stories_sentences_or_counts(client):
    alice = imported(client, "學校很大。學校很好。")
    only_alice = client.get("/api/corpus/characters?character=大").json()["items"][0]
    shared = client.get("/api/corpus/characters?character=學").json()["items"][0]
    segment = client.get(f"/api/corpus/characters/{shared['id']}/segments").json()[
        "items"
    ][0]
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        assert bob.get("/api/corpus/stories").json()["items"] == []
        assert bob.get("/api/corpus/characters").json()["items"] == []
        for suffix in ["", "/sentences", "/text", "/text?script=simplified"]:
            assert (
                bob.get("/api/corpus/stories/" + alice["story_id"] + suffix).status_code
                == 404
            )
        assert bob.get("/api/corpus/imports/" + alice["id"]).status_code == 404
        assert (
            bob.post("/api/corpus/imports/" + alice["id"] + "/retry").status_code == 404
        )
        assert bob.get(f"/api/corpus/characters/{shared['id']}").status_code == 404
        assert (
            bob.get(f"/api/corpus/segments/{segment['id']}/sentences").status_code
            == 404
        )
        own = imported(bob, "我去學校。")
        assert (
            bob.get("/api/corpus/stories").json()["items"][0]["id"] == own["story_id"]
        )
        own_shared = bob.get("/api/corpus/characters?character=學").json()["items"][0]
        assert own_shared["id"] == shared["id"]
        assert own_shared["occurrence_count"] == 1
        assert (
            client.get("/api/corpus/characters?character=學").json()["items"][0][
                "occurrence_count"
            ]
            == 2
        )
        assert bob.get(f"/api/corpus/characters/{only_alice['id']}").status_code == 404
        rows = bob.get(f"/api/corpus/characters/{shared['id']}/sentences").json()[
            "items"
        ]
        assert len(rows) == 1 and rows[0]["raw_text"] == "我去學校。"
        rows = bob.get(f"/api/corpus/segments/{segment['id']}/sentences").json()[
            "items"
        ]
        assert all(row["story_id"] == own["story_id"] for row in rows)
        assert (
            bob.get(
                "/api/corpus/characters", params={"story_id": alice["story_id"]}
            ).status_code
            == 404
        )
        segments = bob.get(
            f"/api/corpus/characters/{shared['id']}/segments?include_sentence_counts=true"
        ).json()["items"]
        assert all(
            row["sentence_count"] == 1 and row["occurrence_count"] == 1
            for row in segments
        )
    assert client.get("/api/corpus/stories/" + own["story_id"]).status_code == 404


def test_upload_resume_queue_and_status_are_owned(client):
    identifier = upload(client, "學校。".encode())
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        assert bob.get("/api/corpus/uploads/" + identifier).status_code == 404
        assert bob.head("/api/corpus/uploads/" + identifier).status_code == 404
        assert (
            bob.patch(
                "/api/corpus/uploads/" + identifier,
                content=b"x",
                headers={
                    "Content-Type": "application/octet-stream",
                    "Upload-Offset": "0",
                },
            ).status_code
            == 404
        )
        assert (
            bob.post(
                "/api/corpus/imports",
                json={"upload_id": identifier, "title": "Not yours"},
            ).status_code
            == 404
        )
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/corpus/characters").status_code == 401
        assert anonymous.get("/api/corpus/stories").status_code == 401
        assert (
            anonymous.post(
                "/api/corpus/uploads", json={"filename": "a.txt", "size": 1}
            ).status_code
            == 401
        )


def test_expired_tampered_revoked_and_disabled_credentials(client):
    with connect() as db:
        user = db.execute("SELECT id FROM auth.users WHERE username='owner'").fetchone()
        session = db.execute(
            "SELECT id FROM auth.sessions WHERE user_id=%s", (user["id"],)
        ).fetchone()
        expired = jwt.encode(
            {
                "sub": str(user["id"]),
                "sid": str(session["id"]),
                "iat": datetime.now(timezone.utc) - timedelta(hours=1),
                "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
                "iss": "learning-experiment",
                "aud": "corpus",
                "type": "access",
            },
            signing_key(db),
            algorithm="HS256",
        )
    assert (
        client.get(
            "/api/corpus/stories", headers={"Authorization": "Bearer " + expired}
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/corpus/stories", headers={"Authorization": "Bearer invalid"}
        ).status_code
        == 401
    )
    with connect() as db:
        db.execute("UPDATE auth.users SET is_active=false WHERE id=%s", (user["id"],))
    assert client.get("/api/corpus/stories").status_code == 401


def test_csrf_and_login_rate_limit(client):
    assert (
        client.post(
            "/api/auth/refresh", headers={"Origin": "https://evil.example"}
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/auth/logout", headers={"Sec-Fetch-Site": "cross-site"}
        ).status_code
        == 403
    )
    for _ in range(10):
        response = client.post(
            "/api/auth/login",
            json={"email": "missing@example.com", "password": "incorrect"},
        )
        assert response.status_code == 401
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "missing@example.com", "password": "incorrect"},
        ).status_code
        == 429
    )


def test_legacy_stories_are_quarantined_and_composite_owner_fk_enforced(client):
    story = imported(client, "私人的故事。")
    with connect() as db:
        db.execute(
            "UPDATE corpus.stories SET user_id=NULL WHERE id=%s", (story["story_id"],)
        )
        db.execute("UPDATE corpus.uploads SET user_id=NULL")
    assert client.get("/api/corpus/stories").json()["items"] == []
    assert client.get("/api/corpus/characters").json()["items"] == []
    assert (
        client.get("/api/corpus/stories/" + story["story_id"] + "/text").status_code
        == 404
    )
    with TestClient(app, base_url="https://testserver") as bob:
        user = account(bob)["user"]
        with connect() as db:
            owner = db.execute(
                "SELECT id FROM auth.users WHERE username='owner'"
            ).fetchone()["id"]
            upload_id = db.execute("SELECT id FROM corpus.uploads").fetchone()["id"]
            db.execute(
                "UPDATE corpus.uploads SET user_id=%s WHERE id=%s", (owner, upload_id)
            )
        import psycopg

        with pytest.raises(psycopg.errors.ForeignKeyViolation):
            with connect() as db:
                db.execute(
                    "UPDATE corpus.stories SET user_id=%s WHERE id=%s",
                    (user["id"], story["story_id"]),
                )


def test_user_distinct_counts_use_owned_union_and_parallel_requests_remain_isolated(
    client,
):
    from concurrent.futures import ThreadPoolExecutor

    first = imported(client, "學校。學校。")
    with TestClient(app, base_url="https://testserver") as bob:
        account(bob)
        second = imported(bob, "學校。")
        third = imported(bob, "學校。")
        row = bob.get("/api/corpus/characters?character=學").json()["items"][0]
        assert row["occurrence_count"] == 2
        assert row["distinct_segment_count"] == 1
        assert row["segment_occurrence_count"] == 2
        detail = bob.get(f"/api/corpus/characters/{row['id']}").json()
        assert detail["sentence_count"] == 2

        def check(index):
            http = client if index % 2 == 0 else bob
            expected = (
                {first["story_id"]}
                if index % 2 == 0
                else {second["story_id"], third["story_id"]}
            )
            actual = {
                story["id"] for story in http.get("/api/corpus/stories").json()["items"]
            }
            assert actual == expected

        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(check, range(16)))


def test_legacy_assignment_requires_explicit_operator_action_and_preserves_ids(
    client, monkeypatch
):
    from app.auth.claim_legacy import main as claim

    story = imported(client, "舊故事。")
    with connect() as db:
        upload_id = db.execute(
            "SELECT upload_id FROM corpus.stories WHERE id=%s", (story["story_id"],)
        ).fetchone()["upload_id"]
        db.execute(
            "UPDATE corpus.stories SET user_id=NULL WHERE id=%s", (story["story_id"],)
        )
        db.execute("UPDATE corpus.uploads SET user_id=NULL WHERE id=%s", (upload_id,))
    assert client.get("/api/corpus/stories").json()["items"] == []
    monkeypatch.setattr(
        "sys.argv",
        ["claim_legacy", "--email", "owner@example.com", "--upload-id", str(upload_id)],
    )
    claim()
    result = client.get("/api/corpus/stories/" + story["story_id"])
    assert result.status_code == 200
    assert result.json()["id"] == story["story_id"]
    claim()
    assert (
        client.get("/api/corpus/stories/" + story["story_id"] + "/text").text
        == "舊故事。"
    )
