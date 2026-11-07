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
