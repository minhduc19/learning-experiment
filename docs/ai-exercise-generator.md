# AI exercise generator

Open `/AI-exercise-generator` (also linked from Study selection and Ideas).
The count controls, vocabulary selection, and private History share the existing
Study selection page. Choose counts and Generate vocabulary. The new page calls
POST `/api/corpus/study-selection` with `learned_count` and `new_count`; this
handler generates and saves a History snapshot once, using the same service as
POST `/api/corpus/study-history`. Existing GET study-selection remains read-only.

Vocabulary appears as editable rows with character, segment, sentence, and sentence ID
fields. Move up/down changes their order; Delete removes a row. The live text
preview below the editor shows the exact `user_prompt` with these columns:

```text
Character|segment|sentence|sentence-id
```

Traditional Chinese is initially selected; Simplified Chinese is also available.
Changing scripts asks before replacing manual prompt edits. IDs are the stored
sentence-fragment IDs from the corpus, including excerpts. The formatter uses
popular segment examples for learned characters and containing segments for new
characters, deduplicates associations, and escapes literal pipes/backslashes and
line breaks. The prompt is reviewable before any AI request.

The System prompts library is private to the signed-in account and persists in
PostgreSQL, including the chosen prompt. On first use it contains the original
prompt and JSON example titled **First multiple choice quiz**, selected for
sending. The default is seeded once, so deleting it (or the entire library) does
not recreate it on later visits.

Choose New system prompt to create a title and instructions, or Read/Edit/Delete
on an existing prompt. Read shows the saved text without changing the selection.
Use prompt changes the selection explicitly; both the selected card and the
library header show **Selected for sending**. Creating a prompt does not select
it. Editing the selected prompt updates the saved text used for sending. Deleting
the selected prompt clears the selection and requires another explicit choice.

Save or cancel pending system-prompt edits before sending. Unsaved vocabulary,
lesson, and system-prompt drafts warn before navigation; saved system prompts do
not. Failed saves preserve the editor. Revision checks reject stale edits or
deletions with HTTP 409, so another tab cannot silently overwrite saved changes.
Reload prompts refreshes the library while retaining the draft text for copying.

Authenticated library endpoints under `/api/ai/system-prompts` return
`{items, selected_id}` with saved prompt IDs, titles, content, revisions, and
timestamps:

- GET lists the library; POST creates a prompt with `{title, content}`.
- PUT `/{id}` updates `{title, content, revision}`.
- PUT `/{id}/select` selects an owned prompt.
- DELETE `/{id}?revision=N` deletes an owned prompt.

Titles accept 1–200 characters; instructions accept 1–50,000, with whitespace-only
values rejected. Every operation checks ownership and returns private, no-store
responses. Migration `009_system_prompts.sql` adds the library and prompt tables;
the normal deployment migration service applies it without changing corpus data.

Send prompt sends the live user prompt and the selected prompt's saved content
to POST `/api/ai/exercises`. Vocabulary edits and generated lesson drafts remain
in memory; saved prompt titles are for organization and are not appended to the
AI request.

The backend uses the official OpenAI Python SDK with
`base_url=https://api.deepseek.com`, `model=deepseek-flash`, two separate messages
(`system`, `user`), and `response_format={"type":"json_object"}`. Prompt text is
forwarded without appended instructions. Authentication is required. Only the
backend reads the DEEPSEEK environment variable; clients cannot submit a key.
There is no AI call on vocabulary generation, History retrieval, preview or save.

Generation allows a 110-second overall deadline, no automatic SDK retries, and
at most two concurrent provider calls per backend process. User prompts accept
up to 100,000 characters, system prompts 50,000, and the existing 1 MiB body limit
applies. Provider authentication/rate-limit/timeout failures return safe messages,
without reflecting provider bodies or credentials. Prompts and existing lesson
text remain available after failures. A partial or invalid AI response remains
editable with a warning, rather than discarding the paid response.

The response text populates the same LessonJsonWorkspace used by `/lessons/new`
and `/lessons/:id`. It validates JSON, shows the interactive lesson preview in
item order, and allows manual changes/formatting. Create lesson stays disabled
until the draft is valid. Only this explicit action POSTs to `/api/lessons` and
then opens the saved lesson editor.

## Option audio

After generating exercises, choose **Generate option audio** beside **Create lesson**.
This sends every option's visible `label` (including distractors) to ElevenLabs,
using voice `MI36FIkp9wRP7cpWKPTl`, model `eleven_multilingual_v2`, and MP3 output.
The sentence, fill text, and feedback are not spoken. Generation runs one unique
text at a time with progress; repeated option labels reuse a recording.

Successful options receive `audio_id` and `audio_text` in the editable lesson JSON.
The preview updates immediately: selecting an option plays its recording, and
**Replay audio** repeats it. Selecting another option stops previous playback.
Silent options and playback failures never prevent answering a question. The
same behavior works in saved lessons, strict quizzes, and embedded previews.

Partial failures preserve successful recordings. **Retry failed audio once**
only retries failed texts that still have one attempt available. There are no
automatic provider retries. The server persists a maximum of two provider
attempts per account/text/voice/model, including attempts interrupted by a server
restart. Refreshing or resubmitting cannot reset that limit. Existing successful
recordings are reused without another provider call. A pending request cannot be
started concurrently; after two minutes an interrupted request can be checked
again and, if needed, explicitly retried within the same two-attempt limit.

You can save a lesson with some options silent. Editing an option's label removes
outdated audio references during validation, so it never plays the old word.
Generate audio again for the new text. Audio references are checked against the
signed-in account and recorded text when saving a lesson.

Authenticated POST `/api/ai/option-audio` accepts `{text, retry:false}` (or
`retry:true` for the single explicit retry). It returns status, attempt count,
retry availability, and an `audio_id` on success. Authenticated GET
`/api/ai/option-audio/{audio_id}` serves the owned recording; playback fetches it
with authorization and uses a temporary browser blob URL. No public file URLs or
credentials are inserted into lesson JSON.

Migration `010_option_audio.sql` stores recording ownership, status, attempt
counts, and provider character-cost/request-id/trace-id headers when present.
Files are atomically written to `CORPUS_DATA_DIR/option-audio/{audio_id}.mp3`
(`/app/data/corpus/option-audio` in Compose), using the existing persistent
`corpus_data` volume. Include that directory and the database in backups.
Recordings remain available for reuse even if a draft is not saved or a lesson is
deleted. Generation is bounded to two requests per backend process, 2,000
characters per option, and 5 MiB per recording.

Configure the Actions secret **ELEVEN**. Deployment transfers it through encrypted
stdin to a private `learning-experiment.eleven` file beside the existing DeepSeek
secret file, then passes it only to the backend container. An absent secret leaves
quizzes and existing recordings usable, but disables new provider generation.
For manual Compose deployments, export `ELEVEN` from that private file alongside
`DEEPSEEK`; for local development use the ignored `.env`. Never use a VITE variable.
Tests mock the provider and do not spend ElevenLabs credits.

## GitHub Actions secret and deployment

Configure the repository's Actions secret named `DEEPSEEK` with the DeepSeek key.
The main-branch deployment passes it over encrypted SSH stdin, never CLI arguments
or logs, into `$HOME/github-actions/learning-experiment.deepseek` (mode 600),
outside the checkout. The file is atomically replaced on deployment, including
with an empty value if the Actions secret is absent. The deployment exports the
value for Docker Compose, which passes it only to the backend service, not the
frontend, worker, migration container, or image build. This does not alter the
server's existing `.env` or database credentials. Missing configuration leaves
other features working and gives an actionable error when Send prompt is used.

Docker restarts retain the configured container environment. For a manual Compose
rebuild outside the Actions deployment session, first load the stored key without
printing it:

```sh
export DEEPSEEK="$(cat "$HOME/github-actions/learning-experiment.deepseek")"
docker compose up -d --build --no-deps backend frontend
```

For local development, set DEEPSEEK in your ignored `.env` (the dev command loads
it) or process environment. Never put it in VITE variables, frontend source, or
committed files. Real provider access/model availability is verified by a live
request after deployment; automated checks use a mocked provider with the real
SDK and do not consume API credits.
