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

One root Dockerfile builds Vue and installs the FastAPI backend in a single image. FastAPI serves both the built frontend and API on port 8000. Docker is the only local prerequisite.

```sh
docker build -t learning-experiment .
docker run -d --name learning-experiment -p 8080:8000 learning-experiment
```

Open http://localhost:8080 and http://localhost:8080/docs for API documentation.

```sh
docker logs -f learning-experiment
docker stop learning-experiment
docker rm learning-experiment
```

The container runs as a non-root user and includes a health check. Rebuild and recreate the container after source changes. Compose and Nginx are no longer needed. Local development still uses `npm run dev` for hot reload.
