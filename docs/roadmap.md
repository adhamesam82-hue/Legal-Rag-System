# Roadmap

The organizing model: **one platform, four clients, two cross-cutting capabilities.**

```
                    ┌─────────────────────────────┐
                    │   PLATFORM (Hetzner box)    │
                    │  FastAPI · Postgres+pgvector│
                    │  worker · Caddy             │
                    └──────────────┬──────────────┘
                                   │  one API
          ┌────────────┬───────────┼───────────┬────────────┐
          │            │           │           │            │
      web app     lawyer mobile  lawyer     consumer     landing
      (Next.js)    (Flutter)     desktop     mobile       (static)
       Clerk        Clerk       (same Flutter) Firebase
                                  build target

  cross-cutting: NOTIFICATIONS · OFFLINE
```

Clients are not projects to build in parallel. They are ordered. Capabilities
are built once in the platform and consumed by every client.

---

## Phase 0 — Own the infrastructure

**Goal:** one box, one bill, one deploy command. Nothing user-visible changes.

- Hetzner **CAX21** (4 vCPU Arm, 8 GB), Ubuntu 24.04, Falkenstein.
  Shared vCPU, not dedicated: this box waits on remote LLM APIs far more than
  it computes, so CCX would buy idle cores. Arm rather than x86 because the
  dev machine is an M1 — Docker builds are then native and identical in
  production. Resize within the CAX line under load; note that moving between
  architectures is a rebuild and restore, not a resize
- Docker Compose: Caddy (auto-TLS) · pgvector/pg16 · FastAPI · Next.js standalone
- Migrate off Vercel, Railway, Neon. **Keep Clerk** — see decisions below
- LUKS on the data volume
- Encrypted nightly `pg_dump` → Hetzner Storage Box, **plus one tested restore**
- GH Actions → SSH → `docker compose up -d --build`; migrations as a pre-deploy step
- Staging: second compose stack on the same box, separate DB
- Monitoring: uptime check + error tracking + centralized logs with retention
- Publish the subprocessor list; write the Arabic + English security one-pager

**Done when:** Vercel, Railway, and Neon accounts are closed, and a restore has
actually been performed from backup.

---

## Phase 1 — Production-real for one firm

**Goal:** 1–3 design-partner firms using it on live matters. This is the phase
that decides whether anything else is worth building.

### Route readiness

**Nothing is deleted.** Everything stays in the repo, stays compiled, stays
type-checked. The only question per route is whether a firm sees it *this
month*. The criterion is evidence, not taste: is it wired to the API, and does
the backend behind it have tests?

Audit of the 33 routes as of this writing:

#### Show now — wired to the API, backend covered by tests

| Route | Backing |
|---|---|
| `dashboard`, `app` | `/dashboard`, `/activity` |
| `matters`, `matters/[id]` | `practice/matters.py` · `test_matter_workspace_api.py` |
| `clients`, `clients/[id]` | `practice/clients.py` · `test_practice_api.py` |
| `cases`, `cases/[id]` | `practice/cases.py` |
| `documents`, `documents/[id]` | `practice/documents.py` |
| `tasks` | `practice/tasks.py` |
| `time-tracking` | `practice/time_entries.py` |
| `calendar` | `/hearings`, `/cases/{id}/deadlines` |
| `billing`, `billing/[id]` | `practice/billing.py` |
| `legal-research`, `search` | `retrieve.py` · `test_retrieve.py`, `test_retrieval_db.py` |
| `library`, `library/[id]`, `article/[id]` | corpus · `test_statute_sources.py` |
| `ai-assistant` | `answer.py` · `test_answer_stream.py`, `test_ask_stream_api.py` |
| `settings`, `settings/profile`, `settings/users` | `orgs.py`, `invites.py` · `test_orgs_api.py`, `test_invites.py` |
| `sign-in`, `sign-up` | Clerk |

#### Finish next — backend is built and tested, frontend is just unwired

These are not missing features. They are missing wiring, and each is days of
work rather than weeks. Hide them now, ship them during Phase 1.

| Route | Backend that already exists |
|---|---|
| `messages` (580 loc) | `practice/portals.py` — `/matters/{id}/threads`, `/threads/{id}/messages`, `/threads/{id}/read` |
| `accounting` (435 loc) | `practice/trust.py`, `practice/billing.py` — trust accounts, trust transactions, invoices |
| `reports` (366 loc) | `/expenses/summary`, `/invoices/summary`, `/time-entries/summary` |
| `crm`, `crm/[id]` (207 loc) | `practice/communications.py` — `/communications` CRUD |

#### Hide — no backend, real product work remaining

| Route | Note |
|---|---|
| `contract-review` (394 loc) | Needs the AI drafting pipeline. A differentiator, but a project of its own |
| `automation` (328 loc) | Depends on the Phase 2 worker and reminder scheduler |
| `knowledge-base`, `knowledge-base/[id]` (226 loc) | Overlaps `library`; decide whether it survives as a separate concept |

### How to hide without losing the work

One flag module, `web/lib/features.ts`, as the single source of truth. The nav
filters on it, and each gated page guards on it so a route is not reachable by
typing the URL. Read the enabled set from an env var so **staging shows
everything and production shows the shipped set** — same build, same code path,
no branch to maintain.

Flags rather than moved or commented-out files, specifically so the hidden
pages keep compiling and keep being type-checked. Code that is excluded from
the build rots against the API within weeks; code behind a flag does not.

### Rest of Phase 1

- Delete `web/lib/legalos-data.ts` — 895 lines of mock data that nothing
  imports. This is the one deletion, and it is dead code, not work
- Worker container: arq + Redis. Required by everything in Phase 2
- Notifications v1: in-app table + email via Resend (already integrated)
- Audit logging for admin data access — the security story depends on it
- Role separation: app DB role vs. admin DB role, admin use alerts
- **First web tests.** Zero exist. Cover the shipped routes before adding more
  surface, or "tested and ready" stays a backend-only claim

**Done when:** a firm has entered real matters and come back the next week.

> Showing ~20 routes is still a wide surface for a first firm. Ship them,
> but **onboard** through matters → clients → documents → legal research.
> Ready-to-show and worth-demoing are different decisions.

---

## Phase 2 — Notifications, properly + the lawyer's phone

**Goal:** the product reaches a lawyer who is away from the desk.

### Notification service (platform, built once)

One `notifications` table, one dispatcher, three channels: in-app, email, push.
Every client consumes the same API.

| Trigger | Channel | Why it matters |
|---|---|---|
| **Upcoming date reminder** | push + email | Missed hearings and filing dates are malpractice |
| Matter assigned or updated | in-app + push | Team coordination |
| Client portal message | push | Responsiveness |
| Invitation | email | Onboarding |

**Push: FCM for all three clients, including web push.** One vendor, and
Firebase is already in the stack for the consumer app.

### Date reminders — scope

**Not a deadline engine.** No procedural rule computation, no derived dates.
Lawyers and staff enter dates the way they already do; the system reminds them
before those dates arrive. Every date needed is already in the schema.

| Source table | Date column | Who gets reminded |
|---|---|---|
| `tasks` | `due_date` | `tasks.assignee` — already present |
| `hearings` | `hearing_date` | everyone in `matter_staff` for that matter |
| `case_deadlines` | `due_date` | `matter_staff`, via `case → matter` |

Note that `hearings` and `case_deadlines` carry no assignee of their own, which
is why routing goes through `matter_staff`. No schema change needed for that.

**Schema constraints that shape the design:**

- All three date columns are `DATE`, not `TIMESTAMPTZ`
- `hearings.hearing_time` is free **text**, so it cannot be computed against

Therefore reminders are **day-based** — 3 days before, 1 day before, morning of
— fired by a daily sweep at a fixed Africa/Cairo hour. Time-of-day reminders
("2 hours before the hearing") need `hearing_time` promoted to a real time
column first; defer that until a firm asks.

**Build list:**

- `device_tokens` table: subject, FCM token, platform, last seen. Register on
  sign-in from web, iOS, and Android; prune stale tokens on FCM rejection
- `notification_sends` table so a daily sweep is idempotent — a reminder fires
  once per recipient per date per offset, no matter how often the job runs
- arq cron job: one daily sweep over the three tables, skipping `completed`
  deadlines and `done` tasks
- Per-lawyer preferences: which offsets, which channels, quiet hours
- FCM dispatch for web push, iOS via APNs, and Android

Roughly **two weeks**, not the domain project a rule engine would have been.

> Choosing entered dates over computed ones does not close the door on rules
> later: the sweeper, tokens, dispatch, and preferences are identical either
> way. Only the source of the date would change.

### Lawyer mobile (Flutter)

- **Auth risk, decide up front:** Clerk's Flutter SDK is community-maintained
  and pre-1.0. Use the browser-based flow (`flutter_web_auth_2` → Clerk hosted
  sign-in → session token → Bearer) rather than depending on the SDK
- Scope is *not* the web app on a small screen. It is: today's deadlines,
  matter lookup, document read, legal search, time capture, notifications
- Arabic-first and RTL from the first screen, matching the web app
- Build for macOS/Windows/Linux **in the same project** — desktop is a build
  target, not a second codebase

---

## Phase 3 — Offline

**Only build this when a design-partner firm has asked for it.** Ordered by
value-per-unit-effort, and it is safe to stop after tier 1.

### Tier 1 — Offline corpus (do this first, it is nearly free)

The legal corpus is public law: read-only, identical for every user, 58 MB.
Ship it as a bundled SQLite database with FTS5 and Arabic tokenization.
**No sync engine. No conflict resolution. Ever.** A lawyer in court can search
and read statute text with no connection. This is ~90% of the perceived value.

### Tier 2 — Offline matter reading

Cache the firm's matters, documents, and calendar locally, refreshed on
connect. Read-only offline. Conflicts are impossible because nothing is
written.

### Tier 3 — Offline writing (expensive, defer)

Outbox pattern: queue local mutations, replay on reconnect, server is
authoritative, `updated_at` + version column per row. Last-write-wins is
acceptable for time entries and expenses; it is **not** acceptable for
document text — exclude documents from offline editing entirely.

If this tier is genuinely needed, evaluate **PowerSync** (Postgres↔SQLite,
first-party Flutter SDK, self-hostable) before hand-rolling it.

### Never offline

Generated answers require an LLM. Say this explicitly in the UI rather than
letting the feature appear broken — an offline banner that names what still
works is a feature, not an apology.

---

## Phase 4 — Consumer app (the haqq.ai-style product)

Different business, different customer, different identity provider
(Firebase — already built). ~3.5k LOC already exists in `mobile/`. It consumes
the same RAG API as the firm product.

Deliberately last: it shares the platform, so every hour spent hardening the
platform in Phases 0–2 makes this cheaper. Building it earlier does not make
the firm product arrive sooner.

---

## Standing decisions

| Decision | Call | Why |
|---|---|---|
| Host | Hetzner, one box, CAX21 (Arm, shared vCPU) | Predictable IO; hourly billing; ISO 27001; arch parity with the M1 dev machine |
| Auth | **Keep Clerk** | Owns orgs + invites; SOC 2 Type II inherited; rolling it yourself is the one bug class that becomes a breach |
| Desktop | Flutter build target | Not a separate project |
| Push | FCM everywhere | One vendor for web + both mobile apps |
| Offline writes | Defer to tier 3 | Conflict resolution is the expensive part and may never be needed |
| Answer LLM | Named ZDR provider | OpenRouter cannot name who processed a privileged question |
| SOC 2 | Build controls now, audit later | Lawyers ask "can you see my data", not for an attestation |

## Scaling

The box scales vertically for a long time. When it stops:

1. Move Postgres to its own box first (it is the stateful part)
2. Then run 2+ API containers behind Caddy
3. Only then consider a second region

Do not pre-build for step 3.

---

## Miro board

**Layout — six frames left to right:**

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ PLATFORM │ │ PHASE 0  │ │ PHASE 1  │ │ PHASE 2  │ │ PHASE 3  │ │ PHASE 4  │
│ (arch    │ │ Infra    │ │ First    │ │ Notify + │ │ Offline  │ │ Consumer │
│  diagram)│ │          │ │ firm     │ │ mobile   │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

Add two horizontal swimlanes cutting across Phases 0–4: **NOTIFICATIONS** and
**OFFLINE**, so it stays visible that they are capabilities, not phases.

Colour code: 🟩 platform · 🟦 web · 🟪 mobile/desktop · 🟨 domain (Arabic,
legal content) · 🟥 risk/decision.

**To load it:** in Miro pick the sticky-note tool, then paste one block below —
Miro creates one sticky per line.

### Phase 0
```
Provision Hetzner CAX21 (Arm, shared) + Ubuntu 24.04
Confirm all images are multi-arch on arm64
Docker Compose: Caddy + pgvector + API + web
LUKS encrypt data volume
Migrate DB off Neon, verify corpus + embeddings
Deploy API off Railway
Deploy web off Vercel
Nightly encrypted pg_dump to Storage Box
PERFORM A TEST RESTORE
GH Actions SSH deploy pipeline
Staging stack on same box
Uptime + error monitoring
Centralized logs with retention
Move answer path off OpenRouter to ZDR provider
Publish subprocessor list
Arabic + English security one-pager
```

### Phase 1
```
Build web/lib/features.ts flag module
Nav filters on feature flags
Route guards on gated pages (no URL access)
Env-driven: staging shows all, prod shows shipped
Delete dead mock file web/lib/legalos-data.ts
FINISH: wire messages to portals/threads API
FINISH: wire accounting to trust + invoices API
FINISH: wire reports to the 3 summary endpoints
FINISH: wire crm to communications API
HIDE: contract-review (needs AI drafting pipeline)
HIDE: automation (needs Phase 2 worker)
HIDE: knowledge-base (decide vs library overlap)
First web tests for the shipped routes
Worker container: arq + Redis
Notifications table + in-app feed
Email notifications via Resend
Audit logging for admin data access
Split app DB role from admin DB role
Alert on admin DB access
Recruit 1-3 design partner firms
Onboard first firm with real matters
```

### Phase 2
```
Notification dispatcher + channel abstraction
device_tokens table + registration on sign-in
Prune stale tokens on FCM rejection
FCM setup: web push
FCM setup: iOS APNs
FCM setup: Android
notification_sends table (idempotent sweep)
arq daily cron: sweep tasks/hearings/case_deadlines
Route hearings + deadlines via matter_staff
Per-lawyer offsets, channels, quiet hours
Fire at fixed Africa/Cairo hour (dates are DATE)
DEFER: hearing_time is TEXT, no hour-based reminders
DECISION: Clerk auth in Flutter via web OAuth flow
Flutter lawyer app: project setup
Lawyer app: today's deadlines screen
Lawyer app: matter lookup
Lawyer app: document read
Lawyer app: legal search
Lawyer app: time capture
Lawyer app: Arabic RTL from day one
Enable macOS/Windows/Linux build targets
```

### Phase 3
```
TIER 1: bundle corpus as SQLite + FTS5 Arabic
TIER 1: offline statute search and read
TIER 1: offline banner naming what still works
TIER 2: cache matters/documents/calendar read-only
TIER 3 (defer): outbox for local mutations
TIER 3 (defer): updated_at + version conflict handling
TIER 3 (defer): evaluate PowerSync vs hand-rolled
NEVER: offline generated answers (needs LLM)
```

### Phase 4
```
Reuse existing 3.5k LOC consumer Flutter app
Firebase auth (already built)
Point at hardened platform RAG API
Consumer pricing and packaging
App Store + Play Store listings
```

### Risks / decisions (red stickies)
```
RISK: Clerk Flutter SDK is pre-1.0 - use web OAuth flow
RISK: no worker exists yet - notifications depend on it
RISK: 33 routes, 0 customers - scope must be cut
RISK: single box = single point of failure
RISK: no ME region - data residency still unanswered
RISK: backups untested = no backups
DECISION: keep Clerk until it hurts
DECISION: desktop is a Flutter target, not a project
DECISION: offline reads yes, offline writes deferred
```
