# AI exercise generator

Open `/AI-exercise-generator` (also linked from Study selection and Ideas).
The count controls, vocabulary selection, and private History share the existing
Study selection page. Choose counts and Generate vocabulary. The new page calls
POST `/api/corpus/study-selection` with `learned_count` and `new_count`; this
handler generates and saves a History snapshot once, using the same service as
POST `/api/corpus/study-history`. Existing GET study-selection remains read-only.

Vocabulary becomes an editable `user_prompt` with exactly these columns:

```text
Character|segment|sentence|sentence-id
```

Traditional Chinese is initially selected; Simplified Chinese is also available.
Changing scripts asks before replacing manual prompt edits. IDs are the stored
sentence-fragment IDs from the corpus, including excerpts. The formatter uses
popular segment examples for learned characters and containing segments for new
characters, deduplicates associations, and escapes literal pipes/backslashes and
line breaks. The prompt is reviewable before any AI request.

Send prompt sends the current user prompt and current system prompt to POST
`/api/ai/exercises`. Edit system prompt opens an accessible native modal with the
exact supplied default prompt and JSON example. Done or Escape closes it; edited
text remains the active system prompt. Restore default prompt resets it. Prompts
and generated drafts remain in memory rather than shared localStorage. Navigating
away from unsaved draft/prompt edits warns before discarding them.

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
then opens the saved lesson editor. No new database migration is needed.

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
