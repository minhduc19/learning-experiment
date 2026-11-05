import psycopg
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.database import connect_database

app = FastAPI(title="Monorepo API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health/db", responses={503: {"description": "Database unavailable"}})
def database_health():
    try:
        with connect_database() as connection:
            connection.execute("SELECT 1").fetchone()
    except psycopg.Error:
        # Keep connection details and credentials out of API responses.
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "unavailable"})
    return {"status": "ok", "database": "connected"}
