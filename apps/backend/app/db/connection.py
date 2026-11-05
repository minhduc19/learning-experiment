"""PostgreSQL connections configured by DATABASE_URL or libpq PG* variables."""

import os
from collections.abc import Iterator
from contextlib import contextmanager

import psycopg


@contextmanager
def connect_database() -> Iterator[psycopg.Connection]:
    # Connections commit on success, roll back on error, and always close.
    with psycopg.connect(
        os.getenv("DATABASE_URL", ""),
        connect_timeout=3,
        options="-c statement_timeout=3000",
    ) as connection:
        yield connection
