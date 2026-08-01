# Container for the LegalOS API (FastAPI). The Next.js frontend deploys
# separately to Vercel from web/ and is not built here.
#
# Works on any host that builds a Dockerfile — Railway, Render, Fly.io.
# Migrations are NOT run at container start: several hosts run more than one
# instance, and concurrent migrations against one database race each other.
# Run them once per deploy as a release step (see docs/deployment.md).

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# uv resolves from the committed uv.lock, so the deployed image gets the same
# versions that were tested locally.
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv

WORKDIR /app

# Dependencies first: this layer is cached until the lockfile changes, so
# ordinary code edits do not reinstall the whole dependency tree.
#
# --no-default-groups drops the `dev` and `ingest` groups. The API imports
# neither, and `ingest` drags in streamlit/datasets/pandas/pyarrow — most of
# the image's weight for code that never runs here.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-default-groups

COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts
RUN uv sync --frozen --no-default-groups

ENV PATH="/app/.venv/bin:$PATH"

# Uploaded documents. Bind a persistent volume here, or the files vanish on
# every redeploy — the database rows would then point at nothing.
ENV LEGALOS_DOCUMENT_ROOT=/data/documents
RUN mkdir -p /data/documents

# $PORT is assigned by the host at runtime; 8000 is only the local default.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn legalrag.api:app --host 0.0.0.0 --port ${PORT}"]
