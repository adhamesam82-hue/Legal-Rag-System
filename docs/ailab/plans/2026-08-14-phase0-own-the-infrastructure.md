# Phase 0 — Own the Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ailab:subagent-driven-development (recommended) or ailab:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move LegalOS off Vercel, Railway, and Neon onto one Hetzner box where `git push` deploys, backups are encrypted and offsite, and a restore has actually been performed.

**Architecture:** One Hetzner CX22 running four containers behind Caddy — Caddy terminates TLS and serves both services from the single origin `alsigil.com`, routing `/api/*` to FastAPI and everything else to Next.js, which removes CORS from production entirely. Images are built in GitHub Actions and pulled by the box, never built on it. Backups are nightly `pg_dump` plus the documents volume, encrypted client-side by restic and pushed to Cloudflare R2.

**Tech Stack:** Docker Compose, Caddy 2, pgvector/pgvector:pg16, FastAPI + uvicorn, Next.js 16 standalone, GitHub Actions, GHCR, restic, Cloudflare R2, Sentry, systemd timers.

**Spec:** `docs/ailab/specs/2026-08-14-phase0-own-the-infrastructure-design.md`

## Global Constraints

- Domain is `alsigil.com`. Box is Hetzner **CX22** (2 vCPU, 4 GB, 40 GB), **Ubuntu 24.04**, **Falkenstein**.
- **Single origin.** Caddy routes `/api/*` → `api:8000`, everything else → `web:3000`. No second subdomain, no second certificate.
- **Postgres is never published to the host** in production. Compose network only.
- Secrets live in `/opt/alsigil/.env`, owned `root:deploy`, mode `0640`, referenced by `env_file:`. Group read is required, not slack: Compose resolves `env_file:` client-side as the `deploy` user, so `0600` makes every compose command fail. The internet-facing `web` container gets a second, narrower file, `/opt/alsigil/web.env` (same ownership and mode), holding only the Clerk variables it reads. Never in git, never baked into an image.
- **Images are built in CI only.** Tagged `:<git-sha>` and `:latest`, pushed to GHCR. The box only ever runs `docker compose pull`.
- **Migrations run as a discrete step before `up -d`**, and must be backward-compatible with the currently-deployed code. Add columns; never rename or drop in the same deploy.
- Docker logging is `json-file` with `max-size: 10m`, `max-file: 3` on every service.
- `NEXT_PUBLIC_API_BASE` is inlined at **build** time. It must be passed as a Docker **build arg**, value `""`. A runtime env var has no effect.
- The restic repository password is stored **off the box** (password manager). A copy in `/opt/alsigil/.env` alone is not a backup.
- pgvector must be **≥ 0.7.0** on both source and target — `articles.embedding` is `halfvec(2048)` with an HNSW `halfvec_cosine_ops` index.
- **Not in Phase 0:** staging, Redis/worker, LUKS, the zero-retention LLM provider migration, log aggregation, rolling zero-downtime deploys, any feature-flag or route work.
- Python tests run with `uv run pytest`. Existing conventions: tests in `tests/`, `from __future__ import annotations`, DB tests skip via `connect_or_skip()` in `tests/conftest.py`.

---

## File Structure

**New deployment artefacts** (a new top-level `deploy/` directory keeps infrastructure out of application source):

| File | Responsibility |
| --- | --- |
| `deploy/docker-compose.prod.yml` | The four production services, volumes, log rotation |
| `deploy/Caddyfile` | TLS + single-origin routing + retry window |
| `deploy/provision.sh` | One-time idempotent box baseline: user, ufw, docker, `/opt/alsigil` |
| `deploy/backup.sh` | Nightly `pg_dump` + documents → restic → R2, then prune |
| `deploy/restore_check.sh` | Restore latest snapshot into a throwaway container and assert it works |
| `deploy/alsigil-backup.service`, `.timer` | systemd units driving `backup.sh` |
| `deploy/alsigil-diskalert.service`, `.timer` | systemd units driving the disk alert |
| `web/Dockerfile`, `web/.dockerignore` | The Next.js standalone image |
| `.github/workflows/build.yml` | Build + push both images to GHCR |
| `.github/workflows/deploy.yml` | Pull, migrate, swap, health-gate, auto-rollback |

**New scripts** (testable Python, alongside the existing `scripts/`):

| File | Responsibility |
| --- | --- |
| `scripts/smoke_check.py` | Post-deploy health gate: API health + frontend reachable |
| `scripts/cutover_verify.py` | Compare source/target row counts, prove vector search works |
| `scripts/disk_alert.py` | Disk usage threshold check, email via Resend |

**New tests:** `tests/test_deploy_config.py`, `tests/test_smoke_check.py`, `tests/test_cutover_verify.py`, `tests/test_disk_alert.py`.

**Modified:** `web/next.config.mjs` (standalone output), `web/lib/api.ts` (error message), `src/legalrag/api.py` (Sentry), `docs/deployment.md` (rewrite), `railway.json` (deleted).

---

## Task 1: Web container image

The Next.js app has never been containerised — it deployed to Vercel from source. This produces an image that serves the app on `:3000` with the API base baked in as empty, so every browser call is same-origin.

**Files:**
- Modify: `web/next.config.mjs`
- Modify: `web/lib/api.ts:198`
- Create: `web/Dockerfile`
- Create: `web/.dockerignore`
- Create: `tests/test_deploy_config.py`

**Interfaces:**
- Consumes: nothing.
- Produces: an image whose `CMD` is `node server.js` listening on `$PORT` (default 3000), built with build arg `NEXT_PUBLIC_API_BASE`. Task 2 references it as service `web`; Task 5 builds and pushes it.

**Context the implementer needs:**

`web/next.config.mjs` sets `NEXT_PUBLIC_API_BASE` through the `env:` block, which **inlines the value into the client bundle at build time**. `web/lib/api.ts:2` reads it with `?? "http://localhost:8000"`. Because `??` only falls back on `null`/`undefined`, an empty string survives — so `API_BASE=""` yields relative URLs like `/api/search`, which is exactly what the single origin needs. Every consumer of `API_BASE` is in a `"use client"` component (verified in `web/app/documents/page.tsx` and `web/app/documents/[id]/page.tsx`), so relative URLs are always resolved by a browser and never by Node.

`web/package.json` has a `prebuild` that runs `scripts/sync-landing.mjs`, which copies `../marketing` into `web/public/landing`. The Docker build context is `web/`, so `../marketing` will not exist — this is fine and intended: the script leaves the committed copy alone when the source is missing, and `web/public/landing` is committed (16 files). Do not try to widen the build context to fix this.

- [ ] **Step 1: Write the failing test**

Create `tests/test_deploy_config.py`:

```python
"""Assertions about deployment configuration files.

These are cheap regression tests for settings whose failure mode is silent:
a web image built without the API base arg looks healthy and is unusable, and
a production compose file that publishes 5432 exposes the database to the
internet without any error to signal it.
"""
from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def read(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def test_next_config_emits_standalone_output():
    """The Dockerfile copies .next/standalone, which only exists in this mode."""
    assert 'output: "standalone"' in read("web/next.config.mjs")


def test_web_dockerfile_declares_the_api_base_build_arg():
    """Inlined at build time, so a runtime env var would silently do nothing."""
    dockerfile = read("web/Dockerfile")
    assert "ARG NEXT_PUBLIC_API_BASE" in dockerfile
    assert "ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE" in dockerfile


def test_web_dockerignore_excludes_build_artefacts():
    """node_modules and .next from the host would poison the image."""
    ignored = read("web/.dockerignore").split()
    assert "node_modules" in ignored
    assert ".next" in ignored
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/test_deploy_config.py -v`

Expected: all three FAIL — the first on the assertion, the other two with `FileNotFoundError`.

- [ ] **Step 3: Add standalone output to the Next config**

In `web/next.config.mjs`, add the `output` key immediately after the opening of `nextConfig`, above `turbopack`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone: a self-contained server bundle with only the
  // node_modules it actually imports. The Docker image copies that instead of
  // the full dependency tree, which is the difference between a ~200 MB image
  // and a ~1 GB one on a box with 40 GB of disk.
  output: "standalone",
  // Pin the workspace root; an unrelated lockfile in the home directory would
  // otherwise be inferred as the root.
  turbopack: { root: here },
```

- [ ] **Step 4: Create `web/.dockerignore`**

```text
node_modules
.next
.env*.local
*.tsbuildinfo
shot*.mjs
shots-all.mjs
smoke.mjs
final.mjs
AGENTS.md
```

- [ ] **Step 5: Create `web/Dockerfile`**

```dockerfile
# The Next.js frontend. Built in CI and pulled by the box -- never built on the
# box, where `next build` would compete for RAM with the database it is being
# deployed alongside.
#
# Build context is web/, so `prebuild` (scripts/sync-landing.mjs) will not find
# ../marketing. That is intended: it leaves the committed web/public/landing
# copy in place and says so, rather than failing.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Inlined into the client bundle by the `env` block in next.config.mjs. Empty
# means "same origin", which is what Caddy serves. Passing this at runtime
# instead has no effect whatsoever -- the value is compiled in here.
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `uv run pytest tests/test_deploy_config.py -v`

Expected: 3 passed.

- [ ] **Step 7: Build the image and verify the API base is genuinely empty**

```bash
cd web
docker build --build-arg NEXT_PUBLIC_API_BASE="" -t alsigil-web:test .
docker run --rm alsigil-web:test grep -rl "localhost:8000" .next/static || echo "CLEAN"
```

Expected: `CLEAN`. If any file is listed, the build arg did not reach the build and the frontend would be broken in production while every health check passed.

- [ ] **Step 8: Verify the container serves**

```bash
docker run --rm -d -p 3001:3000 --name alsigil-web-test alsigil-web:test
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/
docker rm -f alsigil-web-test
```

Expected: `200` (the landing page, rewritten from `public/landing/index.html`).

- [ ] **Step 9: Fix the now-misleading error message**

`web/lib/api.ts:198` reads `"Could not reach the API. Is it running on " + API_BASE + "?"`. With a same-origin base that renders as "Is it running on ?". Replace that line's expression:

```typescript
      "Could not reach the API. Is it running on " +
        (API_BASE || window.location.origin) +
        "?",
```

- [ ] **Step 10: Commit**

```bash
git add web/Dockerfile web/.dockerignore web/next.config.mjs web/lib/api.ts tests/test_deploy_config.py
git commit -m "Put the frontend in a container that talks to its own origin"
```

---

## Task 2: Production compose and Caddyfile

**Files:**
- Create: `deploy/docker-compose.prod.yml`
- Create: `deploy/Caddyfile`
- Modify: `tests/test_deploy_config.py`

**Interfaces:**
- Consumes: the `web` image from Task 1; the existing root `Dockerfile` for `api`.
- Produces: services named `caddy`, `web`, `api`, `postgres`; volumes `pgdata`, `documents`, `caddy_data`, `caddy_config`. Image tags come from `${IMAGE_TAG:-latest}`, which Task 6 overrides to roll back.

**Context:** the existing root `docker-compose.yml` stays exactly as it is — it is the local development stack and it *should* publish `5432`. This is a separate file for production, which must not.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_deploy_config.py`:

```python
def test_production_compose_does_not_publish_postgres():
    """The dev compose publishes 5432 on purpose. Production must not: the box
    has a public IP, and a published port bypasses ufw's docker chain.

    Asserts the absence of the key rather than of the string "5432:5432",
    which would let two equally fatal forms straight through:
    `ports: ["5433:5432"]` publishes the database on another host port, and
    `ports: ["5432"]` publishes it on a random high port. Both are reachable
    from the internet.
    """
    import yaml

    compose = yaml.safe_load(read("deploy/docker-compose.prod.yml"))
    postgres = compose["services"]["postgres"]
    assert "ports" not in postgres, (
        f"postgres publishes ports to the host: {postgres.get('ports')!r} -- "
        "in production it must be reachable only over the compose network"
    )


def test_production_compose_rotates_logs_on_every_service():
    """Unrotated json-file logs grow without limit and fill the 40 GB disk,
    which takes Postgres down with it.

    Asserts the resolved structure rather than counting raw text: the file
    defines the options once as a YAML anchor and references it per service,
    so a text count would be testing the formatting rather than the effect.
    """
    import yaml

    compose = yaml.safe_load(read("deploy/docker-compose.prod.yml"))
    services = compose["services"]
    assert set(services) == {"caddy", "web", "api", "postgres"}
    for name, service in services.items():
        options = (service.get("logging") or {}).get("options") or {}
        assert options.get("max-size"), f"{name} has no log size limit"
        assert options.get("max-file"), f"{name} has no log file limit"


def test_production_compose_pins_image_tags_to_a_variable():
    """Rollback is `IMAGE_TAG=<old-sha> docker compose up -d`, which only works
    if the tag is a variable rather than hardcoded to latest.

    Counted, not merely searched for: as a bare substring check this would
    pass when only one of the two images used the variable, so hardcoding the
    api image would make rollback a silent no-op for the API while the web
    container rolled back correctly -- the worst of both states.
    """
    compose = read("deploy/docker-compose.prod.yml")
    assert compose.count("${IMAGE_TAG:-latest}") == 2, (
        "expected the tag variable on both the web and api images"
    )


def test_production_compose_requires_the_image_owner_variable():
    """GITHUB_REPOSITORY_OWNER has no default, unlike IMAGE_TAG. Compose
    interpolates unset variables as blank, so without the required-variable
    (`:?`) form both image references would silently degrade to
    `ghcr.io//alsigil-{web,api}:latest` -- not a valid image name -- instead
    of failing loudly. That matters because CI always exports the variable,
    but `deploy/backup.sh` runs `docker compose ... exec` nightly from a
    systemd timer with a bare environment, and so does anyone running compose
    by hand on the box (rollback, `restore_check.sh`, `docker compose logs`).
    """
    compose = read("deploy/docker-compose.prod.yml")
    assert "${GITHUB_REPOSITORY_OWNER:?" in compose
    assert compose.count("${GITHUB_REPOSITORY_OWNER:?") == 2, (
        "expected the required-variable form on both the web and api images"
    )


def test_caddyfile_routes_api_prefix_to_the_api_service():
    caddyfile = read("deploy/Caddyfile")
    assert "handle /api/*" in caddyfile
    assert "reverse_proxy api:8000" in caddyfile


def _caddyfile_directives() -> str:
    """The Caddyfile with comment lines removed.

    Necessary because the file documents `lb_try_duration` in a comment, so a
    plain substring assertion over the raw text stays green after both real
    directives are deleted -- the exact regression this test exists to catch.
    """
    return "\n".join(
        line
        for line in read("deploy/Caddyfile").splitlines()
        if not line.strip().startswith("#")
    )


def test_caddyfile_holds_requests_across_a_container_restart():
    """Without this, every deploy shows visitors a 502 for 5-15 seconds while
    the new API container boots.

    Checked per upstream: the API and the frontend are swapped by the same
    `up -d`, so a retry window on only one of them still means a visible 502
    for every page load, or for every API call, during the restart.
    """
    directives = _caddyfile_directives()
    assert "lb_try_duration" in directives, (
        "the retry window appears only in a comment, not in any "
        "reverse_proxy block"
    )

    for upstream in ("api:8000", "web:3000"):
        start = directives.index(f"reverse_proxy {upstream}")
        block = directives[start : directives.index("}", start)]
        assert "lb_try_duration" in block, (
            f"the reverse_proxy block for {upstream} has no retry window, so "
            "a deploy 502s that route while the container restarts"
        )


def test_web_service_does_not_receive_the_main_secrets_file():
    """`web` is the container the internet reaches first, and it reads exactly
    two variables, both Clerk's. Pointing it at /opt/alsigil/.env would hand
    Next.js POSTGRES_PASSWORD, DATABASE_URL, RESTIC_PASSWORD and the R2
    credentials -- including the keys to the backups that are supposed to
    survive a breach of this very machine. It gets its own narrower file.
    """
    import yaml

    compose = yaml.safe_load(read("deploy/docker-compose.prod.yml"))
    web_env_file = compose["services"]["web"].get("env_file")
    referenced = [web_env_file] if isinstance(web_env_file, str) else (web_env_file or [])

    assert referenced, "web must still receive its Clerk configuration"
    for entry in referenced:
        path = entry if isinstance(entry, str) else entry.get("path", "")
        assert path != "/opt/alsigil/.env", (
            "web must not be given the api's secrets file; it needs only the "
            "Clerk variables, which live in /opt/alsigil/web.env"
        )

    # The api genuinely does need the full file -- this test must not be
    # satisfiable by removing env_file from every service.
    assert compose["services"]["api"]["env_file"] == "/opt/alsigil/.env"


def test_postgres_healthcheck_expands_inside_the_container():
    """`${POSTGRES_USER:-legalrag}` with a single $ is interpolated by Compose
    on the client, from the *host* environment, where it is unset -- so the
    check silently hardcodes `legalrag` no matter what /opt/alsigil/.env says,
    and a renamed database user makes pg_isready report healthy while nothing
    can actually connect. `$$` passes it through for the container's shell.
    """
    compose_text = read("deploy/docker-compose.prod.yml")
    healthcheck_line = next(
        line for line in compose_text.splitlines() if "pg_isready" in line
    )
    for variable in ("POSTGRES_USER", "POSTGRES_DB"):
        assert f"$${{{variable}" in healthcheck_line, (
            f"{variable} in the healthcheck must be escaped as $$ so the "
            "container's shell expands it, not the Compose client"
        )


def test_caddyfile_sends_hsts():
    """Without it, a visitor typing `alsigil.com` makes one plaintext request
    before the redirect -- the request an attacker on the same network can
    intercept. Privileged legal work is not done exclusively on trusted wifi.
    """
    directives = _caddyfile_directives()
    assert "Strict-Transport-Security" in directives
    assert "max-age=31536000" in directives
    assert "includeSubDomains" in directives
```

- [ ] **Step 2: Run to verify they fail**

Run: `uv run pytest tests/test_deploy_config.py -v -k "production or caddyfile or web_service or postgres_healthcheck"`

Expected: 9 FAIL with `FileNotFoundError`.

- [ ] **Step 3: Create `deploy/Caddyfile`**

```text
# One origin for both services. Every FastAPI route already lives under /api
# and Next.js claims nothing there, so no path rewriting is needed -- and
# because the browser never makes a cross-origin call, the CORS allowlist in
# src/legalrag/config.py stops mattering in production.

alsigil.com {
	encode zstd gzip

	# Once a browser has seen this header it refuses plaintext for a year, so a
	# lawyer typing "alsigil.com" on hotel wifi never makes the http:// request
	# that Caddy's redirect would otherwise have to answer -- and that request
	# is the one an attacker on the same network can intercept.
	header Strict-Transport-Security "max-age=31536000; includeSubDomains"

	handle /api/* {
		# lb_try_duration makes Caddy hold and retry while the API container
		# restarts during a deploy, instead of returning 502. Not zero-downtime
		# -- it converts a visible error into one slow request.
		reverse_proxy api:8000 {
			lb_try_duration 15s
			lb_try_interval 500ms
			# Streaming answers (/api/ask/stream) must not be buffered.
			flush_interval -1
		}
	}

	handle {
		reverse_proxy web:3000 {
			lb_try_duration 15s
			lb_try_interval 500ms
		}
	}

	log {
		output stdout
		format console
	}
}

www.alsigil.com {
	redir https://alsigil.com{uri} permanent
}
```

- [ ] **Step 4: Create `deploy/docker-compose.prod.yml`**

```yaml
# Production stack. The root docker-compose.yml is the local development stack
# and is deliberately different: it publishes 5432, this must not.
#
# Images are never built here. CI builds and pushes them; this file pulls.
# IMAGE_TAG is the git SHA, which is what makes rollback a one-liner.

x-logging: &logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - api
      - web
    logging: *logging

  web:
    image: ghcr.io/${GITHUB_REPOSITORY_OWNER:?set GITHUB_REPOSITORY_OWNER in /opt/alsigil/deploy/.env}/alsigil-web:${IMAGE_TAG:-latest}
    restart: unless-stopped
    # A separate, much smaller file than the api's. `web` is the container the
    # internet talks to first and it reads exactly two variables, both Clerk's;
    # handing it /opt/alsigil/.env would put POSTGRES_PASSWORD, DATABASE_URL,
    # RESTIC_PASSWORD and the R2 credentials one Next.js RCE away from an
    # attacker -- including the keys to the backups meant to survive a breach.
    env_file: /opt/alsigil/web.env
    expose:
      - "3000"
    logging: *logging

  api:
    image: ghcr.io/${GITHUB_REPOSITORY_OWNER:?set GITHUB_REPOSITORY_OWNER in /opt/alsigil/deploy/.env}/alsigil-api:${IMAGE_TAG:-latest}
    restart: unless-stopped
    env_file: /opt/alsigil/.env
    environment:
      LEGALOS_DOCUMENT_ROOT: /data/documents
    expose:
      - "8000"
    volumes:
      # Uploaded matter documents. Without this the files vanish on redeploy
      # while the database rows keep pointing at them.
      - documents:/data/documents
    depends_on:
      postgres:
        condition: service_healthy
    logging: *logging

  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    env_file: /opt/alsigil/.env
    # No `ports:` -- reachable only over the compose network.
    expose:
      - "5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      # $$ escapes the interpolation, so Compose passes `${POSTGRES_USER:-...}`
      # through literally for the container's own shell to expand. A single $
      # is resolved on the client from the *host* environment, where these are
      # unset -- silently pinning the check to `legalrag` regardless of what
      # /opt/alsigil/.env actually says, so a renamed user reports healthy
      # while nothing can connect.
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-legalrag} -d $${POSTGRES_DB:-legalrag}"]
      interval: 5s
      timeout: 5s
      retries: 5
    logging: *logging

volumes:
  pgdata:
  documents:
  caddy_data:
  caddy_config:
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `uv run pytest tests/test_deploy_config.py -v`

Expected: 12 passed.

- [ ] **Step 6: Validate both files parse**

```bash
docker run --rm -v "$PWD/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile
IMAGE_TAG=latest GITHUB_REPOSITORY_OWNER=placeholder docker compose -f deploy/docker-compose.prod.yml config >/dev/null && echo "COMPOSE OK"
```

Expected: `caddy validate` runs anywhere and must pass. `docker compose config` cannot be run off the box: `env_file: /opt/alsigil/.env` is required, and it is absent on a laptop — that requirement is deliberate (a stack that silently started with no secrets could bring Postgres up on default credentials, so failing loudly here is correct production behaviour, not a bug to work around). Structural validation of the compose file off the box is covered by `tests/test_deploy_config.py` instead.

- [ ] **Step 7: Commit**

```bash
git add deploy/Caddyfile deploy/docker-compose.prod.yml tests/test_deploy_config.py
git commit -m "Describe the production stack as one origin behind Caddy"
```

---

## Task 3: Post-deploy smoke check

The health gate the deploy workflow will run. `/api/health` is necessary but not sufficient — it already proves database connectivity and a non-empty corpus (`src/legalrag/api.py:411` returns `corpus_stats`), but a frontend built without the API base arg is completely broken while that endpoint reports perfect health.

**Files:**
- Create: `scripts/smoke_check.py`
- Create: `tests/test_smoke_check.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `scripts/smoke_check.py`, run as `uv run python scripts/smoke_check.py <base_url> [address-to-pin]`. Exits `0` on success, `1` with a reason on stderr on failure. Task 6 calls it as the health gate, always passing the box's address as the second argument. Functions: `check_api_health(client, base_url) -> str | None` and `check_frontend_serves(client, base_url) -> str | None`, each returning `None` on success or a human-readable failure reason; plus `resolver_pinning(hostname, address, getaddrinfo)` and `pin_host(base_url, address)`, which give the check curl's `--resolve` behaviour.

**Note on scope:** the spec's risk table calls for asserting the frontend's API call succeeds. Task 1 Step 7 does that more reliably, at build time, by grepping the compiled bundle — a deterministic check on the exact artefact, rather than an inference from a rendered page. This task covers the runtime half: is the stack actually up and serving through Caddy.

- [ ] **Step 1: Write the failing test**

Create `tests/test_smoke_check.py`:

```python
from __future__ import annotations

import httpx

from scripts.smoke_check import check_api_health, check_frontend_serves


def client_returning(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_health_passes_when_status_ok_and_corpus_populated():
    def handler(request):
        return httpx.Response(200, json={"status": "ok", "corpus": {"EG": {"instruments": 3, "articles": 6985}}})

    assert check_api_health(client_returning(handler), "https://x") is None


def test_health_fails_on_non_200():
    def handler(request):
        return httpx.Response(502, text="bad gateway")

    reason = check_api_health(client_returning(handler), "https://x")
    assert reason is not None and "502" in reason


def test_health_fails_on_empty_corpus():
    """A restored database with zero articles answers 200 and is useless."""
    def handler(request):
        return httpx.Response(200, json={"status": "ok", "corpus": {"EG": {"instruments": 0, "articles": 0}}})

    reason = check_api_health(client_returning(handler), "https://x")
    assert reason is not None and "articles" in reason


def test_health_passes_on_the_real_corpus_stats_shape():
    """Verify the check works with the actual shape returned by corpus_stats() in library.py.

    corpus_stats() returns dict[str, dict[str, int]] where each jurisdiction maps to
    {instruments: int, articles: int}. An earlier fixture silently tested nothing
    because it used a flat {articles: N} shape, which caused isinstance(dict, int) to fail
    on real deployments, falsely reporting "no articles" even when articles existed.
    """
    def handler(request):
        return httpx.Response(
            200,
            json={
                "status": "ok",
                "corpus": {
                    "EG": {"instruments": 3, "articles": 6985},
                    "US": {"instruments": 5, "articles": 100},
                },
            },
        )

    assert check_api_health(client_returning(handler), "https://x") is None


def test_frontend_passes_on_200():
    def handler(request):
        return httpx.Response(200, text="<!doctype html><title>alsigil</title>")

    assert check_frontend_serves(client_returning(handler), "https://x") is None


def test_frontend_fails_on_server_error():
    def handler(request):
        return httpx.Response(500, text="boom")

    reason = check_frontend_serves(client_returning(handler), "https://x")
    assert reason is not None and "500" in reason


def test_pinning_sends_the_deployed_hostname_to_the_given_address():
    """Without this the check resolves alsigil.com normally, which before the
    DNS cutover still answers from Vercel -- so a box that never came up would
    smoke-green and the deploy would never roll back."""
    seen = []

    def fake_getaddrinfo(host, port, *args, **kwargs):
        seen.append((host, port))
        return []

    resolve = resolver_pinning("alsigil.com", "203.0.113.7", fake_getaddrinfo)
    resolve("alsigil.com", 443)

    assert seen == [("203.0.113.7", 443)]


def test_pinning_leaves_every_other_hostname_alone():
    """Pinning must not become a blanket DNS override -- a redirect target or
    any other host the check touches has to resolve normally."""
    seen = []

    def fake_getaddrinfo(host, port, *args, **kwargs):
        seen.append((host, port))
        return []

    resolve = resolver_pinning("alsigil.com", "203.0.113.7", fake_getaddrinfo)
    resolve("example.com", 443)

    assert seen == [("example.com", 443)]
```

The import at the top of the file is
`from scripts.smoke_check import check_api_health, check_frontend_serves, resolver_pinning`.

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/test_smoke_check.py -v`

Expected: collection error — `ModuleNotFoundError: No module named 'scripts.smoke_check'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/smoke_check.py`:

```python
"""Post-deploy smoke check. Exits non-zero if the deployment is not usable.

Run: uv run python scripts/smoke_check.py https://alsigil.com <box-ip>

Deliberately checks more than "did the process start". /api/health touches the
database and reports corpus counts, so a zero-article corpus -- the signature
of a restore that moved the schema but not the rows -- fails here rather than
being discovered by the first person to search.

The optional second argument is curl's `--resolve`: it pins the URL's hostname
to a specific address so the check reaches the box being deployed rather than
whatever DNS currently answers for that name. Without it a deploy run before
the DNS cutover would smoke-green against the old Vercel deployment -- a box
that never came up at all would look healthy, and no rollback would fire. The
URL is left untouched, so TLS SNI and certificate verification still happen
against the real hostname.
"""
from __future__ import annotations

import socket
import sys
import time
from urllib.parse import urlsplit

import httpx

TIMEOUT_SECONDS = 10
RETRY_WINDOW_SECONDS = 30
RETRY_INTERVAL_SECONDS = 2


def resolver_pinning(hostname: str, address: str, getaddrinfo):
    """A getaddrinfo replacement that sends `hostname` to `address`.

    Everything else resolves normally. Substituting at the resolver rather than
    in the URL is what keeps the Host header, the TLS SNI name and certificate
    validation pointed at the real hostname -- rewriting the URL to the IP
    would fail certificate verification and never reach the right vhost.
    """

    def resolve(host, port, *args, **kwargs):
        return getaddrinfo(
            address if host == hostname else host, port, *args, **kwargs
        )

    return resolve


def pin_host(base_url: str, address: str) -> None:
    """Pin the URL's hostname to `address` for the rest of this process."""
    hostname = urlsplit(base_url).hostname
    if not hostname:
        raise ValueError(f"no hostname to pin in {base_url!r}")
    socket.getaddrinfo = resolver_pinning(hostname, address, socket.getaddrinfo)


def check_api_health(client: httpx.Client, base_url: str) -> str | None:
    """None if the API is healthy, otherwise the reason it is not."""
    try:
        response = client.get(f"{base_url}/api/health", timeout=TIMEOUT_SECONDS)
    except httpx.HTTPError as exc:
        return f"health request failed: {exc}"

    if response.status_code != 200:
        return f"health returned {response.status_code}"

    payload = response.json()
    if payload.get("status") != "ok":
        return f"health status is {payload.get('status')!r}"

    corpus = payload.get("corpus") or {}
    article_count = sum(
        stats.get("articles", 0)
        for stats in corpus.values()
        if isinstance(stats, dict)
    )
    if article_count == 0:
        return f"health reports no articles: {corpus}"

    return None


def check_frontend_serves(client: httpx.Client, base_url: str) -> str | None:
    """None if Caddy is serving the Next.js app, otherwise the reason it is not."""
    try:
        response = client.get(
            base_url, timeout=TIMEOUT_SECONDS, follow_redirects=True
        )
    except httpx.HTTPError as exc:
        return f"frontend request failed: {exc}"

    if response.status_code >= 400:
        return f"frontend returned {response.status_code}"

    return None


def run_checks(base_url: str) -> list[str]:
    """Every failure reason, empty when the deployment is healthy."""
    with httpx.Client() as client:
        return [
            reason
            for reason in (
                check_api_health(client, base_url),
                check_frontend_serves(client, base_url),
            )
            if reason is not None
        ]


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv if argv is None else argv
    if len(argv) not in (2, 3):
        print("usage: smoke_check.py <base_url> [address-to-pin]", file=sys.stderr)
        return 2

    base_url = argv[1].rstrip("/")
    if len(argv) == 3 and argv[2]:
        pin_host(base_url, argv[2])
        print(f"pinned {urlsplit(base_url).hostname} to {argv[2]}")

    deadline = time.monotonic() + RETRY_WINDOW_SECONDS

    # Containers take a few seconds to accept connections. Retrying inside the
    # window is what distinguishes "still starting" from "broken".
    while True:
        failures = run_checks(base_url)
        if not failures:
            print(f"smoke check passed against {base_url}")
            return 0
        if time.monotonic() >= deadline:
            for reason in failures:
                print(f"SMOKE CHECK FAILED: {reason}", file=sys.stderr)
            return 1
        time.sleep(RETRY_INTERVAL_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/test_smoke_check.py -v`

Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke_check.py tests/test_smoke_check.py
git commit -m "Gate deploys on the stack being usable, not merely running"
```

---

## Task 4: Provision the box

The one manual-ish task. Written as an idempotent script so the box is reproducible rather than remembered — if it is ever lost, this plus a restore rebuilds it.

**Files:**
- Create: `deploy/provision.sh`
- Create: `deploy/env.example`
- Create: `deploy/web.env.example`

**Interfaces:**
- Consumes: nothing.
- Produces: a box with a `deploy` user in the `docker` and `sudo` groups, ufw allowing only 22/80/443, Docker Engine + Compose plugin, `/opt/alsigil/` containing `.env` (root:deploy 0640, API and database secrets via `env_file:`) and `web.env` (root:deploy 0640, only the Clerk variables Next.js reads), and `/opt/alsigil/deploy/` containing the compose files plus its own `.env` (deploy:deploy 0600, compose-interpolation variables — `GITHUB_REPOSITORY_OWNER` in particular). Tasks 5 and 6 SSH in as `deploy`.

- [ ] **Step 1: Create the Hetzner server**

In the Hetzner Cloud console: new project, **CX22**, **Ubuntu 24.04**, location **Falkenstein**, your SSH public key attached, IPv4 + IPv6 enabled. Note the IPv4 and IPv6 addresses.

- [ ] **Step 2: Point DNS at it**

At your DNS provider for `alsigil.com`:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | the box IPv4 |
| AAAA | `@` | the box IPv6 |
| A | `www` | the box IPv4 |
| AAAA | `www` | the box IPv6 |

Lower the TTL to 300 first if the existing records point at Vercel — that shortens the cutover window in Task 7.

Verify: `dig +short alsigil.com` returns the box IPv4.

- [ ] **Step 3: Write `deploy/provision.sh`**

```bash
#!/usr/bin/env bash
# One-time box baseline. Idempotent: safe to re-run, and re-running is how the
# box gets rebuilt if it is ever lost.
#
# Run as root on a fresh Ubuntu 24.04 Hetzner box:
#   scp deploy/provision.sh root@<ip>:/tmp/ && ssh root@<ip> bash /tmp/provision.sh
set -euo pipefail

DEPLOY_USER=deploy
APP_DIR=/opt/alsigil

echo "==> Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw restic

echo "==> Docker Engine + Compose plugin"
if ! command -v docker >/dev/null; then
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
		-o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
		> /etc/apt/sources.list.d/docker.list
	apt-get update -qq
	apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
		docker-buildx-plugin docker-compose-plugin
fi

echo "==> Deploy user"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
	adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
# The deploy user administers the box: Tasks 4, 8, 9 and 10 all install systemd
# units, edit /opt/alsigil/.env and run restore_check.sh through `sudo` over an
# SSH session opened as this user. Without this the account can only talk to
# Docker, and every one of those steps fails with "deploy is not in the
# sudoers file".
usermod -aG sudo "$DEPLOY_USER"
install -d -m 0700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
if [ -f /root/.ssh/authorized_keys ]; then
	install -m 0600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" \
		/root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

echo "==> SSH hardening"
cat > /etc/ssh/sshd_config.d/99-alsigil.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
systemctl restart ssh

echo "==> Firewall"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> App directory"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
# root:deploy 0640, NOT root:root 0600. `env_file:` is resolved by the Compose
# CLI on the *client* side, and every compose command on this box runs as
# $DEPLOY_USER -- so without group read, `docker compose pull`, `run` and
# `up -d` all abort with "permission denied" before a container is ever
# created. Group read is the minimum that lets the deploy work; do not
# "harden" this back to 0600.
if [ ! -f "$APP_DIR/.env" ]; then
	install -m 0640 -o root -g "$DEPLOY_USER" /dev/null "$APP_DIR/.env"
	echo "    created empty $APP_DIR/.env -- fill it before deploying"
fi
# Only the Clerk variables the internet-facing Next.js container actually
# reads. Kept separate from $APP_DIR/.env so that a compromise of the web
# container does not hand over the database password, the restic key and the
# R2 credentials, none of which Next.js has any use for.
if [ ! -f "$APP_DIR/web.env" ]; then
	install -m 0640 -o root -g "$DEPLOY_USER" /dev/null "$APP_DIR/web.env"
	echo "    created empty $APP_DIR/web.env -- fill it before deploying"
fi

# $APP_DIR/deploy/ holds the compose files (Task 6 scp's them here) plus a
# SEPARATE .env used only for compose variable interpolation -- distinct from
# $APP_DIR/.env, which is wired in via `env_file:` and becomes each
# container's process environment. Do not confuse the two: only this one
# affects image names. Without GITHUB_REPOSITORY_OWNER in it, `docker
# compose` run by hand (rollback, restore_check.sh, a bare `logs`) or by
# backup.sh's systemd timer -- none of which export it -- aborts loudly on
# the required-variable message instead of pulling a malformed image ref.
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/deploy"
# Owned by $DEPLOY_USER, because the deploy workflow rewrites this file with a
# plain `>` redirect over SSH as that user. A root-owned file here makes the
# very first deploy fail on "permission denied" -- and it holds no secret, only
# the GHCR owner name.
if [ ! -f "$APP_DIR/deploy/.env" ]; then
	install -m 0600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /dev/null "$APP_DIR/deploy/.env"
	echo "    created empty $APP_DIR/deploy/.env -- set GITHUB_REPOSITORY_OWNER before deploying"
fi

echo "==> Done. Verify from your laptop before closing this session:"
echo "    ssh $DEPLOY_USER@<ip> docker ps"
```

- [ ] **Step 4: Create `deploy/env.example`**

There are two environment files on the box, and they are not interchangeable:

| File | Read by | Contains |
| --- | --- | --- |
| `/opt/alsigil/.env` | `api` and `postgres` via `env_file:` | Database credentials, model provider keys, `CLERK_JWKS_URL`, Resend, restic/R2, Sentry |
| `/opt/alsigil/web.env` | `web` via `env_file:` | Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` |

The split exists because `web` is the container the internet talks to first and
it has no use for `POSTGRES_PASSWORD`, `DATABASE_URL`, `RESTIC_PASSWORD` or the
R2 keys. Handing it the whole secrets file means one Next.js RCE hands over the
backups as well as the database.

Both files are `root:deploy`, mode `0640` — see the note in `provision.sh` for
why `0600` breaks every deploy.

```bash
# Copy to /opt/alsigil/.env on the box, fill in, chmod 0640, chown root:deploy.
# Never commit the filled version.
#
# This file is for the `api` and `postgres` containers. The `web` container
# reads /opt/alsigil/web.env instead -- see web.env.example.

# --- Database (compose-internal; host is the service name) ---
POSTGRES_USER=legalrag
POSTGRES_PASSWORD=
POSTGRES_DB=legalrag
DATABASE_URL=postgresql://legalrag:@postgres:5432/legalrag

# --- Model providers ---
OPENROUTER_API_KEY=
NVIDIA_API_KEY=

# --- Identity (the API verifies Clerk JWTs; see src/legalrag/config.py:78) ---
CLERK_JWKS_URL=
CLERK_SECRET_KEY=

# --- Email ---
RESEND_API_KEY=

# --- Uploaded documents (must match the volume mount in the compose file) ---
LEGALOS_DOCUMENT_ROOT=/data/documents

# --- Backups (Task 8). The restic password ALSO belongs in a password
#     manager: a copy that exists only here is unusable once the box is gone. ---
RESTIC_REPOSITORY=
RESTIC_PASSWORD=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# --- Monitoring (Task 10) ---
SENTRY_DSN=
ALERT_EMAIL_TO=

# LEGALOS_DEV_AUTH and LEGALOS_CORS_ORIGINS are deliberately absent.
# LEGALOS_DEV_AUTH disables authentication entirely and MUST NOT be set here.
# CORS is unnecessary: Caddy serves the API and the app from one origin.
```

Also create `deploy/web.env.example`:

```bash
# Copy to /opt/alsigil/web.env on the box, fill in, chmod 0640, chown
# root:deploy. Never commit the filled version.
#
# This is the whole environment the internet-facing Next.js container gets.
# Nothing else belongs here. In particular POSTGRES_PASSWORD, DATABASE_URL,
# RESTIC_PASSWORD and the R2 credentials MUST NOT be added: `web` never opens a
# database connection or touches a backup, so the only thing copying them here
# would achieve is putting them one Next.js RCE away from an attacker.

# --- Identity ---
# The publishable key is also inlined into the client bundle at build time;
# it is present here for the server-rendered pages and middleware.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
# Read at runtime by clerkMiddleware in web/middleware.ts to verify sessions.
CLERK_SECRET_KEY=
```

- [ ] **Step 5: Run the provisioning script**

```bash
scp deploy/provision.sh root@<box-ip>:/tmp/
ssh root@<box-ip> bash /tmp/provision.sh
```

Expected: ends with `==> Done.`

- [ ] **Step 6: Verify hardening actually took effect**

```bash
ssh deploy@<box-ip> docker ps
ssh deploy@<box-ip> sudo ufw status
ssh root@<box-ip> echo should-fail || echo "root login correctly refused"
```

Expected: an empty container table; ufw `Status: active` listing only 22, 80, 443; and the root login refused. `sudo ufw status` also confirms `usermod -aG sudo` took effect — if it prints "deploy is not in the sudoers file", stop here, because Steps 7 and 8 and Tasks 8, 9 and 10 all depend on it.

- [ ] **Step 7: Fill in the two secrets files**

```bash
scp deploy/env.example deploy/web.env.example deploy@<box-ip>:/tmp/
ssh deploy@<box-ip>
sudo cp /tmp/env.example /opt/alsigil/.env
sudo nano /opt/alsigil/.env            # fill in every blank value
sudo cp /tmp/web.env.example /opt/alsigil/web.env
sudo nano /opt/alsigil/web.env         # Clerk keys only -- nothing else
# root:deploy 0640, NOT root:root 0600. Compose resolves `env_file:`
# client-side, as the user running the command -- which is always `deploy` on
# this box, from CI and by hand alike. With 0600 every `docker compose pull`,
# `run` and `up -d` fails with "permission denied" before a container exists.
# Group read is what makes the stack deployable at all; do not tighten it.
sudo chown root:deploy /opt/alsigil/.env /opt/alsigil/web.env
sudo chmod 0640 /opt/alsigil/.env /opt/alsigil/web.env
rm /tmp/env.example /tmp/web.env.example
```

Verify both the ownership and that `deploy` can genuinely read them, which is the property that actually matters:

```bash
ssh deploy@<box-ip> "stat -c '%n %U:%G %a' /opt/alsigil/.env /opt/alsigil/web.env"
ssh deploy@<box-ip> "head -c1 /opt/alsigil/.env >/dev/null && echo 'deploy can read the secrets file'"
```

Expected: `root:deploy 640` for both, and the readability line. `root:root 600` here means the first deploy will fail.

- [ ] **Step 8: Commit**

```bash
git add deploy/provision.sh deploy/env.example deploy/web.env.example
git commit -m "Make the box reproducible instead of remembered"
```

---

## Task 5: Build and push images in CI

**Files:**
- Create: `.github/workflows/build.yml`

**Interfaces:**
- Consumes: `web/Dockerfile` (Task 1), root `Dockerfile`.
- Produces: `ghcr.io/<owner>/alsigil-api` and `ghcr.io/<owner>/alsigil-web`, each tagged `<git-sha>` and `latest`. Task 6 consumes those tags.

- [ ] **Step 1: Create `.github/workflows/build.yml`**

```yaml
# Builds both images and pushes them to GHCR. Deliberately separate from
# deployment: a build failure must never reach the box, and keeping the steps
# in different workflows makes that structural rather than a matter of ordering.
name: Build images

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push the API image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/alsigil-api:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/alsigil-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push the web image
        uses: docker/build-push-action@v6
        with:
          context: ./web
          file: ./web/Dockerfile
          push: true
          # Empty means same-origin. This is inlined into the client bundle at
          # build time, so it can only be set here.
          build-args: |
            NEXT_PUBLIC_API_BASE=
          tags: |
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/alsigil-web:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ github.repository_owner }}/alsigil-web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Assert the web bundle is not pointing at localhost
        run: |
          image="${{ env.REGISTRY }}/${{ github.repository_owner }}/alsigil-web:${{ github.sha }}"
          if docker run --rm "$image" grep -rl "localhost:8000" .next/static; then
            echo "::error::NEXT_PUBLIC_API_BASE did not reach the build."
            echo "The API would be healthy and the frontend completely broken."
            exit 1
          fi
          echo "Bundle is clean."
```

- [ ] **Step 2: Commit and push to trigger it**

```bash
git add .github/workflows/build.yml
git commit -m "Build the images where failing is free"
git push
```

- [ ] **Step 3: Verify the workflow succeeded**

Run: `gh run watch`

Expected: the `Build images` run completes green, including the bundle assertion.

- [ ] **Step 4: Verify both packages exist**

```bash
gh api "/users/$(gh api /user --jq .login)/packages?package_type=container" --jq '.[].name'
```

Expected: `alsigil-api` and `alsigil-web` both listed.

- [ ] **Step 5: Give the box read access to the registry**

Create a GitHub classic PAT with only the `read:packages` scope, then on the box:

```bash
ssh deploy@<box-ip>
echo "<the-PAT>" | docker login ghcr.io -u <your-github-username> --password-stdin
```

Expected: `Login Succeeded`. Verify: `docker pull ghcr.io/<owner>/alsigil-api:latest` succeeds.

---

## Task 6: Deploy workflow with health gate and auto-rollback

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: images from Task 5; `deploy/docker-compose.prod.yml` (Task 2); `scripts/smoke_check.py` (Task 3); the `deploy` user (Task 4).
- Produces: a green `git push` → production path. GitHub secrets required: `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_KNOWN_HOSTS`.

- [ ] **Step 1: Add the deploy secrets to GitHub**

```bash
ssh-keyscan -H <box-ip> > /tmp/known_hosts
gh secret set SSH_KNOWN_HOSTS < /tmp/known_hosts
gh secret set SSH_HOST --body "<box-ip>"
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_ed25519   # the key authorised for deploy@
```

Verify: `gh secret list` shows all three.

- [ ] **Step 2: Put the compose files on the box**

```bash
ssh deploy@<box-ip> 'mkdir -p /opt/alsigil/deploy'
scp deploy/docker-compose.prod.yml deploy/Caddyfile deploy@<box-ip>:/opt/alsigil/deploy/
```

- [ ] **Step 3: Create `.github/workflows/deploy.yml`**

```yaml
# Pulls the images built by the Build workflow, migrates, swaps the containers,
# and rolls back automatically if the result is not usable.
#
# Nothing is built here. The box's job is to pull a known-good image, which is
# why a broken build never reaches it.
name: Deploy

on:
  workflow_run:
    workflows: ["Build images"]
    types: [completed]
    branches: [main]
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Image tag to deploy (a git SHA). Use this to roll back."
        required: true

jobs:
  deploy:
    # A failed build must not deploy. workflow_run fires on failure too.
    if: >
      github.event_name == 'workflow_dispatch' ||
      github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Work out which tag to deploy
        id: tag
        # image_tag is attacker-influenced: anyone who can dispatch this
        # workflow chooses it. Templating it straight into a `run:` block puts
        # it inside a double-quoted shell string, where $(...) and backticks
        # execute on the runner -- which holds SSH_PRIVATE_KEY. Passing it
        # through env: means the shell only ever sees a variable reference.
        env:
          EVENT_NAME: ${{ github.event_name }}
          DISPATCH_TAG: ${{ inputs.image_tag }}
          BUILT_SHA: ${{ github.event.workflow_run.head_sha }}
        run: |
          if [ "$EVENT_NAME" = "workflow_dispatch" ]; then
            printf 'value=%s\n' "$DISPATCH_TAG" >> "$GITHUB_OUTPUT"
          else
            printf 'value=%s\n' "$BUILT_SHA" >> "$GITHUB_OUTPUT"
          fi

      - name: Set up SSH
        run: |
          install -d -m 0700 ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          echo "${{ secrets.SSH_KNOWN_HOSTS }}" > ~/.ssh/known_hosts

      - name: Record the tag currently running, for rollback
        id: previous
        env:
          SSH_HOST: ${{ secrets.SSH_HOST }}
        run: |
          # Must not fall back to "latest" when the file is absent. build.yml
          # tags every image :latest too, so on a bootstrap deploy "latest"
          # is the image that just failed -- falling back to it would redeploy
          # the broken image while reporting that a rollback occurred, which
          # is worse than doing nothing because it looks like it worked. An
          # empty value here is what makes the no-target case detectable and
          # lets the rollback step below fail closed instead.
          current=$(ssh "deploy@$SSH_HOST" \
            "cat /opt/alsigil/deploy/.current_tag 2>/dev/null || true")
          printf 'value=%s\n' "$current" >> "$GITHUB_OUTPUT"
          echo "Currently deployed: ${current:-<none, first deploy to this box>}"

      - name: Sync the compose configuration
        env:
          OWNER: ${{ github.repository_owner }}
          SSH_HOST: ${{ secrets.SSH_HOST }}
        run: |
          # Keep whatever configuration is live right now, so the rollback step
          # can put it back. The image tag is not the whole deployment: this
          # step overwrites the Caddyfile and the compose file *before* the
          # swap, so a commit that breaks the proxy config fails the smoke
          # check and then rolls the image back behind the new broken proxy --
          # reporting a successful rollback while the site stays down.
          ssh "deploy@$SSH_HOST" bash -euo pipefail <<'EOF'
          cd /opt/alsigil/deploy
          for f in docker-compose.prod.yml Caddyfile; do
            # Absent on a bootstrap deploy; there is nothing to roll back to
            # then, and the "no rollback target" step reports that separately.
            if [ -f "$f" ]; then cp -p "$f" "$f.rollback"; fi
          done
          EOF
          scp deploy/docker-compose.prod.yml deploy/Caddyfile \
            "deploy@$SSH_HOST:/opt/alsigil/deploy/"
          # /opt/alsigil/deploy/.env is the compose *interpolation* env file --
          # separate from /opt/alsigil/.env, which is wired in via `env_file:`
          # as container secrets. GITHUB_REPOSITORY_OWNER lives only here, and
          # provision.sh only creates it empty, so every deploy re-writes it.
          # That makes a redeploy self-healing if the file is ever lost or
          # edited by hand -- the required-variable form in the compose file
          # means a missing value fails loudly rather than pulling
          # `ghcr.io//alsigil-api`, but this step means it should never be
          # missing on a box that has deployed at least once.
          printf 'GITHUB_REPOSITORY_OWNER=%s\n' "$OWNER" \
            | ssh "deploy@$SSH_HOST" "cat > /opt/alsigil/deploy/.env"

      - name: Pull, migrate, and swap
        env:
          IMAGE_TAG: ${{ steps.tag.outputs.value }}
          OWNER: ${{ github.repository_owner }}
          SSH_HOST: ${{ secrets.SSH_HOST }}
        # The remote script is a *quoted* heredoc, so neither the runner's shell
        # nor GitHub templating substitutes anything into it. The two values it
        # needs are prepended as `printf %q` assignments, which the remote bash
        # re-reads as literals -- a tag containing a quote is then data on the
        # box, not a command running as deploy. IMAGE_TAG comes from a dispatch
        # input, so it is attacker-chosen.
        run: |
          {
            printf 'IMAGE_TAG=%q\n' "$IMAGE_TAG"
            printf 'GITHUB_REPOSITORY_OWNER=%q\n' "$OWNER"
            cat <<'REMOTE'
          export IMAGE_TAG GITHUB_REPOSITORY_OWNER
          cd /opt/alsigil/deploy
          docker compose -f docker-compose.prod.yml pull
          # A discrete step so a failed migration aborts the deploy instead
          # of leaving a container crash-looping against a half-applied schema.
          docker compose -f docker-compose.prod.yml run --rm api \
            python scripts/migrate.py
          docker compose -f docker-compose.prod.yml up -d
          printf '%s\n' "$IMAGE_TAG" > /opt/alsigil/deploy/.current_tag
          REMOTE
          } | ssh "deploy@$SSH_HOST" bash -euo pipefail

      - name: Set up Python for the smoke check
        uses: astral-sh/setup-uv@v5

      - name: Smoke check
        id: smoke
        # The second argument pins alsigil.com to the box we just deployed to.
        # Without it this check would pass against whatever DNS answers for the
        # name -- which before the Task 7 cutover is still Vercel, so a box that
        # never came up would smoke-green and no rollback would fire.
        env:
          SSH_HOST: ${{ secrets.SSH_HOST }}
        run: |
          uv run --with httpx python scripts/smoke_check.py \
            https://alsigil.com "$SSH_HOST"

      - name: Report that no rollback target exists
        if: failure() && steps.previous.outputs.value == ''
        run: |
          echo "::error::Deploy failed and there is no previously deployed tag to roll back to."
          echo "::error::This is the first deploy to this box. Investigate before retrying."
          exit 1

      - name: Roll back to the previous tag
        # Keyed off steps.previous rather than steps.smoke: when "Pull,
        # migrate, and swap" itself fails, every later step (including the
        # smoke check) is skipped, so steps.smoke.outcome would be 'skipped'
        # and this would never fire. steps.previous is the last step
        # guaranteed to have run before anything was mutated, so failure()
        # here covers both a failed swap and a failed smoke check. Rolling
        # back after a failed `pull` or `migrate` (which use `run --rm` and
        # never touch the running containers) is a harmless no-op -- it
        # re-applies the tag that was already running.
        if: failure() && steps.previous.outcome == 'success' && steps.previous.outputs.value != ''
        # Same quoting discipline as the swap step. This tag is read back from
        # .current_tag on the box, which the swap step wrote from a dispatch
        # input -- so it carries the same taint one deploy later.
        env:
          IMAGE_TAG: ${{ steps.previous.outputs.value }}
          OWNER: ${{ github.repository_owner }}
          SSH_HOST: ${{ secrets.SSH_HOST }}
        run: |
          echo "::error::Deploy failed. Rolling back to $IMAGE_TAG."
          {
            printf 'IMAGE_TAG=%q\n' "$IMAGE_TAG"
            printf 'GITHUB_REPOSITORY_OWNER=%q\n' "$OWNER"
            cat <<'REMOTE'
          export IMAGE_TAG GITHUB_REPOSITORY_OWNER
          cd /opt/alsigil/deploy
          # Restore the configuration too, not just the tag. "Sync the compose
          # configuration" already overwrote the Caddyfile and the compose
          # file with this deploy's versions; bringing the old image up behind
          # them would leave the site broken while the run claims it recovered.
          for f in docker-compose.prod.yml Caddyfile; do
            if [ -f "$f.rollback" ]; then mv "$f.rollback" "$f"; fi
          done
          docker compose -f docker-compose.prod.yml up -d
          printf '%s\n' "$IMAGE_TAG" > /opt/alsigil/deploy/.current_tag
          REMOTE
          } | ssh "deploy@$SSH_HOST" bash -euo pipefail
          exit 1
```

- [ ] **Step 4: Commit and push**

```bash
git add .github/workflows/deploy.yml
git commit -m "Deploy on push, and undo it automatically when it does not work"
git push
```

- [ ] **Step 5: Watch the first real deploy**

Run: `gh run watch`

Expected: `Build images` green, then `Deploy` green. The smoke check will fail on the corpus assertion if the database is still empty — that is correct behaviour and Task 7 fixes it. If so, note the failure and continue; re-run this workflow after Task 7.

- [ ] **Step 6: Verify TLS and routing from outside**

```bash
curl -sI https://alsigil.com | head -1
curl -s https://alsigil.com/api/health | head -c 200
```

Expected: `HTTP/2 200`, and a JSON body containing `"status":"ok"`.

- [ ] **Step 7: Prove rollback works before you need it**

```bash
gh workflow run deploy.yml -f image_tag=<an-older-sha>
gh run watch
ssh deploy@<box-ip> cat /opt/alsigil/deploy/.current_tag
```

Expected: the older SHA. Then redeploy the current SHA the same way. Testing rollback while nothing is wrong is the only comfortable time to do it.

---

## Task 7: Data cutover from Neon

**Files:**
- Create: `scripts/cutover_verify.py`
- Create: `tests/test_cutover_verify.py`

**Interfaces:**
- Consumes: a running box stack (Task 6).
- Produces: `scripts/cutover_verify.py`, run as `uv run python scripts/cutover_verify.py --source <url> --target <url>`. Exits `0` when the target matches the source and vector search works.

- [ ] **Step 1: Pre-flight — confirm pgvector versions match**

```bash
psql "$NEON_URL" -c "SELECT extversion FROM pg_extension WHERE extname='vector';"
ssh deploy@<box-ip> "cd /opt/alsigil/deploy && docker compose -f docker-compose.prod.yml exec -T postgres psql -U legalrag -d legalrag -c \"SELECT extversion FROM pg_extension WHERE extname='vector';\""
```

Expected: both **≥ 0.7.0**. `articles.embedding` is `halfvec(2048)` with an HNSW `halfvec_cosine_ops` index (migration `0004`), and `halfvec` does not exist below 0.7.0. **Stop and resolve any mismatch before dumping** — it surfaces as a restore failure otherwise.

- [ ] **Step 2: Pre-flight — find out whether uploaded documents still exist**

```bash
# On the Railway service, or in its shell:
ls -la "${LEGALOS_DOCUMENT_ROOT:-data/documents}" | head
psql "$NEON_URL" -c "SELECT count(*) FROM documents;"
```

If the row count is non-zero and the directory is empty or missing, Railway had no volume mounted there and **the files are already gone**. Record it as a data-loss finding and continue — it does not block the cutover, but it must not be discovered later by a user clicking a download link.

- [ ] **Step 3: Write the failing test**

Create `tests/test_cutover_verify.py`:

```python
from __future__ import annotations

from scripts.cutover_verify import compare_counts


def test_no_mismatches_when_counts_are_equal():
    source = {"articles": 6985, "instruments": 3}
    target = {"articles": 6985, "instruments": 3}

    assert compare_counts(source, target) == []


def test_reports_a_row_count_difference():
    source = {"articles": 6985}
    target = {"articles": 6900}

    mismatches = compare_counts(source, target)

    assert len(mismatches) == 1
    assert "articles" in mismatches[0]
    assert "6985" in mismatches[0] and "6900" in mismatches[0]


def test_reports_a_table_missing_from_the_target():
    """A dump that silently skipped a table is the failure this catches."""
    mismatches = compare_counts({"amendments": 12}, {})

    assert len(mismatches) == 1
    assert "amendments" in mismatches[0] and "missing" in mismatches[0]


def test_ignores_extra_tables_in_the_target():
    """schema_migrations rows can legitimately differ; extras are not errors."""
    assert compare_counts({"articles": 1}, {"articles": 1, "extra": 5}) == []
```

- [ ] **Step 4: Run to verify it fails**

Run: `uv run pytest tests/test_cutover_verify.py -v`

Expected: collection error — `ModuleNotFoundError: No module named 'scripts.cutover_verify'`.

- [ ] **Step 5: Write the implementation**

Create `scripts/cutover_verify.py`:

```python
"""Verifies a restored database against the source it was dumped from.

Row counts prove the rows arrived. They do not prove search works: the HNSW
index on articles.embedding can fail to come across while every count matches,
and the failure only surfaces the first time somebody searches. So this also
runs a real nearest-neighbour query.

Run:
  uv run python scripts/cutover_verify.py --source "$NEON_URL" --target "$BOX_URL"
"""
from __future__ import annotations

import argparse
import sys

import psycopg


def table_counts(conn: psycopg.Connection) -> dict[str, int]:
    """Row counts for every base table in the public schema."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """
        )
        names = [row[0] for row in cur.fetchall()]

    counts: dict[str, int] = {}
    for name in names:
        with conn.cursor() as cur:
            # Identifier comes from the catalogue, not from user input.
            cur.execute(f'SELECT count(*) FROM "{name}"')
            counts[name] = cur.fetchone()[0]
    return counts


def compare_counts(source: dict[str, int], target: dict[str, int]) -> list[str]:
    """Human-readable mismatches. Extra tables in the target are not errors."""
    mismatches: list[str] = []
    for name, expected in sorted(source.items()):
        if name not in target:
            mismatches.append(f"{name}: missing from target (source has {expected})")
        elif target[name] != expected:
            mismatches.append(f"{name}: source {expected}, target {target[name]}")
    return mismatches


def vector_search_works(conn: psycopg.Connection) -> str | None:
    """None if a nearest-neighbour query runs, otherwise why it did not."""
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM articles WHERE embedding IS NOT NULL")
            embedded = cur.fetchone()[0]
            if embedded == 0:
                return "no article has an embedding; retrieval would return nothing"

            cur.execute(
                """
                SELECT id FROM articles
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> (
                    SELECT embedding FROM articles WHERE embedding IS NOT NULL LIMIT 1
                )
                LIMIT 5
                """
            )
            if len(cur.fetchall()) < 1:
                return "nearest-neighbour query returned no rows"
    except psycopg.Error as exc:
        return f"nearest-neighbour query failed: {exc}"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="source DATABASE_URL")
    parser.add_argument("--target", required=True, help="target DATABASE_URL")
    args = parser.parse_args()

    with psycopg.connect(args.source) as source_conn:
        source = table_counts(source_conn)
    with psycopg.connect(args.target) as target_conn:
        target = table_counts(target_conn)
        search_failure = vector_search_works(target_conn)

    mismatches = compare_counts(source, target)
    for line in mismatches:
        print(f"COUNT MISMATCH: {line}", file=sys.stderr)
    if search_failure:
        print(f"SEARCH BROKEN: {search_failure}", file=sys.stderr)

    if mismatches or search_failure:
        return 1

    print(f"Verified {len(source)} tables; vector search works.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `uv run pytest tests/test_cutover_verify.py -v`

Expected: 4 passed.

- [ ] **Step 7: Dump from Neon**

```bash
pg_dump --no-owner --no-privileges --format=custom \
  --file=/tmp/alsigil-cutover.dump "$NEON_URL"
ls -lh /tmp/alsigil-cutover.dump
```

Everything, not just the corpus — practice data, organizations, invitations and conversations all matter. `articles.text_search` is a `GENERATED ALWAYS` column (migration `0003`), so its data is not in the dump and is recomputed on restore; that is correct and needs no action.

- [ ] **Step 8: Restore into the box**

```bash
scp /tmp/alsigil-cutover.dump deploy@<box-ip>:/tmp/
ssh deploy@<box-ip>
cd /opt/alsigil/deploy
docker compose -f docker-compose.prod.yml cp /tmp/alsigil-cutover.dump postgres:/tmp/
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore --no-owner --no-privileges -U legalrag -d legalrag /tmp/alsigil-cutover.dump
```

Expected: completes, possibly with warnings about the `vector` extension already existing. Errors mentioning `halfvec` mean the version pre-flight in Step 1 was skipped or wrong.

- [ ] **Step 9: Confirm the schema is at head**

```bash
ssh deploy@<box-ip> "cd /opt/alsigil/deploy && docker compose -f docker-compose.prod.yml run --rm api python scripts/migrate.py"
```

Expected: `No pending migrations.` — the dump carried `schema_migrations` across, so this is a check rather than a change.

- [ ] **Step 10: Verify, and do not skip the search half**

Temporarily publish Postgres to localhost through an SSH tunnel rather than opening a port:

```bash
ssh -L 5433:localhost:5432 deploy@<box-ip> -N &
# In another shell, from the repo:
uv run python scripts/cutover_verify.py \
  --source "$NEON_URL" \
  --target "postgresql://legalrag:<password>@localhost:5433/legalrag"
```

The tunnel needs Postgres reachable on the box's loopback. If it is not (it should not be published), run the verify inside the box instead by copying the script into the api container.

Expected: `Verified N tables; vector search works.`

- [ ] **Step 11: Re-run the smoke check end to end**

```bash
uv run --with httpx python scripts/smoke_check.py https://alsigil.com
```

Expected: `smoke check passed against https://alsigil.com`. The corpus assertion that failed in Task 6 Step 5 now passes.

- [ ] **Step 12: Commit**

```bash
git add scripts/cutover_verify.py tests/test_cutover_verify.py
git commit -m "Prove the corpus survived the move, search included"
```

- [ ] **Step 13: Leave the old hosting running**

Do **not** close Neon, Railway or Vercel yet. They stay alive and unused for two weeks; Task 12 closes them.

---

## Task 8: Encrypted offsite backups

**Files:**
- Create: `deploy/backup.sh`
- Create: `deploy/alsigil-backup.service`
- Create: `deploy/alsigil-backup.timer`

**Interfaces:**
- Consumes: the running stack; `RESTIC_*` and `AWS_*` values in `/opt/alsigil/.env`.
- Produces: nightly snapshots in R2 containing `dump.sql` and the documents volume. Task 9 restores from them.

- [ ] **Step 1: Create the R2 bucket and credentials**

In the Cloudflare dashboard: R2 → create bucket `alsigil-backups` → create an API token scoped to that bucket with **Object Read & Write**. Note the access key id, secret, and account id.

The endpoint is `s3:https://<account-id>.r2.cloudflarestorage.com/alsigil-backups`.

- [ ] **Step 2: Add the backup secrets to `/opt/alsigil/.env`**

```bash
ssh deploy@<box-ip>
sudo nano /opt/alsigil/.env
```

Set:

```bash
RESTIC_REPOSITORY=s3:https://<account-id>.r2.cloudflarestorage.com/alsigil-backups
RESTIC_PASSWORD=<a long random passphrase>
AWS_ACCESS_KEY_ID=<r2 access key id>
AWS_SECRET_ACCESS_KEY=<r2 secret>
```

**Now put `RESTIC_PASSWORD` in your password manager.** A passphrase that exists only on the box protects an archive that becomes permanently unopenable the moment the box is lost — which is the scenario backups exist for. This step is not optional and cannot be done later from the box.

- [ ] **Step 3: Initialise the repository**

```bash
ssh deploy@<box-ip>
set -a && sudo cat /opt/alsigil/.env > /tmp/e && . /tmp/e && rm /tmp/e && set +a
restic init
restic snapshots
```

Expected: `created restic repository ... at s3:...`, then an empty snapshot list.

- [ ] **Step 4: Write `deploy/backup.sh`**

```bash
#!/usr/bin/env bash
# Nightly backup: a logical database dump plus the uploaded documents,
# encrypted client-side by restic and pushed to Cloudflare R2.
#
# The documents go in the same snapshot as the dump on purpose. A database
# backup that omits the files its rows reference is not a restorable system.
set -euo pipefail

ENV_FILE=/opt/alsigil/.env
COMPOSE_FILE=/opt/alsigil/deploy/docker-compose.prod.yml
STAGING=/var/tmp/alsigil-backup

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY not set}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD not set}"

rm -rf "$STAGING"
mkdir -p "$STAGING"
trap 'rm -rf "$STAGING"' EXIT

echo "==> Dumping the database"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
	pg_dump --no-owner --no-privileges -U "${POSTGRES_USER:-legalrag}" \
	-d "${POSTGRES_DB:-legalrag}" > "$STAGING/dump.sql"

test -s "$STAGING/dump.sql" || { echo "dump is empty; aborting" >&2; exit 1; }

echo "==> Copying uploaded documents"
mkdir -p "$STAGING/documents"
docker compose -f "$COMPOSE_FILE" cp api:/data/documents/. "$STAGING/documents/" || \
	echo "    (no documents to copy)"

echo "==> Backing up"
restic backup --tag alsigil --host alsigil-box "$STAGING"

echo "==> Pruning old snapshots"
restic forget --tag alsigil \
	--keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "==> Done"
restic snapshots --tag alsigil --latest 1
```

- [ ] **Step 5: Write the systemd units**

`deploy/alsigil-backup.service`:

```ini
[Unit]
Description=alsigil nightly encrypted backup to R2
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/opt/alsigil/deploy/backup.sh
User=root
StandardOutput=journal
StandardError=journal
```

`deploy/alsigil-backup.timer`:

```ini
[Unit]
Description=Run the alsigil backup nightly

[Timer]
# 02:30 Africa/Cairo, well clear of the working day.
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

- [ ] **Step 6: Install and run it once by hand**

```bash
scp deploy/backup.sh deploy/alsigil-backup.service deploy/alsigil-backup.timer deploy@<box-ip>:/tmp/
ssh deploy@<box-ip>
sudo timedatectl set-timezone Africa/Cairo
sudo install -m 0755 /tmp/backup.sh /opt/alsigil/deploy/backup.sh
sudo install -m 0644 /tmp/alsigil-backup.service /etc/systemd/system/
sudo install -m 0644 /tmp/alsigil-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start alsigil-backup.service
sudo journalctl -u alsigil-backup.service --no-pager -n 40
```

Expected: the log ends with `==> Done` and one snapshot listed.

- [ ] **Step 7: Enable the timer**

```bash
sudo systemctl enable --now alsigil-backup.timer
systemctl list-timers alsigil-backup.timer --no-pager
```

Expected: the timer is listed with a next elapse time tomorrow at 02:30.

- [ ] **Step 8: Commit**

```bash
git add deploy/backup.sh deploy/alsigil-backup.service deploy/alsigil-backup.timer
git commit -m "Send an encrypted copy somewhere Hetzner cannot lose it"
```

---

## Task 9: The restore test

This is Phase 0's actual completion criterion. Written as a script rather than performed once, so it stays re-runnable — an untested backup is indistinguishable from no backup until the day it matters.

**Files:**
- Create: `deploy/restore_check.sh`

**Interfaces:**
- Consumes: snapshots produced by Task 8.
- Produces: a pass/fail restore verification, re-runnable monthly in about a minute.

- [ ] **Step 1: Write `deploy/restore_check.sh`**

```bash
#!/usr/bin/env bash
# Restores the latest snapshot into a throwaway Postgres container and checks
# that what comes back is actually usable. Touches nothing in production.
#
# Run monthly:  sudo /opt/alsigil/deploy/restore_check.sh
set -euo pipefail

ENV_FILE=/opt/alsigil/.env
WORK=/var/tmp/alsigil-restore-check
CONTAINER=alsigil-restore-check
PGPASS=restorecheck

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

cleanup() {
	docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
	rm -rf "$WORK"
}
trap cleanup EXIT

rm -rf "$WORK"
mkdir -p "$WORK"

echo "==> Restoring the latest snapshot"
restic restore latest --tag alsigil --target "$WORK"

DUMP=$(find "$WORK" -name dump.sql -type f | head -1)
test -n "$DUMP" || { echo "no dump.sql in the snapshot" >&2; exit 1; }
echo "    restored $(du -h "$DUMP" | cut -f1) of SQL"

echo "==> Starting a throwaway Postgres"
docker run -d --name "$CONTAINER" \
	-e POSTGRES_PASSWORD="$PGPASS" \
	-e POSTGRES_USER=legalrag \
	-e POSTGRES_DB=legalrag \
	pgvector/pgvector:pg16 >/dev/null

for _ in $(seq 1 30); do
	if docker exec "$CONTAINER" pg_isready -U legalrag -d legalrag >/dev/null 2>&1; then
		break
	fi
	sleep 1
done

echo "==> Loading the dump"
docker exec -i "$CONTAINER" psql -q -U legalrag -d legalrag < "$DUMP" >/dev/null

echo "==> Checking the corpus survived"
ARTICLES=$(docker exec "$CONTAINER" psql -tAX -U legalrag -d legalrag \
	-c "SELECT count(*) FROM articles")
EMBEDDED=$(docker exec "$CONTAINER" psql -tAX -U legalrag -d legalrag \
	-c "SELECT count(*) FROM articles WHERE embedding IS NOT NULL")
echo "    articles: $ARTICLES (embedded: $EMBEDDED)"
test "$ARTICLES" -gt 0 || { echo "restored corpus is empty" >&2; exit 1; }
test "$EMBEDDED" -gt 0 || { echo "restored corpus has no embeddings" >&2; exit 1; }

echo "==> Checking vector search works on the restored copy"
# Row counts do not prove this. The HNSW index and the halfvec type have to
# survive too, and a dump that loses them looks perfectly healthy until a query.
docker exec "$CONTAINER" psql -tAX -U legalrag -d legalrag -c \
	"SELECT id FROM articles WHERE embedding IS NOT NULL
	 ORDER BY embedding <=> (SELECT embedding FROM articles
	                         WHERE embedding IS NOT NULL LIMIT 1)
	 LIMIT 5" >/dev/null

echo "==> Checking the documents came across"
DOCS=$(find "$WORK" -path '*/documents/*' -type f | wc -l)
echo "    document files in the snapshot: $DOCS"

echo
echo "RESTORE CHECK PASSED"
```

- [ ] **Step 2: Install it on the box**

```bash
scp deploy/restore_check.sh deploy@<box-ip>:/tmp/
ssh deploy@<box-ip> 'sudo install -m 0755 /tmp/restore_check.sh /opt/alsigil/deploy/restore_check.sh'
```

- [ ] **Step 3: Run it — this is the Phase 0 gate**

```bash
ssh deploy@<box-ip> 'sudo /opt/alsigil/deploy/restore_check.sh'
```

Expected: ends with `RESTORE CHECK PASSED`, and a non-zero article count matching what `cutover_verify.py` reported in Task 7.

**Do not proceed to Task 12 until this passes.** Closing the old hosting accounts before a restore has actually succeeded is the one irreversible step in this plan.

- [ ] **Step 4: Verify production was untouched**

```bash
curl -s https://alsigil.com/api/health | head -c 200
ssh deploy@<box-ip> 'docker ps --format "{{.Names}}"'
```

Expected: healthy JSON, and no `alsigil-restore-check` container left behind.

- [ ] **Step 5: Commit**

```bash
git add deploy/restore_check.sh
git commit -m "Make the backup something we have actually restored"
```

---

## Task 10: Monitoring

**Files:**
- Modify: `src/legalrag/api.py`
- Modify: `src/legalrag/email.py`
- Modify: `pyproject.toml`
- Create: `scripts/disk_alert.py`
- Create: `tests/test_disk_alert.py`
- Create: `deploy/alsigil-diskalert.service`, `deploy/alsigil-diskalert.timer`

**Interfaces:**
- Consumes: `SENTRY_DSN`, `ALERT_EMAIL_TO`, `RESEND_API_KEY` from `/opt/alsigil/.env`.
- Produces: `send_plain_email(to_email: str, subject: str, body: str) -> None` in `src/legalrag/email.py`; Sentry error reporting on the API; an external uptime check; a nightly disk alert.

**Context:** `src/legalrag/email.py` currently exposes exactly one function, `send_invite_email(to_email, organization_name, accept_url)`, which hardcodes the invitation subject and HTML body. There is no generic sender. Rather than duplicating the Resend call in the alert script, add a plain-text sibling that reuses `FROM_ADDRESS`, `RESEND_API_URL` and `EmailError`. Do not modify `send_invite_email` — the invitation flow depends on it.

- [ ] **Step 1: Write the failing test**

Create `tests/test_disk_alert.py`:

```python
from __future__ import annotations

from scripts.disk_alert import should_alert, format_alert


def test_no_alert_below_the_threshold():
    assert should_alert(used_percent=61.0, threshold=80.0) is False


def test_alerts_at_the_threshold():
    """At exactly 80% the disk is already a problem worth an email."""
    assert should_alert(used_percent=80.0, threshold=80.0) is True


def test_alerts_above_the_threshold():
    assert should_alert(used_percent=94.2, threshold=80.0) is True


def test_alert_names_the_number_and_the_usual_cause():
    message = format_alert(used_percent=91.5, free_gb=3.4)

    assert "91.5" in message
    assert "3.4" in message
    assert "docker" in message.lower()
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/test_disk_alert.py -v`

Expected: collection error — `ModuleNotFoundError: No module named 'scripts.disk_alert'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/disk_alert.py`:

```python
"""Emails when the box's disk is filling up.

A full disk is the likeliest way this box falls over: Postgres cannot write,
and an uptime monitor only reports it once it is already an outage. This is the
check that arrives before that.

Run nightly by alsigil-diskalert.timer.
"""
from __future__ import annotations

import os
import shutil
import sys

DEFAULT_THRESHOLD_PERCENT = 80.0
BYTES_PER_GB = 1024**3


def should_alert(used_percent: float, threshold: float) -> bool:
    return used_percent >= threshold


def format_alert(used_percent: float, free_gb: float) -> str:
    return (
        f"alsigil box disk is {used_percent:.1f}% full "
        f"({free_gb:.1f} GB free).\n\n"
        "Usual causes, in order of likelihood:\n"
        "  - docker image and build cache buildup: docker system df\n"
        "  - container logs: check max-size is set on every service\n"
        "  - leftover /var/tmp/alsigil-* staging from a backup or restore check\n"
    )


def disk_usage(path: str = "/") -> tuple[float, float]:
    """(used percent, free GB) for the filesystem containing `path`."""
    usage = shutil.disk_usage(path)
    used_percent = usage.used / usage.total * 100
    return used_percent, usage.free / BYTES_PER_GB


def main() -> int:
    threshold = float(
        os.environ.get("DISK_ALERT_THRESHOLD", DEFAULT_THRESHOLD_PERCENT)
    )
    used_percent, free_gb = disk_usage("/")

    if not should_alert(used_percent, threshold):
        print(f"disk at {used_percent:.1f}%, below {threshold:.0f}% threshold")
        return 0

    message = format_alert(used_percent, free_gb)
    recipient = os.environ.get("ALERT_EMAIL_TO")
    if not recipient:
        print(message, file=sys.stderr)
        # Exit 2, like a failed send: an alert nobody receives is not a
        # successful run, and SuccessExitStatus=0 1 would otherwise record
        # a permanently misconfigured box as healthy every night.
        print(
            "ALERT_EMAIL_TO is not set in /opt/alsigil/.env; the alert was "
            "printed instead of sent",
            file=sys.stderr,
        )
        return 2

    from legalrag.email import EmailError, send_plain_email

    try:
        send_plain_email(
            to_email=recipient,
            subject=f"[alsigil] disk {used_percent:.0f}% full",
            body=message,
        )
    except EmailError as exc:
        # Exit 2, not 1: the unit's SuccessExitStatus=0 1 covers "alerted",
        # so a delivery failure must land outside that set or systemd records
        # a silent failure to warn as a healthy run.
        print(
            f"disk at {used_percent:.1f}% but the alert could not be sent: {exc}",
            file=sys.stderr,
        )
        return 2

    print(f"alerted {recipient}: disk at {used_percent:.1f}%")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
```

Note: a delivery failure (`EmailError` from `send_plain_email` -- an expired
Resend key, an outage, a rejected sender) must not exit 1. Exit 1 is what the
service unit's `SuccessExitStatus=0 1` treats as a normal, already-alerted run;
if a failed send also exited 1, the alert could stay broken indefinitely with
nothing but an unread `journalctl` traceback to show for it, right up until the
disk actually fills and there is no warning at all. So delivery failure gets
its own exit code, 2, deliberately left outside that success set.

The same reasoning applies to an unset `ALERT_EMAIL_TO`: a box where the
recipient was never configured in `/opt/alsigil/.env` is not a working alert
either, so that branch exits 2 too rather than 1 -- a one-time provisioning
omission is at least as likely as a Resend outage, and just as silent under
`SuccessExitStatus=0 1` if left at exit 1.

- [ ] **Step 4: Add the generic sender to `src/legalrag/email.py`**

`send_invite_email` hardcodes the invitation subject and HTML. Add a plain-text
sibling below it, reusing the same constants and error type:

```python
def send_plain_email(to_email: str, subject: str, body: str) -> None:
    """A plain-text message. Used by operational alerts, which have no template.

    Separate from send_invite_email rather than a generalisation of it: that
    function's subject and HTML are part of the invitation flow's behaviour and
    are asserted by tests/test_invites.py.
    """
    response = httpx.post(
        RESEND_API_URL,
        headers={"Authorization": f"Bearer {get_resend_api_key()}"},
        json={
            "from": FROM_ADDRESS,
            "to": [to_email],
            "subject": subject,
            "text": body,
        },
        timeout=15.0,
    )
    if response.status_code >= 400:
        raise EmailError(
            f"Resend returned {response.status_code}: {response.text[:300]}"
        )
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `uv run pytest tests/test_disk_alert.py tests/test_email.py -v`

Expected: the 4 new tests pass, and the existing email tests still pass —
`send_invite_email` was not touched.

- [ ] **Step 6: Install the disk alert units**

`deploy/alsigil-diskalert.service`:

```ini
[Unit]
Description=alsigil disk space alert

[Service]
Type=oneshot
WorkingDirectory=/opt/alsigil/deploy
# `exec` against the already-running api container, not `run --rm`. Two reasons,
# both of which made the `run --rm` form unable to work at all:
#   1. GHCR is authenticated as the deploy user, so a pull triggered by `run`
#      under any other account fails on credentials.
#   2. `run` resolves the image through IMAGE_TAG, which is unset in a systemd
#      environment and therefore falls back to :latest -- and after a rollback
#      :latest is precisely the image that was rolled back for being broken.
# `exec` uses the container that is actually serving traffic, and inherits its
# environment from `env_file:` in the compose file, so no EnvironmentFile is
# needed here (and one would only add a second, drifting copy of the secrets).
ExecStart=/usr/bin/docker compose -f /opt/alsigil/deploy/docker-compose.prod.yml exec -T api python scripts/disk_alert.py
# Must match the account GHCR and the compose files are owned by: root has no
# registry credentials and cannot read /opt/alsigil/.env (root:deploy 0640).
User=deploy
# The script exits 1 when it alerts, which is informational, not a unit failure.
# It exits 2 when the alert could not be delivered -- either the send failed
# (e.g. Resend rejects the key) or ALERT_EMAIL_TO was never configured -- and
# that is deliberately left outside this set, so systemd records it as a real
# unit failure instead of a silent "healthy" run.
SuccessExitStatus=0 1
```

`deploy/alsigil-diskalert.timer`:

```ini
[Unit]
Description=Check alsigil disk space nightly

[Timer]
OnCalendar=*-*-* 07:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Note: the container sees its own filesystem, which shares the host's disk on this single-box setup, so `shutil.disk_usage("/")` reports the number that matters.

Because the unit uses `exec`, the `api` container must already be running — install this after Task 6's first successful deploy, not before. That dependency is deliberate: if `api` is down, the disk alert failing loudly is more useful than it quietly starting a second copy of the application from a `:latest` image nobody chose.

```bash
scp deploy/alsigil-diskalert.service deploy/alsigil-diskalert.timer deploy@<box-ip>:/tmp/
ssh deploy@<box-ip>
sudo install -m 0644 /tmp/alsigil-diskalert.service /etc/systemd/system/
sudo install -m 0644 /tmp/alsigil-diskalert.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start alsigil-diskalert.service
sudo journalctl -u alsigil-diskalert.service --no-pager -n 20
sudo systemctl enable --now alsigil-diskalert.timer
```

Expected: a line like `disk at 23.4%, below 80% threshold`.

- [ ] **Step 7: Add Sentry to the API**

In `pyproject.toml`, add to `dependencies`:

```toml
    # Error reporting. Uptime tells us that something broke; this tells us what,
    # which on a single-operator deployment is most of the recovery time.
    "sentry-sdk[fastapi]>=2.0",
```

Run: `uv lock && uv sync`

In `src/legalrag/api.py`, immediately after the existing imports and before `app` is created:

```python
# Error reporting, opt-in by configuration: without SENTRY_DSN this is inert,
# which is what keeps local runs and tests from reporting anything.
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=_sentry_dsn,
        # Errors only. Performance tracing on a 2 vCPU box costs more than the
        # data is worth at this stage.
        traces_sample_rate=0.0,
        # Legal questions are privileged. Never ship request bodies.
        send_default_pii=False,
    )
```

If `os` is not already imported at the top of `api.py`, add `import os`.

- [ ] **Step 8: Verify the API still starts and tests still pass**

```bash
uv run pytest -q
uv run uvicorn legalrag.api:app --port 8001 &
sleep 3 && curl -s localhost:8001/api/health | head -c 80 && kill %1
```

Expected: the suite passes, and the health endpoint answers.

- [ ] **Step 9: Set up the external uptime check**

Create a free UptimeRobot (or Better Stack) monitor:

- Type: HTTPS, URL `https://alsigil.com/api/health`, interval 5 minutes.
- Keyword monitoring on `"status":"ok"` if available — it distinguishes "Caddy answered" from "the app is actually healthy".
- Alert contact: your email.

Verify by pausing the `api` container briefly and confirming an alert arrives:

```bash
ssh deploy@<box-ip> 'cd /opt/alsigil/deploy && docker compose -f docker-compose.prod.yml stop api'
# wait for the alert, then:
ssh deploy@<box-ip> 'cd /opt/alsigil/deploy && docker compose -f docker-compose.prod.yml start api'
```

- [ ] **Step 10: Commit**

```bash
git add pyproject.toml uv.lock src/legalrag/api.py src/legalrag/email.py \
  scripts/disk_alert.py tests/test_disk_alert.py \
  deploy/alsigil-diskalert.service deploy/alsigil-diskalert.timer
git commit -m "Find out what broke, and that the disk is filling, before a user does"
```

---

## Task 11: Security one-pager and subprocessor list

**Files:**
- Create: `docs/security.md` (English)
- Create: `docs/security.ar.md` (Arabic)

**Interfaces:**
- Consumes: the decisions made in Tasks 4, 8, and 9.
- Produces: a document that can be handed to a firm's IT contact.

**Constraint carried from the spec:** the document makes **no claim about model training or retention**, because the answer path runs on a free OpenRouter endpoint whose free tier generally requires prompt logging to be enabled. Claiming otherwise would be false. Egyptian data residency is named as an open question rather than answered.

- [ ] **Step 1: Confirm the OpenRouter privacy setting before writing**

Open the OpenRouter account's privacy settings and record whether prompt logging/training is enabled. Whatever the answer, the document stays silent on retention — but you need to know the true state before publishing anything nearby.

- [ ] **Step 2: Write `docs/security.md`**

```markdown
# Security and data handling

Last updated: 2026-08-14

## Where your data is stored

All application data — matters, clients, documents, time entries, and the legal
corpus — is stored on a single dedicated server hosted by Hetzner Online GmbH in
Falkenstein, Germany (European Union). Hetzner's facilities are ISO 27001
certified.

## Who can reach it

- The database is not reachable from the internet. It accepts connections only
  from the application containers on the same host.
- Administrative access is by SSH public key only. Password authentication and
  direct root login are disabled.
- The firewall permits inbound traffic on ports 22, 80, and 443 and nothing else.
- All traffic between your browser and the application is encrypted with TLS.

## Backups

A full backup runs nightly. It is encrypted on our server, before transmission,
using restic with a key that is not stored on that server. Encrypted backups are
held by Cloudflare R2 — a different provider from the one hosting the
application, so that losing access to one does not mean losing both.

Retention: 7 daily, 4 weekly, and 6 monthly snapshots.

Restores are tested, not assumed. We restore the most recent backup into an
isolated environment and verify that the data and search functionality come back
intact.

## Subprocessors

| Provider | Purpose | Location |
| --- | --- | --- |
| Hetzner Online GmbH | Application and database hosting | Germany (EU) |
| Cloudflare, Inc. | Encrypted backup storage | Global |
| Clerk, Inc. | Authentication and user accounts | United States |
| Resend | Transactional email | United States |
| NVIDIA Corporation | Text embeddings for legal search | United States |
| OpenRouter, Inc. | Language model routing for generated answers | United States |

## Open questions we would rather state than leave you to discover

**Data residency.** Data is stored in the European Union, not in Egypt. Egypt's
Personal Data Protection Law (Law 151/2020) governs cross-border transfer of
personal data. If your practice requires data to remain within Egypt, this is
not currently satisfied, and we would want to discuss it before you commit.

**Generated answers.** Questions submitted to the AI assistant are processed by
a third-party language model provider. We are in the process of moving this to a
provider with a contractual zero-retention agreement, and we will update this
document when that is in place. Until then we make no representation about
retention or model training for that specific feature. Legal research and
document search do not involve this path.

## Contact

Security questions: <your email>
```

- [ ] **Step 3: Write `docs/security.ar.md`**

Translate the English document. Requirements carried from the rest of the product (see the `legalos-arabic-first` conventions): Arabic body text, **Western digits** for all numbers, ports, and dates. Keep the table structure identical to the English version so the two can be diffed against each other.

The two open questions must appear in the Arabic version with the same force. A security document that is candid in English and reassuring in Arabic is worse than not publishing one.

- [ ] **Step 4: Verify both render**

Run: `uv run python -c "from pathlib import Path; [print(p, len(p.read_text(encoding='utf-8').splitlines()), 'lines') for p in [Path('docs/security.md'), Path('docs/security.ar.md')]]"`

Expected: both files exist with comparable line counts.

- [ ] **Step 5: Commit**

```bash
git add docs/security.md docs/security.ar.md
git commit -m "Say what we actually do with a firm's data, in both languages"
```

---

## Task 12: Decommission the old hosting

**Do not start this task until Task 9's restore check has passed.** This is the only irreversible step in the plan.

**Files:**
- Delete: `railway.json`
- Modify: `docs/deployment.md`

- [ ] **Step 1: Confirm the two-week grace period has elapsed**

Check the date of the Task 7 cutover commit:

```bash
git log --format="%ad %s" --date=short -- scripts/cutover_verify.py | tail -1
```

Two weeks must have passed, `https://alsigil.com` must have been serving from the box throughout, and the restore check must have passed at least once.

- [ ] **Step 2: Take a final dump from Neon and keep it**

```bash
pg_dump --no-owner --no-privileges --format=custom \
  --file=~/alsigil-neon-final-$(date +%Y%m%d).dump "$NEON_URL"
```

Store it somewhere durable. It costs nothing and is the last copy of the pre-migration state.

- [ ] **Step 3: Rewrite `docs/deployment.md`**

The current file describes deploying to Vercel, Railway, and Neon and is now actively misleading. Replace its contents entirely:

````markdown
# Deploying alsigil

One box, one origin, one deploy command.

| Piece | Where |
| --- | --- |
| Everything | A single Hetzner CX22 in Falkenstein, Germany |

Caddy terminates TLS on `alsigil.com` and serves both services from that one
origin: `/api/*` goes to the FastAPI container, everything else to the Next.js
container. Because the browser never makes a cross-origin request, CORS is not
configured in production — `LEGALOS_CORS_ORIGINS` matters only for local
development, where the Next dev server on `:3000` calls the API on `:8000`.

## Deploying

Push to `main`. GitHub Actions builds both images, pushes them to GHCR, then
SSHes to the box to pull, migrate, and swap the containers. If the post-deploy
smoke check fails, the workflow redeploys the previous image and fails the run.

Images are never built on the box. `next build` on a 2 vCPU machine would
compete for memory with the database it is being deployed alongside, and an
out-of-memory kill during a build would take the site down as collateral.

## Rolling back

```sh
gh workflow run deploy.yml -f image_tag=<git-sha>
```

Seconds, no rebuild. The currently deployed tag is in
`/opt/alsigil/deploy/.current_tag` on the box.

## Migrations

Run as a discrete step before the container swap, so a failed migration aborts
the deploy rather than leaving a container crash-looping against a half-applied
schema.

Migrations must be backward-compatible with the currently-deployed code: add
columns, never rename or drop in the same deploy. There is one API container and
no staging, so a migration that requires the new code to already be running will
produce an outage.

## Backups

Nightly at 02:30 Africa/Cairo, via `alsigil-backup.timer`. A `pg_dump` plus the
uploaded documents, encrypted client-side by restic and pushed to Cloudflare R2.
Retention is 7 daily, 4 weekly, 6 monthly.

Verify the backups monthly — this restores into a throwaway container and
touches nothing in production:

```sh
ssh deploy@<box> 'sudo /opt/alsigil/deploy/restore_check.sh'
```

The restic repository password is in the password manager, not only on the box.
A copy that exists only on the machine being backed up is not a backup.

## Files

| Path | What it is |
| --- | --- |
| `deploy/docker-compose.prod.yml` | The production stack |
| `deploy/Caddyfile` | TLS and single-origin routing |
| `deploy/provision.sh` | Rebuilds the box baseline from scratch |
| `deploy/backup.sh`, `deploy/restore_check.sh` | Backup and its verification |
| `deploy/env.example` | Template for `/opt/alsigil/.env` |
| `.github/workflows/build.yml`, `deploy.yml` | CI |

The root `docker-compose.yml` is the **local development** stack. It publishes
`5432` on purpose; the production file deliberately does not.
````

- [ ] **Step 4: Delete the Railway configuration**

```bash
git rm railway.json
```

- [ ] **Step 5: Close the accounts**

In this order, checking `https://alsigil.com/api/health` after each:

1. **Vercel** — delete the project.
2. **Railway** — delete the service, then the project.
3. **Neon** — delete the project. You have the final dump from Step 2.

- [ ] **Step 6: Verify nothing depended on them**

```bash
uv run --with httpx python scripts/smoke_check.py https://alsigil.com
grep -rn "vercel\|railway\|neon" --include="*.py" --include="*.ts" --include="*.tsx" \
  --include="*.mjs" --include="*.json" --include="*.yml" . \
  | grep -v node_modules | grep -v ".venv" | grep -v "docs/"
```

Expected: the smoke check passes, and the grep returns nothing outside `docs/`. Any hit is a live reference to hosting that no longer exists.

- [ ] **Step 7: Commit**

```bash
git add -A docs/deployment.md railway.json
git commit -m "Close the door on the hosting we no longer use"
git push
```

- [ ] **Step 8: Confirm every Phase 0 completion criterion**

| Criterion | How to confirm |
| --- | --- |
| Serves from Hetzner over TLS, one origin | `curl -sI https://alsigil.com` → `HTTP/2 200`; `curl -s https://alsigil.com/api/health` → `"status":"ok"` |
| `git push` deploys with auto-rollback | The last `Deploy` run is green; rollback exercised in Task 6 Step 7 |
| Restore has been performed | `restore_check.sh` printed `RESTORE CHECK PASSED` |
| Uptime, Sentry, log rotation, disk alert live | Monitor is green; `systemctl list-timers` shows both timers; `docker inspect` shows `max-size` |
| Vercel, Railway, Neon closed | Consoles show no projects |
| One-pager published in both languages | `docs/security.md`, `docs/security.ar.md` |

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task: single origin and the five required changes → Tasks 1–2; box baseline → Task 4; CI build → Task 5; health gate, auto-rollback, restart window, migrations rule → Tasks 3 and 6; cutover with both pre-flight checks → Task 7; restic/R2 backups and the off-box password → Task 8; restore test → Task 9; monitoring including the cut of log aggregation → Task 10; one-pager with both deliberate omissions → Task 11; account closure and doc rewrite → Task 12.

**One deliberate refinement.** The spec's risk table describes the frontend check as a deploy-time page load asserting an API call succeeds. Task 1 Step 7 and Task 5's final step implement it at build time instead, by grepping the compiled bundle for `localhost:8000`. That is a deterministic check on the exact artefact rather than an inference from a rendered page, and it fails before a broken image can ever be pushed. Task 3 covers the runtime half — is the stack up and serving through Caddy.

**Known verification gaps, called out rather than papered over:**

- Task 7 Step 10 offers an SSH tunnel to run `cutover_verify.py`, which requires Postgres on the box's loopback. Since the production compose deliberately does not publish it, the fallback — running the script inside the `api` container — may be the only path. Both are listed.
- Steps that touch external consoles (Hetzner, Cloudflare R2, UptimeRobot, Sentry, DNS) cannot be verified from the repository. Each is followed by a command that confirms the result from outside.

**Type consistency check.** `check_api_health` / `check_frontend_serves` are named identically in `scripts/smoke_check.py` and `tests/test_smoke_check.py`. `compare_counts(source, target) -> list[str]` matches between `cutover_verify.py` and its test. `should_alert(used_percent, threshold)` and `format_alert(used_percent, free_gb)` match between `disk_alert.py` and its test. `send_plain_email(to_email, subject, body)` is defined in Task 10 Step 4 and called with those exact keyword names in Step 3. The compose service names `api`, `web`, `postgres`, `caddy` are consistent across the Caddyfile, the compose file, and both workflows.
