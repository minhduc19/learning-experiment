import psycopg
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html

from app.db.connection import connect_database
from app.readings.routes import router as readings_router

app = FastAPI(title="Monorepo API")
app.include_router(readings_router, prefix="/api/readings", tags=["readings"])


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


@app.get("/api/openapi.json", include_in_schema=False)
def api_schema():
    return app.openapi()


@app.get("/api/docs", include_in_schema=False)
def api_documentation():
    return get_swagger_ui_html(openapi_url="/api/openapi.json", title="Monorepo API — Documentation")
