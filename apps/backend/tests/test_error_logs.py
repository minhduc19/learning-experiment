import logging

import psycopg
from app.auth import routes as auth_routes
from app.auth.dependencies import current_user
from app.corpus import routes
from app.main import app
from fastapi.testclient import TestClient


def test_corpus_database_failure_logs_cause_but_keeps_response_generic(
    monkeypatch, caplog
):
    def timeout(*args):
        raise psycopg.errors.QueryCanceled(
            "canceling statement due to statement timeout"
        )

    monkeypatch.setattr(routes.practice, "practice_sentences", timeout)
    app.dependency_overrides[current_user] = lambda: {"id": "test"}
    try:
        with (
            caplog.at_level(logging.ERROR, logger="uvicorn.error"),
            TestClient(app) as client,
        ):
            response = client.get(
                "/api/corpus/practice-sentences?limit=20",
                headers={"Authorization": "Bearer private-test-token"},
            )
        assert response.status_code == 503
        assert "statement timeout" not in response.text
        assert "sqlstate=57014" in caplog.text
        assert "canceling statement due to statement timeout" in caplog.text
        assert "/api/corpus/practice-sentences" in caplog.text
        assert "private-test-token" not in caplog.text
        assert "?limit=20" not in caplog.text
    finally:
        app.dependency_overrides.pop(current_user, None)


def test_global_database_handler_logs_cause_without_exposing_it(monkeypatch, caplog):
    def unavailable(*args):
        raise psycopg.OperationalError("test database connection failure")

    monkeypatch.setattr(auth_routes, "budget", unavailable)
    with (
        caplog.at_level(logging.ERROR, logger="uvicorn.error"),
        TestClient(app) as client,
    ):
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "private-test-password"},
        )
    assert response.status_code == 503
    assert response.json() == {"detail": "Database service unavailable"}
    assert "test database connection failure" in caplog.text
    assert "private-test-password" not in caplog.text
