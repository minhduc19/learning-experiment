import os
import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from app.booking.database import DB_PATH, database_lock, engine, validate_database

router = APIRouter(prefix='/database', tags=['booking database'])
MAX_UPLOAD = 256 * 1024 * 1024

def snapshot(source, destination):
    with sqlite3.connect(str(source)) as src, sqlite3.connect(str(destination)) as dst:
        src.backup(dst)

@router.get('/download')
async def download_database_file():
    async with database_lock():
        fd, name = tempfile.mkstemp(suffix='.db', dir=DB_PATH.parent)
        os.close(fd)
        try:
            snapshot(DB_PATH, name)
        except Exception:
            Path(name).unlink(missing_ok=True)
            raise
    return FileResponse(name, filename=DB_PATH.name, media_type='application/x-sqlite3', background=BackgroundTask(Path(name).unlink, missing_ok=True))

@router.post('/upload')
async def upload_database_file(file: UploadFile = File(...)):
    fd, name = tempfile.mkstemp(suffix='.db', dir=DB_PATH.parent)
    candidate = Path(name)
    backup_name = None
    try:
        if not file.filename or not file.filename.lower().endswith(('.db', '.sqlite', '.sqlite3')):
            raise HTTPException(400, 'Select a .db, .sqlite or .sqlite3 file')
        size = 0
        with os.fdopen(fd, 'wb') as out:
            fd = None
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD:
                    raise HTTPException(413, 'Database upload exceeds 256 MiB')
                out.write(chunk)
            out.flush()
            os.fsync(out.fileno())
        if not size:
            raise HTTPException(400, 'Uploaded file is empty')
        try:
            validate_database(candidate)
        except (sqlite3.Error, ValueError) as exc:
            raise HTTPException(400, f'Invalid booking database: {exc}') from exc
        async with database_lock():
            engine.dispose()
            backup = DB_PATH.with_name(DB_PATH.name + '.backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
            snapshot(DB_PATH, backup)
            backup_name = backup.name
            # Close/checkpoint WAL before swapping so old sidecars cannot affect the replacement.
            with sqlite3.connect(str(DB_PATH)) as db:
                db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
                db.execute('PRAGMA journal_mode=DELETE')
            os.replace(candidate, DB_PATH)
        return {'message': f'Database replaced successfully with {DB_PATH.name}', 'backup': backup_name}
    finally:
        if fd is not None:
            os.close(fd)
        candidate.unlink(missing_ok=True)
        await file.close()
