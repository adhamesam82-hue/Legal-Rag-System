# Phase 0 — Own the Infrastructure

**Status:** approved, ready for planning
**Date:** 2026-08-14
**Scope:** roadmap Phase 0 only. Phases 1–3 get their own spec each.

## Goal

Move LegalOS off Vercel, Railway, and Neon onto one Hetzner box with one bill
and one deploy command. Nothing user-visible changes. When this is done, a
`git push` reaches production and a restore has actually been performed from
backup.

## Why this is one spec and not four

Phases 0–3 are independent subsystems: infrastructure migration, product
scoping, notifications plus a Flutter app, and offline caching. Each later
phase depends on decisions its predecessor has not made yet — Phase 2's
notification design needs the Phase 1 worker to exist, Phase 3's offline design
needs the Flutter app. Specifying them together means writing fiction for three
of the four. Each phase gets its own spec → plan → implement cycle.

## Starting state

Verified against the repository on 2026-08-14. None of Phase 0 exists:

| Thing | State |
| --- | --- |
| `docker-compose.yml` | Postgres only, for local dev. Publishes `5432:5432` |
| `.github/` | Does not exist |
| `web/Dockerfile` | Does not exist |
| `next.config.mjs` | No `output: "standalone"` |
| Root `Dockerfile` | API only; `.dockerignore` excludes `web/` |
| `railway.json`, `docs/deployment.md` | Describe the Vercel/Railway/Neon setup being replaced |
| Caddy, Redis, worker | None |

Facts that shape the design:

- Every FastAPI route is already under `/api` (`src/legalrag/api.py:411` onward).
- `web/app/api/` does not exist, so `/api/*` is unclaimed on the Next.js side.
- `NEXT_PUBLIC_API_BASE` is inlined at **build** time by the `env:` block in
  `web/next.config.mjs`, and read at `web/lib/api.ts:2`.
- CORS is maintained as an allowlist in `src/legalrag/config.py:117` with
  `allow_credentials` on and a bearer token in flight.
- The corpus is ~138 MB, almost all of it the 6,985-row `articles` table and
  its embeddings (`docs/deployment.md`).
- `LEGALOS_DOCUMENT_ROOT` is a filesystem path, not a database column.

## Decisions taken during design

| Decision | Call | Why |
| --- | --- | --- |
| Disk encryption | **No LUKS.** Encrypt backups only | LUKS with manual unlock makes every reboot an outage; LUKS with the key on the box protects against nothing. The realistic risk is a leaked credential, which LUKS does not address |
| Answer LLM | **Keep OpenRouter, free model** | Deferred to a later phase. Consequence: the security one-pager cannot claim zero-retention, and must stay silent on model training |
| Staging | **Deferred to Phase 1** | With zero users, `main` → production is the staging environment. Staging earns its RAM when a firm enters real matters |
| CI deploy pipeline | **In scope** | Cheap to build now while nothing can break; the manual `ssh && git pull` loop gets old within a week |
| Where images are built | **In CI, not on the box** | Deviates from the roadmap. See Section 2 |
| Backup target | **Cloudflare R2 + restic** | Free at this size, and survives loss of the Hetzner account — which a Hetzner Storage Box does not |
| Log aggregation | **Cut.** Rotation only | On one box, `docker compose logs` is centralized. Loki/Grafana would cost ~500 MB of 4 GB |

---

## Section 1 — Architecture: one box, one origin

```text
                  alsigil.com  (A + AAAA → box IP)
                          │
                  ┌───────▼────────┐
                  │     Caddy      │  auto-TLS, single origin
                  │  /api/*  ──────┼──→ api:8000    (FastAPI)
                  │  /*      ──────┼──→ web:3000    (Next.js standalone)
                  └────────────────┘
                          │
                    postgres:5432   (pgvector/pg16, internal only)

  volumes: pgdata · documents · caddy_data
```

Hetzner CX22 (2 vCPU, 4 GB, 40 GB), Ubuntu 24.04, Falkenstein. Resize to CPX31
under load.

### The single origin

Because every API route already lives under `/api` and Next.js claims nothing
there, Caddy serves both services from `alsigil.com` with no path rewriting and
no second certificate.

The payoff is that **CORS stops existing in production**. Today the browser
calls the API cross-origin, which is why `config.py:117` maintains an origin
allowlist with `allow_credentials` enabled and a bearer token in flight — a
configuration that must stay correct forever and whose failure mode is
credential theft. Same-origin makes `LEGALOS_CORS_ORIGINS` vestigial in
production. The function stays, because local development still calls `:8000`
from `:3000`.

### Changes this requires

1. **`web/Dockerfile` (new)** with `web/` as its own build context and its own
   `.dockerignore`. The root `.dockerignore` excludes `web/`, which is correct
   for the API image and must not change.
2. **`output: "standalone"` in `web/next.config.mjs`.** Not set today.
3. **`NEXT_PUBLIC_API_BASE=""`, passed as a Docker build arg.** It is inlined at
   build time, so a runtime environment variable has no effect. Getting this
   wrong fails silently: the browser calls `localhost:8000` and every request
   dies with no server-side error.
4. **Production compose must not publish `5432`.** The current dev compose file
   does; Postgres is reachable only over the compose network in production.
5. **A volume mounted at `LEGALOS_DOCUMENT_ROOT`.** Without it, uploaded files
   vanish on redeploy while the database rows keep pointing at them.

No Redis and no worker container — that is Phase 1.

---

## Section 2 — Provisioning and the deploy pipeline

### Box baseline

Scripted rather than performed by hand, so it is reproducible:

- Deploy user in the `docker` group. Root SSH and password authentication both
  disabled; keys only.
- `ufw` allows 22, 80, 443 and nothing else.
- Secrets in `/opt/alsigil/.env`, root-owned, `chmod 600`, referenced by
  `env_file:`. Never in git, never baked into an image.
- DNS: `alsigil.com` A and AAAA records to the box; `www` redirects.

### Pipeline

```text
push to main
   └─ GH Actions: build api image + web image  (NEXT_PUBLIC_API_BASE="" build arg)
      └─ push both to GHCR, tagged :sha and :latest
         └─ ssh box: docker compose pull
                     docker compose run --rm api python scripts/migrate.py
                     docker compose up -d
                     health gate → auto-rollback on failure
```

**Images are built in CI, not on the box.** This deviates from the roadmap's
`docker compose up -d --build`. Building on the box runs `next build` on 2 vCPU
and 4 GB while Postgres and the live site use the same memory; an OOM during a
build takes the site down as collateral, turning a deploy failure into an
outage. Building in CI keeps the failure-prone step somewhere failure is free —
a broken build never opens an SSH connection, and production keeps serving the
old image.

It also makes rollback free. Images are tagged with the commit SHA, so
reverting is `IMAGE_TAG=<old-sha> docker compose up -d`: seconds, no rebuild.
On a box with no staging, fast rollback is the safety net.

### Health gate and auto-rollback

After `up -d`, the workflow runs two checks. First it polls `/api/health` until
it returns 200. Then it loads a page through Caddy and asserts that the
page's API call succeeds — this second check exists because a missing
`NEXT_PUBLIC_API_BASE` build arg produces a perfectly healthy API and a
completely broken frontend, and `/api/health` alone would report success.

If either check fails within 30 seconds, the workflow re-deploys the previous
SHA and then fails. This covers what CI cannot catch — an image that compiles
cleanly and is broken at runtime — and is the difference between broken for
twenty seconds and broken until someone notices.

### The restart window

`docker compose up -d` stops the old container and starts the new one, leaving
roughly 5–15 seconds while FastAPI boots and connects to Postgres. The
Caddyfile sets `reverse_proxy api:8000 { lb_try_duration 15s }` so Caddy holds
and retries across that window instead of returning 502. This is not
zero-downtime; it converts a visible error into one slow request. True rolling
deploys are a Phase 1 addition, alongside staging.

### Migrations

Run as a discrete step before `up -d`, as the root `Dockerfile` header already
anticipates. One box and one API container means the concurrent-migration race
that comment warns about cannot occur here; keeping it separate means a failed
migration aborts the deploy rather than leaving a container crash-looping.

**Standing rule, written down now:** migrations must be backward-compatible
with the currently-deployed code. Add columns; do not rename or drop in the
same deploy. No pipeline design substitutes for this, and it is the one failure
mode in this section that can lose data.

---

## Section 3 — Data cutover and backups

### Cutover

Zero clients means one clean move rather than a dual-write migration.

1. `pg_dump --no-owner --no-privileges` from Neon — everything, not only the
   corpus. Practice data, organizations, invitations and conversations all
   matter.
2. Restore into the box's empty Postgres, then run `scripts/migrate.py` to
   confirm the schema is at head. It is idempotent, so this is a check.
3. **Verify before flipping DNS.** Row counts prove rows arrived; they do not
   prove search works. The gating check is a live `/api/search` query returning
   sane results, because that exercises the embeddings and the `halfvec` index
   from migration `0004` end to end. A vector index that did not transfer
   cleanly is indistinguishable from a healthy database until someone searches.
4. Flip DNS.
5. Keep Neon and Railway alive but unused for two weeks, then close them along
   with Vercel.

Two items to confirm before dump day:

- **pgvector version compatibility.** `halfvec` requires pgvector ≥ 0.7.0.
  Check Neon's version and the `pgvector/pgvector:pg16` image's version. A
  mismatch surfaces at restore time.
- **Whether uploaded documents still exist.** If Railway had no volume mounted
  at `LEGALOS_DOCUMENT_ROOT`, the files are already gone and this step becomes
  a data-loss finding rather than a copy.

### Backups

Nightly systemd timer on the host — not a container, since there is no worker
until Phase 1.

```text
pg_dump  ──►  restic backup  ──►  Cloudflare R2
              (+ documents volume)
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
```

The documents volume goes into the same snapshot. A database backup that omits
the files its rows reference is not a restorable system.

Size stays trivial: with no deduplication at all, 17 retained snapshots at
~200 MB each is ~3.4 GB, inside R2's free 10 GB. restic's content-defined
chunking will do better, since the embeddings barely change night to night.

**The restic repository password must be stored off the box.** A password held
only in `/opt/alsigil/.env` protects an archive that becomes unopenable the
moment the machine is lost — the exact scenario backups exist for. Password
manager or offline copy.

### Restore test

The phase's actual completion criterion, and a script rather than a one-time
ritual: `scripts/restore_check.sh` pulls the latest snapshot into a throwaway
Postgres container, runs `migrate.py`, asserts row counts, and runs one real
search query. Scripting it makes it re-runnable monthly in about a minute. An
untested backup is indistinguishable from no backup until the day it matters.

---

## Section 4 — Monitoring and the security one-pager

### Monitoring

- **External uptime check** (UptimeRobot or Better Stack free tier) against
  `https://alsigil.com/api/health` every 5 minutes. External because a checker
  on the box cannot report that the box is gone.
- **Sentry free tier** on FastAPI and Next.js. Uptime reports that something
  broke; Sentry reports what. On a solo operation that gap is most of the
  recovery time.
- **Docker `json-file` logging with rotation** (`max-size: 10m`,
  `max-file: 3`), set in the compose file. Unrotated JSON logs grow without
  limit and fill the 40 GB disk, which takes Postgres down with it.
- **Disk-space alert.** Nightly check, email at 80% via Resend, which is
  already integrated. Not in the roadmap, but it catches the failure an uptime
  monitor only reports once it is already an outage.

Log aggregation (Loki/Grafana) is cut. It solves a problem that begins at box
number two and would cost ~500 MB of 4 GB.

### Security one-pager

Arabic and English, covering:

- Data stored at Hetzner Falkenstein, Germany (EU).
- Access limited to key-only SSH; no publicly reachable database port.
- Backups encrypted client-side before leaving the box, stored with a separate
  provider.
- Subprocessor list: Hetzner, Cloudflare, Clerk, Resend, NVIDIA, OpenRouter.

Two omissions are deliberate and stated as such:

- **No claim about model training or retention.** The answer path runs on a
  free OpenRouter endpoint, and OpenRouter's free endpoints generally require
  prompt logging to be enabled. Confirm the account's privacy setting. The
  claim becomes available when the answer path moves to a named zero-retention
  provider, in a later phase.
- **Egyptian data residency is named as an open question.** Law 151/2020 has
  cross-border transfer provisions and the data is in Germany. Naming it as
  open is defensible; having a firm discover it during due diligence is not.

---

## Done when

1. `alsigil.com` serves the app from Hetzner over TLS, API and web on one
   origin.
2. `git push` to `main` builds, deploys, health-checks, and auto-rolls-back on
   failure.
3. `scripts/restore_check.sh` has been run and passed.
4. Uptime, Sentry, log rotation, and the disk alert are live.
5. Vercel, Railway, and Neon accounts are closed, after the two-week grace
   period.
6. The security one-pager and subprocessor list are published in Arabic and
   English.

## Explicitly not in Phase 0

Staging, Redis and the worker, LUKS, the zero-retention provider migration,
centralized log aggregation, zero-downtime rolling deploys, and all
feature-flag and route work. Those belong to Phase 1 and later.

## Risks

| Risk | Mitigation |
| --- | --- |
| Single box is a single point of failure | Accepted at this stage. Backups are offsite and restore is tested |
| `NEXT_PUBLIC_API_BASE` build arg omitted | Fails silently in the browser. Add a smoke check to the health gate that loads a page and asserts an API call succeeds |
| pgvector version mismatch at restore | Confirm both versions before dump day |
| Uploaded documents already lost on Railway | Check before cutover; treat as a finding, not a step |
| restic password lost with the box | Stored off-box, in a password manager |
| Disk fills from logs or backups | Rotation configured, disk alert at 80% |
| Free OpenRouter endpoint logs prompts | One-pager makes no retention claim; revisit when the ZDR provider migration happens |
