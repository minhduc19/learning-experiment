# Accounts and private stories

The authentication feature follows the reference project's separation of routes,
request schemas, services/security utilities, and current-user dependencies. It
uses the existing Psycopg/PostgreSQL backend, Argon2id password hashes, short-lived
JWT access tokens, and rotating opaque refresh tokens stored as hashes in
PostgreSQL. No email delivery or Redis service is required for this first version.

## Browser flow

- `/register`: create an account using username, email, and a password of at least
  10 characters. Email and username uniqueness ignore case. New accounts have the
  `user` role.
- `/login`: log in with email and password.
- `/my-stories`: private story library, including queued/failed import statuses.
- `/my-stories/:storyId`: continuous reader with original/traditional/simplified
  writing-system selection and incremental loading.
- `/corpus-upload`, `/characters`, and character detail pages require login.

The shared header still shows Home. The private library includes Log out.
Access tokens stay in memory, never localStorage. A secure HTTP-only SameSite=Lax
refresh cookie restores a session after a reload. Logout revokes the session,
unmounts private pages, and clears the current account's upload resume metadata.
Other private requests carry the access token, including binary upload chunks.
The browser proactively refreshes access tokens and retries one expired-token
request; upload resume metadata is scoped by account ID.

## HTTPS and configuration

**Production login requires a browser-facing HTTPS endpoint.** Refresh cookies
have `Secure=true` by default. Configure your TLS reverse proxy before relying on
persistent browser sessions. The existing HTTP-only Compose listener is an
upstream for that proxy, not TLS termination itself.

Set `AUTH_PUBLIC_ORIGIN` to the exact browser-facing origin when terminating TLS
at a reverse proxy, for example `https://learning.example.com` (no trailing slash).
Keep `AUTH_COOKIE_SECURE=true` in production. Local tests may explicitly override
cookie security for loopback HTTP only; the integration browser checks use local
HTTPS and secure cookies instead.

`AUTH_JWT_SECRET` is optional and must contain at least 32 characters when set.
Otherwise a cryptographically random signing key is generated once and persisted
in `auth.settings`; it survives restarts/redeployments with the database volume.
Never publish that table or store signing keys in frontend configuration.
Changing the configured signing key invalidates existing access tokens.

The Nginx proxy preserves the browser Host header, including its port, for
same-origin checks. Cookie-authenticated refresh/logout requests reject foreign
Origin headers and cross-site browser writes. If `AUTH_PUBLIC_ORIGIN` is unset,
the backend compares Origin with its observed base URL.

## API

| Method and path | Purpose |
| --- | --- |
| `POST /api/auth/register` | Register `{email, username, password}` |
| `POST /api/auth/login` | Authenticate `{email, password}`; return access token/user and set refresh cookie |
| `POST /api/auth/refresh` | Rotate refresh cookie; return a new access token/user |
| `POST /api/auth/logout` | Revoke the current session and clear the refresh cookie |
| `GET /api/auth/me` | Return the authenticated public profile |

Corpus endpoints require `Authorization: Bearer <access_token>`. Swagger exposes
an HTTP bearer Authorize control. Access tokens expire after 15 minutes; refresh
sessions expire after 30 days. Revoked, expired, or disabled-user sessions cannot
access corpus resources. Password verification is concurrency-bounded, and
registration/login requests have PostgreSQL-backed five-minute rate limits.

`GET /api/corpus/stories` returns the current user's completed stories. Add
`include_pending=true` to include queued, processing, and failed imports, as the
library does. `GET /api/corpus/stories/{id}` returns owned story metadata. Existing
sentence and export endpoints remain source-ordered and preserve script variants.
All private corpus responses use `Cache-Control: private, no-store`.

## Ownership and shared vocabulary

Migration `003_users.sql` adds `auth.users`, `auth.sessions`, private signing-key
settings and login-attempt counters, and user ownership columns on uploads and
stories. The composite story/upload foreign key enforces matching ownership.

Characters, segments, and character-to-segment membership are shared definitions.
Sentence rows and occurrence rows belong to their source story; they are never
shared between owners. Even identical uploaded stories get separate story and
sentence records. Every resource lookup checks the current user, not a client-
supplied owner ID. Foreign-user IDs return 404.

Vocabulary listings, detail counts, associations, sentence searches, retries,
upload resume/status, and exports are scoped to owned stories. Ranking counts
aggregate existing per-story statistics; distinct segments count the union of
segment IDs across the owner's completed stories. Global corpus counters remain
internal and are not used for users' private rankings.

The older `/api/readings` JSON demo is separate from private corpus stories and
remains public. The private library reads corpus endpoints, not that shared demo.

## Existing anonymous data

Existing uploads/stories keep a NULL owner and are hidden from normal users.
Registration never claims them automatically. The worker can finish legacy jobs,
but their results remain quarantined until explicitly assigned. No existing text,
IDs, counts, script variants, or files are deleted by the ownership migration.

A server operator can assign unowned data to an existing account:

```sh
# From apps/backend, with the normal database environment exported:
uv run python -m app.auth.claim_legacy --email owner@example.com --upload-id UPLOAD_UUID
# Or deliberately assign ALL currently unowned uploads:
uv run python -m app.auth.claim_legacy --email owner@example.com --all
```

This command only claims NULL-owner records; it cannot transfer an already-owned
story. It updates uploads and stories in one transaction and preserves all IDs.
New API-created uploads always have an authenticated owner.

The Python upload script prompts for account credentials (`--email` optionally
supplies the email). Passwords are read using getpass, not command-line flags.
HTTPS refresh cookies support long uploads; loopback HTTP may require another
password prompt after an access token expires. `--upload-id` resumes an owned
upload using the existing protocol.
