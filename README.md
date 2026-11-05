# learning-experiment

FastAPI + Vue monorepo

- `apps/backend`: FastAPI, Python 3.12+, uv, pytest
- `apps/frontend`: Vue 3, JavaScript, Vite, npm workspace
- `.github/workflows/ci.yml`: backend test and frontend production build

## Development

Install Node.js 24 LTS and [uv](https://docs.astral.sh/uv/getting-started/installation/), then from the repository root:

```sh
cp .env.example .env
docker compose up -d db
npm run setup
npm run dev
```

Open http://localhost:5173. FastAPI serves http://localhost:8000 and interactive API docs at http://localhost:8000/docs. Both servers reload on changes. Ctrl+C stops both.

The frontend calls relative `/api` URLs. Vite proxies these to FastAPI during development, so no CORS configuration is needed. Production hosting must route `/api` to FastAPI and serve `apps/frontend/dist` as static files; Vite's dev proxy is not part of the production build.

## PostgreSQL

PostgreSQL 17 runs as the Compose `db` service. For local development, copy
`.env.example` to `.env`, start `docker compose up -d db`, then run `npm run dev`.
The backend's Uvicorn development command loads `.env`. The database is exposed
only on localhost (port 5432 by default). Change `PGPORT` in `.env` if needed.

The backend uses Psycopg 3. Use `app.database.connect_database()` as a context
manager for SQL operations; it commits on success, rolls back on exceptions, and
closes the connection. Configure connections with `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, and `PGDATABASE`, or supply `DATABASE_URL` for an external database.
When running Uvicorn directly, supply these environment variables yourself or
use `--env-file .env`.

- `/api/health`: application liveness, independent of the database.
- `/api/health/db`: executes `SELECT 1`; returns 200 when connected or 503 when
  unavailable, without exposing connection details.

The full Compose stack supplies database connection variables automatically and
waits for PostgreSQL readiness before starting the backend. It uses a named
`postgres_data` volume, so `docker compose down` preserves data. Avoid adding
`--volumes` unless you intend to erase the local database. PostgreSQL initialization
credentials apply only when the volume is first created. Development credentials
in the example are for local use; configure deployment credentials separately.

CI runs database integration tests against PostgreSQL. Run `npm test` for the unit tests. To include the integration test, set
`TEST_DATABASE_URL` to a reachable PostgreSQL URL before running `npm test`.
Application data models and schema migrations can be added when the storage
requirements are defined.

## Idea pages

The shared header shows only Home. The home page links to `/ideas`, a directory
of every titled route and its aliases, generated from the router configuration.
The not-found wildcard is not a navigable page and is omitted.

The frontend uses Vue Router with browser history and lazy-loaded pages:

- `/ideas`: links to all pages and route aliases
- `/`: the original home page and backend connection check
- `/multiple-choice`: interactive three-question quiz in
  `apps/frontend/src/views/IdeaOneView.vue`. Edit `src/data/questions.js` to add
  questions, option-specific feedback, and Spanish translations. Use `[[blank]]`
  in each sentence; the selected option’s `fill` text replaces the marker immediately (a lowercase
  `label` is used if `fill` is omitted). Students can change their selection,
  then press Check to see feedback.
- `/ideas/two`: `apps/frontend/src/views/IdeaTwoView.vue`
- Unknown URLs show a page with a link back home.

Build each idea in its own view component. To add another idea, create a `.vue`
file in `apps/frontend/src/views/` and add a route in
`apps/frontend/src/router/index.js` with a unique `path`, `name`, lazy-loaded
`component`, and `meta.title`. Routes with a title appear in the Ideas directory
automatically. For example:

```js
{
  path: '/ideas/three',
  name: 'idea-three',
  component: () => import('../views/IdeaThreeView.vue'),
  meta: { title: 'Idea three' },
},
```

Vite and the included Nginx configuration support opening and refreshing nested
URLs directly. On other production hosts, configure a fallback to `index.html`
for frontend routes while keeping `/api` routed to FastAPI.

## Strict quiz

`/multiple-choice-strict-quiz` is a full-screen, seven-question quiz. Selections can change until Check
locks and submits the answer once and Continue advances after either
result. Five hearts start green (4–5 remaining), become amber (2–3), then red
(1). Each incorrect submission greys one heart. The fifth mistake ends the
attempt after its feedback. Results show correct, incorrect, and any unanswered
questions, with a Redo quiz button that resets scores, hearts, and progress.
Edit `src/data/strictQuestions.js` to change this quiz's question set.

The practice route keeps its retry behavior. Both modes share
`src/components/MultipleChoiceActivity.vue` and the activity CSS.

## Mandarin reading

`/reading-app` displays three sentence blocks from `apps/frontend/src/data/reading.json`.
Each block has a full English translation and an ordered `segments` array. Segments
contain `id`, `text`, `pinyin`, and optional `details` (`translation`, `partOfSpeech`,
`note`). Punctuation segments have no details and are not interactive. Mandarin
sentence text is derived from the segments rather than stored twice.

Pinyin appears above phrases using HTML ruby. Click or tap a phrase (or use Tab
and Enter) to open its detailed meaning. Close with Escape, the close button, or
by clicking outside. Reading UI styles live in `src/styles/reading.css` and load
through the shared stylesheet entry point.

## Shared styles

`apps/frontend/src/main.js` imports `src/styles/main.css` once, making the CSS
available in every view and component without additional imports.

- `tokens.css`: CSS custom properties for colors, typography, spacing, and sizing.
- `activities.css`: reusable activity progress bars, prompts, answer cards, feedback
  dialogs, and completion screens.
- `base.css`: project-wide defaults for elements and keyboard focus.
- `components.css`: reusable `.page`, `.button`, `.site-nav`, `.stack`, and
  `.cluster` classes. Layouts are opt-in so new ideas can use their own structure.

Use the shared classes in any Vue template:

```vue
<template>
  <main class="page">
    <h1>My idea</h1>
    <div class="cluster">
      <button class="button">Try it</button>
      <a href="/multiple-choice">Explore</a>
    </div>
  </main>
</template>
```

Change tokens to update the whole project's theme. For component-specific rules,
use `<style scoped>` and reference tokens such as `var(--space-3)` and
`var(--color-primary)`. Add reusable patterns to `components.css`.

### Reusing the activity design

The activity stylesheet loads globally through `main.css`. Wrap an activity in
`.activity` and reuse its classes; no CSS import or copied style block is needed:

```vue
<template>
  <main class="page activity">
    <progress class="activity-progress" :value="1" :max="3" aria-label="Questions completed" />
    <h1 class="activity-title">Choose the right word</h1>
    <p class="activity-sentence">A new activity prompt</p>
    <div class="activity-options">
      <button class="activity-option">An answer</button>
    </div>
    <button class="button activity-action">Continue</button>
  </main>
</template>
```

Use `.activity-feedback` on a feedback section with an accessible heading. Add
`.is-correct` for success feedback. Its contents can use `.activity-feedback-icon`,
`.activity-translation`, and `.button.activity-action`. The panel grows with its
content below the sentence; long feedback uses normal page scrolling instead of
an internal scrollbar. Move keyboard focus to its heading when feedback appears.
After Check, `.activity-answer.is-correct` and `.activity-answer.is-incorrect`
highlight the filled word with distinct colors and a matching result icon.
Use `.activity-finish` for completion screens, `.activity-topline` for a progress
header, and `.activity-hint` or `.activity-footer` for supporting text.

Routes with `meta.fullscreen: true` hide the site navigation. Use
`.activity.activity-screen` for a viewport-sized lesson with a pinned Check button.
The question area can scroll on unusually small screens or with enlarged text.

Each activity can override `--activity-accent`, `--activity-progress-color`, and
`--activity-border-color` on its `.activity` wrapper. Shared changes belong in
`activities.css`; only unique layout or behavior belongs in the activity component.

## Checks

```sh
npm test
npm run build
```

Commit `package-lock.json` and `apps/backend/uv.lock` for reproducible installs. After changing dependencies, run `npm install` or `uv lock --project apps/backend` as appropriate. Do not commit secrets or virtual environments.

## Docker

With Docker Engine and the Compose plugin installed, run from the repository root:

```sh
docker compose up --build -d
```

Open http://localhost:8080. Nginx serves the built Vue app and proxies `/api/` to the backend container. API docs remain available at http://localhost:8000/docs (the backend port is bound to localhost). The frontend port 8080 is exposed on all host interfaces.

```sh
docker compose logs -f
docker compose down
```

These containers run the built application without development reload. Rebuild after source changes. Dependencies are installed from the npm and uv lockfiles; the backend runs as a non-root user and Compose waits for its health check before starting the frontend. No local Node.js, Python, or uv installation is needed.

### Reading checkpoints

Reading blocks support `type: "sentence"` and `type: "Multiple-choice"`.
A Multiple-choice block contains `id`, `type`, and a `question` object using the
same fields as the quiz data: `id`, `instruction`, `sentence` with `[[blank]]`,
`answer` (the correct option ID), `translation`, and `options` with `id`, `label`,
optional `fill`, and `feedback`.

Only content through the first unanswered checkpoint is rendered. Wrong answers
show feedback and Try again; students can change their selection before Check.
A correct Check reveals the next sentences through the next unanswered checkpoint.
Earlier reading remains visible, and correctly answered checkpoints keep their
completed sentence, locked options, and feedback. They have no Continue button
and are never replaced with an unlocked message. The included passage has two checkpoints. Progress resets on reload.
The embedded checkpoints share `MultipleChoiceActivity.vue` with the existing
practice and strict quiz routes.

### Passing activity text sizes

`MultipleChoiceActivity` accepts optional numeric `textSize` and `translationSize`
props in pixels. `textSize` sizes the question sentence and answer options;
`translationSize` sizes hints, the feedback translation, and explanation text.
Omit either prop to keep the standalone activity's existing defaults.

```vue
<MultipleChoiceActivity
  embedded
  :items="[block.question]"
  :text-size="languageSize"
  :translation-size="translationSize"
  translation-label="English translation"
  @passed="unlock(block.id)"
/>
```

The reading app passes its live text-size settings, so updates also apply to
existing checkpoints and newly revealed checkpoints without resetting answers.

In the reading app, checkpoints use `:show-instructions="false"` to omit the
activity title and instruction hint. The component defaults to showing these
instructions on standalone quiz routes. Reading sentences, embedded question
sentences, and options use the same font family, live language-size setting,
and light font weight. Feedback and translations follow the translation size.
Question sections retain an accessible label when the visible heading is hidden.

The reading settings modal includes **Only display reading content**. When enabled,
correctly answered quizzes are hidden, while the current unanswered quiz stays
visible so it can unlock later content. Turning the option off restores completed
quizzes with their answers and feedback intact. New correct answers are hidden
automatically while the option is enabled. This setting lasts for the current page
session, like the other reading settings.
