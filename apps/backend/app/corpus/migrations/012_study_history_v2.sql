CREATE TABLE corpus.study_history_v2 (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 data jsonb NOT NULL
);
CREATE INDEX study_history_v2_owner ON corpus.study_history_v2(user_id,created_at DESC,id DESC);
