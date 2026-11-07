ALTER TABLE corpus.option_audio
 ADD COLUMN provider text NOT NULL DEFAULT 'elevenlabs' CHECK(provider IN ('piper','elevenlabs')),
 ADD COLUMN file_extension text NOT NULL DEFAULT 'mp3' CHECK(file_extension IN ('wav','mp3')),
 ADD COLUMN media_type text NOT NULL DEFAULT 'audio/mpeg' CHECK(media_type IN ('audio/wav','audio/mpeg'));
