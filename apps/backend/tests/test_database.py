import os
from contextlib import contextmanager
from unittest.mock import MagicMock

import psycopg
import pytest
from fastapi.testclient import TestClient

from app import main
from app.database import connect_database


def test_database_health_connected(monkeypatch):
    connection = MagicMock()

    @contextmanager
    def connect():
        yield connection

    monkeypatch.setattr(main, "connect_database", connect)
    response = TestClient(main.app).get("/api/health/db")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}
    connection.execute.assert_called_once_with("SELECT 1")


@pytest.mark.parametrize("error", [psycopg.OperationalError, psycopg.errors.QueryCanceled])
def test_database_failure_returns_503_without_connection_details(monkeypatch, error):
    @contextmanager
    def unavailable():
        raise error("connection details must not be returned")
        yield

    monkeypatch.setattr(main, "connect_database", unavailable)
    client = TestClient(main.app)
    response = client.get("/api/health/db")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable", "database": "unavailable"}
    assert client.get("/api/health").json() == {"status": "ok"}


@pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="Set TEST_DATABASE_URL for PostgreSQL integration")
def test_postgres_connection_and_api_readiness(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", os.environ["TEST_DATABASE_URL"])
    with connect_database() as connection:
        assert connection.execute("SELECT 1").fetchone() == (1,)
        assert connection.execute("SHOW statement_timeout").fetchone() == ("3s",)
    assert connection.closed
    response = TestClient(main.app).get("/api/health/db")
    assert response.status_code == 200
    assert response.json()["database"] == "connected"
