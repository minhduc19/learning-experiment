import logging

import psycopg
from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse

from app.auth.routes import router as auth_router
from app.corpus.routes import router as corpus_router
from app.db.connection import connect_database
from app.lessons.routes import router as lessons_router
from app.readings.routes import router as readings_router

app = FastAPI(title="Monorepo API")
app.include_router(lessons_router, prefix="/api/lessons", tags=["lessons"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(corpus_router, prefix="/api/corpus", tags=["corpus"])
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
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "database": "unavailable"},
        )
    return {"status": "ok", "database": "connected"}


@app.get("/api/openapi.json", include_in_schema=False)
def api_schema():
    return app.openapi()


@app.get("/api/docs", include_in_schema=False)
def api_documentation():
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json", title="Monorepo API — Documentation"
    )


@app.exception_handler(psycopg.Error)
async def database_unavailable(request, error):
    logging.getLogger("uvicorn.error").error(
        "Database failure: method=%s path=%s sqlstate=%s",
        request.method,
        request.url.path,
        error.sqlstate,
        exc_info=(type(error), error, error.__traceback__),
    )
    return JSONResponse(
        status_code=503, content={"detail": "Database service unavailable"}
    )
