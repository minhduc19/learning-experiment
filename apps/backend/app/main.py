import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Monorepo API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# The Docker image supplies the built Vue app; local development uses Vite.
static_dir = os.environ.get("STATIC_DIR")
if static_dir and Path(static_dir).is_dir():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
