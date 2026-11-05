# learning-experiment

FastAPI + Vue monorepo

- `apps/backend`: FastAPI, Python 3.12+, uv, pytest
- `apps/frontend`: Vue 3, JavaScript, Vite, npm workspace
- `.github/workflows/ci.yml`: backend test and frontend production build

## Development

Install Node.js 24 LTS and [uv](https://docs.astral.sh/uv/getting-started/installation/), then from the repository root:

```sh
npm run setup
npm run dev
```

Open http://localhost:5173. FastAPI serves http://localhost:8000 and interactive API docs at http://localhost:8000/docs. Both servers reload on changes. Ctrl+C stops both.

The frontend calls relative `/api` URLs. Vite proxies these to FastAPI during development, so no CORS configuration is needed. Production hosting must route `/api` to FastAPI and serve `apps/frontend/dist` as static files; Vite's dev proxy is not part of the production build.

## Idea pages

The frontend uses Vue Router with browser history and lazy-loaded pages:

- `/`: the original home page and backend connection check
- `/multiple-choice` (also `/ideas/one`): interactive three-question quiz in
  `apps/frontend/src/views/IdeaOneView.vue`. Edit `src/data/questions.js` to add
  questions, option-specific feedback, and Spanish translations.
- `/ideas/two`: `apps/frontend/src/views/IdeaTwoView.vue`
- Unknown URLs show a page with a link back home.

Build each idea in its own view component. To add another idea, create a `.vue`
file in `apps/frontend/src/views/` and add a route in
`apps/frontend/src/router/index.js` with a unique `path`, `name`, lazy-loaded
`component`, and `meta.title`. Routes with a title appear in the navigation
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

## Shared styles

`apps/frontend/src/main.js` imports `src/styles/main.css` once, making the CSS
available in every view and component without additional imports.

- `tokens.css`: CSS custom properties for colors, typography, spacing, and sizing.
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
      <a href="/ideas/one">Explore</a>
    </div>
  </main>
</template>
```

Change tokens to update the whole project's theme. For component-specific rules,
use `<style scoped>` and reference tokens such as `var(--space-3)` and
`var(--color-primary)`. Add reusable patterns to `components.css`.

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
