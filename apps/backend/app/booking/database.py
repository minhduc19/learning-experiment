"""Booking storage is independent of the learning application's database."""
import fcntl
import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path

import anyio
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

# Absolute default: changing the working directory must never select another DB.
DB_PATH = Path(os.environ.get('BOOKING_SQLITE_PATH', Path(__file__).resolve().parents[2] / 'data/booking/app.db')).expanduser().resolve()
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine('sqlite:///' + str(DB_PATH), connect_args={'check_same_thread': False, 'timeout': 30}, poolclass=NullPool)
SessionLocal = sessionmaker(bind=engine, autoflush=False)

class Base(DeclarativeBase):
    pass

@asynccontextmanager
async def database_lock():
    # Separate lock file survives replacement; coordinates all server workers.
    with open(str(DB_PATH) + '.lock', 'a') as lock:
        await anyio.to_thread.run_sync(fcntl.flock, lock.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)

async def get_db():
    async with database_lock():
        with SessionLocal() as session:
            yield session

def validate_database(path):
    from app.booking.models import Base
    with sqlite3.connect(f'file:{path}?mode=ro', uri=True) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('SQLite integrity check failed')
        for table in Base.metadata.sorted_tables:
            columns = {row[1] for row in db.execute(f'PRAGMA table_info("{table.name}")')}
            missing = set(table.columns.keys()) - columns
            if missing:
                raise ValueError(f'Incompatible schema: {table.name} missing {", ".join(sorted(missing))}')

def initialize_database():
    from app.booking import models  # register all tables
    with open(str(DB_PATH) + '.lock', 'a') as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        if DB_PATH.exists():
            validate_database(DB_PATH)  # never silently migrate or seed existing data
        else:
            Base.metadata.create_all(engine)
