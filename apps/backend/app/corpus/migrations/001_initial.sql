CREATE TABLE corpus.uploads (
    id uuid PRIMARY KEY,
    filename text NOT NULL,
    size bigint NOT NULL CHECK (size > 0),
    offset_bytes bigint NOT NULL DEFAULT 0 CHECK (offset_bytes >= 0 AND offset_bytes <= size),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE corpus.stories (
    id uuid PRIMARY KEY,
    upload_id uuid UNIQUE NOT NULL REFERENCES corpus.uploads(id),
    title text NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
    encoding text NOT NULL DEFAULT 'utf-8',
    checksum text,
    segmentation_version text NOT NULL,
    byte_offset bigint NOT NULL DEFAULT 0,
    character_count bigint NOT NULL DEFAULT 0,
    fragment_count bigint NOT NULL DEFAULT 0,
    sentence_position bigint NOT NULL DEFAULT 0,
    part_position integer NOT NULL DEFAULT 0,
    pending_boundary boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE corpus.import_jobs (
    id uuid PRIMARY KEY,
    story_id uuid UNIQUE NOT NULL REFERENCES corpus.stories(id),
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
    error text,
    attempts integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX import_pending ON corpus.import_jobs(updated_at, id) WHERE status IN ('queued','processing');
CREATE TABLE corpus.sentences (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    story_id uuid NOT NULL REFERENCES corpus.stories(id),
    position bigint NOT NULL,
    sentence_position bigint NOT NULL,
    part_position integer NOT NULL,
    is_final boolean NOT NULL,
    raw_text text NOT NULL,
    start_offset bigint NOT NULL,
    end_offset bigint NOT NULL,
    UNIQUE(story_id, position),
    UNIQUE(story_id, sentence_position, part_position),
    CHECK (end_offset = start_offset + char_length(raw_text))
);
CREATE TABLE corpus.characters (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    value text UNIQUE NOT NULL CHECK(char_length(value) = 1),
    is_han boolean NOT NULL
);
CREATE TABLE corpus.segments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    text text UNIQUE NOT NULL CHECK(char_length(text) BETWEEN 1 AND 256),
    is_word boolean NOT NULL
);
CREATE TABLE corpus.segment_occurrences (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    segment_id bigint NOT NULL REFERENCES corpus.segments(id),
    sentence_id bigint NOT NULL REFERENCES corpus.sentences(id),
    position integer NOT NULL,
    start_offset integer NOT NULL,
    end_offset integer NOT NULL,
    UNIQUE(sentence_id, position)
);
CREATE INDEX segment_sentence ON corpus.segment_occurrences(segment_id, sentence_id);
CREATE TABLE corpus.character_occurrences (
    character_id bigint NOT NULL REFERENCES corpus.characters(id),
    segment_occurrence_id bigint NOT NULL REFERENCES corpus.segment_occurrences(id),
    position_in_segment integer NOT NULL,
    PRIMARY KEY(segment_occurrence_id, position_in_segment)
);
CREATE INDEX character_occurrence ON corpus.character_occurrences(character_id, segment_occurrence_id);
CREATE TABLE corpus.segment_characters (
    segment_id bigint NOT NULL REFERENCES corpus.segments(id),
    character_id bigint NOT NULL REFERENCES corpus.characters(id),
    count_in_segment integer NOT NULL CHECK(count_in_segment > 0),
    PRIMARY KEY(character_id, segment_id)
);
CREATE INDEX segment_character ON corpus.segment_characters(segment_id, character_id);
CREATE TABLE corpus.story_character_stats (
    story_id uuid NOT NULL REFERENCES corpus.stories(id),
    character_id bigint NOT NULL REFERENCES corpus.characters(id),
    occurrence_count bigint NOT NULL,
    PRIMARY KEY(story_id, character_id)
);
CREATE INDEX story_character_rank ON corpus.story_character_stats(story_id, occurrence_count DESC, character_id);
CREATE INDEX character_story ON corpus.story_character_stats(character_id, story_id);
CREATE TABLE corpus.story_segment_stats (
    story_id uuid NOT NULL REFERENCES corpus.stories(id),
    segment_id bigint NOT NULL REFERENCES corpus.segments(id),
    occurrence_count bigint NOT NULL,
    PRIMARY KEY(story_id, segment_id)
);
CREATE INDEX segment_story ON corpus.story_segment_stats(segment_id, story_id);
ALTER TABLE corpus.story_character_stats ADD COLUMN distinct_segment_count bigint NOT NULL DEFAULT 0;
ALTER TABLE corpus.story_character_stats ADD COLUMN segment_occurrence_count bigint NOT NULL DEFAULT 0;
CREATE INDEX story_character_segment_rank ON corpus.story_character_stats(story_id,distinct_segment_count DESC,character_id);
CREATE TABLE corpus.published_segments (segment_id bigint PRIMARY KEY REFERENCES corpus.segments(id));
CREATE TABLE corpus.character_stats (
    character_id bigint PRIMARY KEY REFERENCES corpus.characters(id),
    occurrence_count bigint NOT NULL,
    distinct_segment_count bigint NOT NULL,
    segment_occurrence_count bigint NOT NULL
);
CREATE INDEX character_frequency_rank ON corpus.character_stats(occurrence_count DESC,character_id);
CREATE INDEX character_diversity_rank ON corpus.character_stats(distinct_segment_count DESC,character_id);
