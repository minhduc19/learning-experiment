CREATE SCHEMA auth;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY, email varchar(320) NOT NULL, username varchar(50) NOT NULL,
 password_hash text NOT NULL, role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 is_active boolean NOT NULL DEFAULT true, email_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON auth.users(lower(email));
CREATE UNIQUE INDEX users_username_unique ON auth.users(lower(username));
CREATE TABLE auth.sessions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id),
 refresh_token_hash text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 refreshed_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz
);
CREATE INDEX sessions_user ON auth.sessions(user_id);
-- Persist a generated signing key when AUTH_JWT_SECRET is not supplied.
CREATE TABLE auth.settings (name text PRIMARY KEY,value text NOT NULL);
ALTER TABLE corpus.uploads ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE corpus.uploads ADD CONSTRAINT uploads_id_owner UNIQUE(id,user_id);
ALTER TABLE corpus.stories ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE corpus.stories ADD CONSTRAINT stories_upload_owner FOREIGN KEY(upload_id,user_id) REFERENCES corpus.uploads(id,user_id);
CREATE INDEX uploads_owner_created ON corpus.uploads(user_id,created_at,id);
CREATE INDEX stories_owner_created ON corpus.stories(user_id,created_at,id);
-- Legacy NULL owners remain quarantined. All API-created uploads have an owner.
CREATE TABLE auth.login_throttles (
 key text PRIMARY KEY, attempts integer NOT NULL, started_at timestamptz NOT NULL DEFAULT now()
);
