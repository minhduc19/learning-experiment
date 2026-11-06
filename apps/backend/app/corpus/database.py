"""Separate timeouts from the short database health probe."""

import os
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row


@contextmanager
def connect(*, worker=False):
    timeout = 0 if worker else 120000
    with psycopg.connect(
        os.getenv("DATABASE_URL", ""),
        connect_timeout=5,
        options=f"-c statement_timeout={timeout}",
        row_factory=dict_row,
    ) as connection:
        yield connection
