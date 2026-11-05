# syntax=docker/dockerfile:1
FROM ghcr.io/astral-sh/uv:0.9.5 AS uv
FROM python:3.12-slim
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PATH="/app/.venv/bin:$PATH"
COPY apps/backend/pyproject.toml apps/backend/uv.lock ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    uv sync --locked --no-dev
COPY --chown=10001:10001 apps/backend/app ./app
RUN mkdir -p /app/data/readings && chown -R 10001:10001 /app/data
ENV READING_DATA_DIR=/app/data/readings
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=8s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health/db', timeout=7)"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
