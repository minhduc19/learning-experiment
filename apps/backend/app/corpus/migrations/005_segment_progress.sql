CREATE TABLE corpus.user_segment_progress (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    segment_id bigint NOT NULL REFERENCES corpus.segments(id) ON DELETE CASCADE,
    learned boolean NOT NULL DEFAULT false,
    learning boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, segment_id)
);
CREATE INDEX user_segment_progress_segment ON corpus.user_segment_progress(segment_id);
