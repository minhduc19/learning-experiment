-- Keep all original columns, identifiers, offsets and occurrence relationships.
-- Nullable additions make schema changes independent of corpus size. Existing
-- values are filled by the worker's resumable background backfill.
ALTER TABLE corpus.characters ADD COLUMN traditional_value text;
ALTER TABLE corpus.characters ADD COLUMN simplified_value text;
ALTER TABLE corpus.segments ADD COLUMN traditional_text text;
ALTER TABLE corpus.segments ADD COLUMN simplified_text text;
ALTER TABLE corpus.sentences ADD COLUMN traditional_text text;
ALTER TABLE corpus.sentences ADD COLUMN simplified_text text;
ALTER TABLE corpus.stories ADD COLUMN conversion_version text;

CREATE TABLE corpus.script_backfill_progress (
    singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
    conversion_version text NOT NULL,
    entity text NOT NULL DEFAULT 'characters' CHECK(entity IN ('characters','segments','sentences')),
    last_id bigint NOT NULL DEFAULT 0 CHECK(last_id >= 0),
    completed boolean NOT NULL DEFAULT false
);
