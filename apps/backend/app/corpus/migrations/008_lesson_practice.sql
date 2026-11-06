ALTER TABLE corpus.user_character_progress ADD COLUMN practice bigint NOT NULL DEFAULT 0 CHECK(practice>=0);
ALTER TABLE corpus.user_segment_progress ADD COLUMN practice bigint NOT NULL DEFAULT 0 CHECK(practice>=0);
CREATE TABLE corpus.lesson_attempts (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 lesson_id uuid REFERENCES corpus.lessons(id) ON DELETE SET NULL,
 document jsonb NOT NULL,
 targets jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 result jsonb
);
CREATE INDEX lesson_attempt_owner ON corpus.lesson_attempts(user_id,id);
