CREATE TABLE corpus.option_audio (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 fingerprint text NOT NULL,
 text text NOT NULL,
 voice_id text NOT NULL,
 model_id text NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','ready','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 2),
 character_cost text,
 request_id text,
 trace_id text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,fingerprint)
);
