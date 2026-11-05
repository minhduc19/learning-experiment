-- Learning and learned are independent: both true means revision.
CREATE TABLE corpus.user_character_progress (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_id bigint NOT NULL REFERENCES corpus.characters(id) ON DELETE CASCADE,
    learned boolean NOT NULL DEFAULT false,
    learning boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, character_id)
);
CREATE INDEX user_character_progress_character ON corpus.user_character_progress(character_id);
