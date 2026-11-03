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
