# Booking management

Ported from `minhduc19/booking-management` (see `app/booking/SOURCE.md`). The existing learning application and its PostgreSQL configuration are preserved. Booking data lives in its own SQLite file.

Open `/private-booking-management` for the Vue directory. All six original screens are available at their original `/index-*` routes: checkout, bookings, cleaner, listing-metadata, upload and documents. All six screens use native Vue templates, reactive state and fetch requests, with no iframes or jQuery dependencies. The original HTML endpoints remain available for API compatibility. `/booking-database` adds a database download/restore UI. The directory name does not enforce authentication; booking endpoints retain the reference application's access behavior.

## Storage

The default file is `apps/backend/data/booking/app.db`, resolved relative to the installed backend, independent of the server working directory. Set `BOOKING_SQLITE_PATH` to an absolute path to use an existing booking database. This variable is deliberately separate from the existing application's database settings. Existing booking files are validated on startup, never seeded, reset or silently migrated. Older incompatible schemas fail validation; migrate a copy before using it.

Docker Compose stores `/app/data/booking/app.db` in the named `booking_data` volume. Ordinary server/container restarts and rebuilds preserve it. Keep that volume when recreating the stack; `docker compose down -v` removes named volumes and their data. Existing SQLite files outside the workspace were not available for inspection and are not automatically imported.

`POST /database/upload` (also `/api/booking/database/upload`) accepts multipart field `file`, with a 256 MiB limit. It validates SQLite integrity and required tables/columns before modifying anything, saves a timestamped `app.db.backup-*` beside the active file, then atomically replaces it. Requests across server workers coordinate using a lock file; connections are not pooled across replacement. `GET /database/download` returns a consistent SQLite snapshot, including committed WAL data. Backups are retained until an operator removes them.

## API compatibility

All original endpoints remain available, with identical methods and request/response schemas. Every endpoint also has an `/api/booking` alias that appears in `/api/docs`:

| Resource | Methods and paths (before alias prefix) |
| --- | --- |
| Bookings | GET/POST `/bookings/`; GET `/bookings/checkout/`; POST `/bookings/bulk-upload/`; GET/DELETE `/bookings/{confirmation_code}` |
| Cleaners | GET/POST `/cleaners/`; GET `/cleaners/{cleaner_id}`; GET `/cleaners/{cleaner_id}/sessions` |
| Cleaning sessions | GET/POST/DELETE `/cleaning-sessions/`; GET/PATCH/DELETE `/cleaning-sessions/{session_id}`; POST `/cleaning-sessions/{session_id}/add-booking/{confirmation_code}` |
| Listing metadata | GET/POST `/listing-metadata/`; GET/PATCH/DELETE `/listing-metadata/{metadata_id}` |
| Users | GET/POST `/users/`; GET/PATCH/DELETE `/users/{user_id}` |
| Database | GET `/database/download`; POST `/database/upload` |
| Documents | POST `/documents/merge-download` |
| Pages | GET `/index-checkout`, `/index-bookings`, `/index-cleaner`, `/index-listing-metadata`, `/index-upload`, `/index-documents`; original API root at GET `/api/booking/` |

Vite and production Nginx proxy both the legacy API paths and namespaced paths. Vue owns the public `/index-*` paths; compatibility HTML documents remain under `/api/booking/index-*`.

## Validation

Run `PYTHONPATH=apps/backend apps/backend/.venv/bin/python -m pytest apps/backend/tests/booking -q` with `BOOKING_SQLITE_PATH` pointing to a disposable path. The imported reference tests use an isolated in-memory database. Storage tests run separate processes with temporary SQLite files to verify process restart persistence, replacement, backup recovery, download and rejected uploads.
