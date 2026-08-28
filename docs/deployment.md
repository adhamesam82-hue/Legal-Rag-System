# Deploying LegalOS

Three pieces, deployed separately:

| Piece | Where | What it is |
| --- | --- | --- |
| Frontend | Vercel | Next.js app in `web/` |
| API | Railway / Render / Fly | FastAPI, built from the root `Dockerfile` |
| Database | Neon | Postgres 16 with the `vector` extension |

The frontend calls the API from the **browser**, so the API must be publicly
reachable and must allow the Vercel origin through CORS. Vercel cannot host the
API: it is a long-running ASGI app holding Postgres connections, and the corpus
needs pgvector.

Order matters — the database must exist before migrations, and the API must
have a URL before the frontend can be configured to call it.

---

## 1. Database (Neon)

1. Create a project at [neon.tech](https://neon.tech). Pick a region near your
   users; Frankfurt (`eu-central-1`) is the closest to Egypt.
2. Copy the pooled connection string. It looks like:
   `postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. Apply the schema from your machine:

   ```sh
   DATABASE_URL='<neon connection string>' uv run python scripts/migrate.py
   ```

   Migration `0001_init.sql` runs `CREATE EXTENSION IF NOT EXISTS vector`, which
   Neon supports. If it fails, enable the extension once in the Neon SQL editor
   and re-run.

### Moving the statute corpus across

A fresh Neon database has no statutes, so legal research and the AI assistant
return nothing until the corpus is loaded. It is ~138 MB, almost all of it the
6,985-row `articles` table and its embeddings — small enough to copy directly:

```sh
# Dump only the corpus tables from the local Docker Postgres.
docker exec phase1-corpus-infra-postgres-1 pg_dump -U legalrag -d legalrag \
  --data-only --table=instruments --table=articles --table=amendments \
  > corpus.sql

psql '<neon connection string>' -f corpus.sql
```

Run this *after* `migrate.py`, which creates the tables the dump fills.

Re-embedding from scratch instead would cost NVIDIA API calls for all 6,985
articles; copying is both cheaper and reproducible.

---

## 2. API (Railway, Render or Fly)

Any host that builds a `Dockerfile` works. The root `Dockerfile` builds the API
only — `web/` is excluded via `.dockerignore`.

- **Build**: the repository root, using `Dockerfile`
- **Start command**: already the image's `CMD`; the host's `$PORT` is honoured
- **Health check**: `GET /api/health`

On Railway, `railway.json` at the repository root already declares all of that:
the Dockerfile build, the health check, `python scripts/migrate.py` as a
pre-deploy command so migrations run once per deploy rather than at container
boot, and a single replica. Point a Railway service at this repo and it picks
the file up — nothing to configure in the dashboard except the variables below
and the volume.

**The volume cannot be declared in `railway.json`.** Add it in the dashboard,
mounted at `/data/documents`, before the first upload — see the warning below.

`numReplicas` is 1 deliberately. Each instance holds its own pool of up to 20
Postgres connections (`legalrag/db.py`), so replicas multiply that against
Neon's ceiling; raise both together or not at all.

### Environment variables

| Variable | Value | Why |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled connection string | Postgres |
| `CLERK_JWKS_URL` | production: `https://clerk.<your-domain>/.well-known/jwks.json` | Verifies session JWTs |
| `CLERK_SECRET_KEY` | `sk_live_…` (or `sk_test_…` for a staging deploy) | Clerk Backend API |
| `LEGALOS_CORS_ORIGINS` | the frontend's own origin, e.g. `https://alsigil.com` | Without this the browser blocks every API call |
| `NVIDIA_API_KEY` | your key | Embeddings for legal research |
| `OPENROUTER_API_KEY` | your key | Answering, if routed to OpenRouter |
| `RESEND_API_KEY` | your key | Invitation emails |
| `LEGALOS_DOCUMENT_ROOT` | `/data/documents` | Already set in the image |
| `LEGALOS_MAX_UPLOAD_BYTES` | optional | Upload ceiling; defaults to 25MB |
| `LEGALOS_RATE_LIMIT_PAID` | optional | Requests/min per caller to LLM routes; defaults to 30 |
| `LEGALOS_RATE_LIMIT_NORMAL` | optional | Requests/min per caller elsewhere; defaults to 300 |

### Date reminders

`deploy/alsigil-reminders.timer` sweeps once a morning at 06:00 Cairo and
mails everyone on a matter about hearings, procedural dates and tasks falling
3 days out, 1 day out, and that day. Install it alongside the disk alert:

```sh
sudo cp deploy/alsigil-reminders.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now alsigil-reminders.timer
```

Reminders go to `memberships.email`, which is backfilled from accepted
invitations by migration 0013. Anyone without one is REPORTED by the sweep
rather than skipped -- exit code 1, visible in `journalctl -u
alsigil-reminders` -- because a lawyer who silently never receives reminders
is the exact failure this exists to prevent. Set the missing addresses.

Exit codes: 0 all sent; 1 swept fine but somebody has no address on file;
2 a send failed or the database was unreachable, which is a real unit failure.

Safe to run by hand at any time -- each reminder is recorded per recipient,
subject and offset, and a unique index makes a repeat run a no-op:

```sh
docker compose -f deploy/docker-compose.prod.yml exec -T api   python scripts/send_reminders.py --dry-run
```

Day-based, not hour-based: `hearings.hearing_time` is free text ("10:00",
"الجلسة الأولى", empty), so there is nothing to compute an hours-before offset
against. That needs the column promoted to a real time first.

### Request ceilings and uploads

Every route that reaches a paid model -- `/api/ask`, `/api/ask/stream`,
`/api/search`, `/api/articles/{id}/explain` -- requires a session. There is no
anonymous path to an LLM call, and the deploy check below asserts it.

On top of that, `src/legalrag/ratelimit.py` caps requests per caller per
minute, in two tiers. The counters are in-process, which is correct while
`numReplicas` is 1; a second replica would give each its own share of the
ceiling. Move them to Redis when the worker lands.

Uploads are capped (25MB by default) and read in chunks, and a document is
served back with `Content-Disposition: attachment` and `nosniff` unless its
type is one a browser renders inertly. An uploaded `.html` is stored and
returned as an opaque download, never as a page on this origin.

**`LEGALOS_DEV_AUTH` must not be set.** It disables JWT verification and treats
every request as one user. It is opt-in and off unless explicitly set — leave it
that way.

**A custom domain needs a Clerk *production* instance.** The `pk_test_`/`sk_test_`
keys belong to a development instance, which is rate-limited and cannot
authenticate a custom domain. A production instance issues `pk_live_`/`sk_live_`
**and serves its JWKS from a different URL** — `https://clerk.<your-domain>/…`,
not `…clerk.accounts.dev`. Swapping the keys while leaving the old
`CLERK_JWKS_URL` in place makes every API call 403, which reads like a broken
deploy rather than a misconfigured one.

### Two things that will bite you

- **Uploaded documents need a persistent volume** mounted at
  `/data/documents`. Container filesystems are wiped on redeploy; without a
  volume, every `documents` row would point at a file that no longer exists.
- **Run migrations as a release step, not at container boot.** Hosts that run
  more than one instance would otherwise race two migrations against the same
  database. Either run `scripts/migrate.py` from your machine against
  `DATABASE_URL`, or configure a release command:

  ```sh
  python scripts/migrate.py
  ```

---

## 3. Frontend (Vercel)

Import the repository at [vercel.com/new](https://vercel.com/new) →
**Add New → Project → `adhamesam82-hue/Legal-Rag-System`**.

**Set Root Directory to `web`.** The repository root is a Python project;
without this, the build fails because Vercel finds no Next.js app.

Framework preset auto-detects as Next.js. Leave build and output settings alone.

### Environment variables

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE` | `https://<your-api-host>` — no trailing slash |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` (or `pk_test_…`) |
| `CLERK_SECRET_KEY` | matching `sk_…` key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |

`NEXT_PUBLIC_*` values are compiled into the client bundle and are public by
design. `CLERK_SECRET_KEY` is not — it stays server-side.

Anything prefixed `NEXT_PUBLIC_` is read at **build** time, so changing one
requires a redeploy, not just a restart.

---

## 4. Clerk

The `pk_test_` / `sk_test_` keys belong to a Clerk *development* instance:
usable for a staging deploy, but rate-limited and not intended for real users.
For production, create a production instance in Clerk, which issues `pk_live_` /
`sk_live_` keys and needs its own JWKS URL.

In the Clerk dashboard, add the Vercel domain under the instance's allowed
origins so sign-in redirects back correctly.

---

## 5. First run

The deployed database has no firm in it. After signing up through the deployed
app, either:

- create a firm from the "Set up your firm" screen the app shows you, or
- take ownership of the sample firm:

  ```sh
  DATABASE_URL='<neon connection string>' \
    uv run python scripts/seed_demo_firm.py --reset --owner-email you@example.com
  ```

The seeded firm is **sample content**, not real records — the same caveat that
applied when it lived in `web/lib/legalos-data.ts`. Do not leave it in a
database that also holds real client data.

---

## Verifying a deploy

```sh
# API is up and can reach Postgres (also reports corpus counts).
curl https://<your-api-host>/api/health

# Auth is enforced — this must be 403, never 200.
curl -o /dev/null -w '%{http_code}\n' https://<your-api-host>/api/orgs/me

# No anonymous path to a paid model -- this must be 401, never 200.
curl -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' \
  -d '{"question":"x","jurisdiction":"EG"}' https://<your-api-host>/api/ask
```

Then open the Vercel URL: signed out, it should redirect to `/sign-in`. If a
screen shows "Could not reach the API", check `NEXT_PUBLIC_API_BASE` and that
the Vercel origin is listed in `LEGALOS_CORS_ORIGINS`.
