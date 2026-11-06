CREATE TABLE corpus.study_history (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 learned_count integer NOT NULL,
 new_count integer NOT NULL,
 data jsonb NOT NULL
);
CREATE INDEX study_history_owner ON corpus.study_history(user_id,id DESC);
