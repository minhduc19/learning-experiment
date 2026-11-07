CREATE TABLE corpus.ai_prompt_libraries (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 selected_id uuid
);
CREATE TABLE corpus.ai_system_prompts (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200),
 content text NOT NULL CHECK(length(btrim(content)) BETWEEN 1 AND 50000),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_system_prompts_owner ON corpus.ai_system_prompts(user_id,created_at,id);
ALTER TABLE corpus.ai_prompt_libraries ADD CONSTRAINT ai_selected_prompt
 FOREIGN KEY (selected_id) REFERENCES corpus.ai_system_prompts(id) ON DELETE SET NULL;
