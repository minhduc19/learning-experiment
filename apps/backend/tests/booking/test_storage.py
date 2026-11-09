"""Use child processes and temporary storage: never touch the real booking DB."""
import os
from pathlib import Path
import subprocess
import sys

BACKEND = Path(__file__).resolve().parents[2]

def run(tmp_path, code):
    env = {**os.environ, 'BOOKING_SQLITE_PATH': str(tmp_path / 'booking.db'), 'PYTHONPATH': str(BACKEND), 'BOOKING_ENDPOINT_MANIFEST': str(Path(__file__).with_name('endpoint_manifest.json'))}
    subprocess.run([sys.executable, '-c', 'from fastapi.testclient import TestClient\nfrom app.main import app\nclient = TestClient(app)\n' + code], env=env, check=True, timeout=40)

def test_survives_process_restart_and_different_working_directory(tmp_path, monkeypatch):
    run(tmp_path, "assert client.post('/api/booking/cleaners/', json={'name':'Persistent cleaner'}).status_code == 200")
    monkeypatch.chdir(tmp_path)
    run(tmp_path, "assert client.get('/api/booking/cleaners/').json()[0]['name'] == 'Persistent cleaner'")

def test_replacement_validation_backup_and_download(tmp_path):
    run(tmp_path, '''
from app.booking.database import DB_PATH
import hashlib
import sqlite3
client.post('/cleaners/', json={'name':'Original'})
before = hashlib.sha256(DB_PATH.read_bytes()).hexdigest()
for content in (b'', b'not sqlite'):
    response = client.post('/database/upload', files={'file':('broken.db', content)})
    assert response.status_code == 400
    assert hashlib.sha256(DB_PATH.read_bytes()).hexdigest() == before
# A valid SQLite file with an unrelated schema is also rejected.
unrelated = DB_PATH.parent / 'unrelated.db'
with sqlite3.connect(unrelated) as db:
    db.execute('CREATE TABLE unrelated (id INTEGER)')
assert client.post('/database/upload', files={'file':('unrelated.db', unrelated.read_bytes())}).status_code == 400
assert hashlib.sha256(DB_PATH.read_bytes()).hexdigest() == before
snapshot = client.get('/api/booking/database/download')
assert snapshot.content.startswith(b'SQLite format 3')
client.post('/cleaners/', json={'name':'Added later'})
response = client.post('/api/booking/database/upload', files={'file':('restore.db', snapshot.content)})
assert response.status_code == 200, response.text
assert [c['name'] for c in client.get('/cleaners/').json()] == ['Original']
with sqlite3.connect(DB_PATH.parent / response.json()['backup']) as backup:
    assert backup.execute('SELECT count(*) FROM cleaners').fetchone()[0] == 2
''')
    run(tmp_path, "assert [c['name'] for c in client.get('/cleaners/').json()] == ['Original']")

def test_pages_assets_and_api_parity(tmp_path):
    run(tmp_path, '''
from app.booking import router
for route in router.routes:
    if not hasattr(route, 'path') or route.path.startswith('/assets'):
        continue
    if route.path.startswith('/index-'):
        response = client.get('/api/booking' + route.path)
        assert response.status_code == 200
        assert '/api/booking/assets/workspace.css' in response.text
schema = client.get('/api/openapi.json').json()['paths']
import json
from pathlib import Path
manifest = json.loads(Path(__import__('os').environ['BOOKING_ENDPOINT_MANIFEST']).read_text())
for endpoint, methods in manifest.items():
    assert endpoint in schema, endpoint
    assert set(methods) == set(schema[endpoint]), endpoint
for path in ['/bookings/', '/bookings/checkout/', '/bookings/bulk-upload/', '/bookings/{confirmation_code}', '/cleaners/', '/cleaners/{cleaner_id}', '/cleaners/{cleaner_id}/sessions', '/cleaning-sessions/', '/cleaning-sessions/{session_id}', '/cleaning-sessions/{session_id}/add-booking/{confirmation_code}', '/listing-metadata/', '/listing-metadata/{metadata_id}', '/users/', '/users/{user_id}', '/database/download', '/database/upload', '/documents/merge-download']:
    assert '/api/booking' + path in schema, path
for asset in ['vendor/jquery.min.js', 'vendor/bootstrap.min.js', 'vendor/bootstrap.min.css', 'workspace.css']:
    assert client.get('/api/booking/assets/' + asset).status_code == 200
''')
