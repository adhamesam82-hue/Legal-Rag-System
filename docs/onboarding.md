# Onboarding: how alsigil runs, and how we work on it together

Written 31 August 2026, for anyone joining the project. It describes what is
actually running, not what is planned — where the two differ, the gap is
listed under [What is not done yet](#what-is-not-done-yet).

`docs/deployment.md` is **stale**: it describes a Vercel + Railway + Neon
deployment that no longer exists. This file supersedes it until it is rewritten.

---

## 1. The product in one paragraph

LegalOS (brand: alsigil / السجل) is a practice management SaaS for Egyptian law
firms — matters, hearings, clients, documents, invoices — built around a cited
Arabic legal search engine over a corpus of 78 Egyptian statutes and 6,985
articles. The interface is Arabic and right-to-left. **AI answering is switched
off for the first release** by owner decision; the corpus, retrieval and citation
machinery exist behind that switch.

Two apps live in this repository beside the web product: `lawyer_app/` (Flutter,
for firm staff) and `mobile/` (a separate consumer app, phase 4, different
identity provider). Neither is deployed by anything described here.

## 2. What is running

One Hetzner **CPX22** box in Falkenstein, Germany. Everything is on it.

| | |
| --- | --- |
| Address | `91.99.216.187` · `2a01:4f8:c014:1c40::1` |
| OS | Ubuntu 26.04 LTS, x86_64 |
| Resources | 2 vCPU · 4 GB RAM (+2 GB swap) · 80 GB NVMe |
| Access | SSH key only, as `deploy`. Root login and password login are disabled. |
| Firewall | ufw: 22, 80, 443. Nothing else, and Postgres is not published at all. |

The whole production stack idles at about 220 MB, so the box has room; the
constraint to watch is RAM during migrations, not disk.

### The two environments

Both run on the same box, behind the same Caddy, and are otherwise separate:
separate images tag, database, document volume and secrets tree.

| | Production | Staging |
| --- | --- | --- |
| URL | https://alsigil.com | https://staging.alsigil.com |
| Access | public | HTTP password on the interface (user `alsigil`; ask Ahmed for it — it is not in this repository). `/api/*` is **not** password-protected; see below |
| Clerk | production instance, `pk_live_` | development instance, `pk_test_` |
| Secrets | `/opt/alsigil/.env`, `/opt/alsigil/web.env` | `/opt/alsigil-staging/.env`, `/opt/alsigil-staging/web.env` |
| Compose project | `deploy` | `alsigil-staging` |
| Email sending | Resend (live key) | **disabled on purpose** — a development copy must not mail real people |
| Search engines | indexed | `X-Robots-Tag: noindex, nofollow` |
| Backups | (pending) | none — staging is disposable by definition |

### Containers

```
Caddy ──► alsigil.com          → web:3000        /api/* → api:8000
      └─► staging.alsigil.com  → web-staging:3000  /api/* → api-staging:8000
                                 (behind basic_auth)
```

Caddy terminates TLS for both hostnames and issues certificates itself. Because
each origin serves both the frontend and the API, the browser never makes a
cross-origin call and CORS does not apply in production.

Caddy lives in the production compose project and reaches the staging containers
over an external Docker network, `alsigil-edge`, that both projects join.

> **A trap that has already bitten us once.** Compose publishes a service's
> *name* as a network alias on every network its container joins. Staging's
> services were originally called `web` and `api`, so on the shared network they
> answered to the same names production's Caddyfile uses — and Docker load
> balanced production traffic into the staging stack. For about twenty minutes
> alsigil.com served its sign-in page wired to the staging Clerk instance. The
> services are now named `web-staging` and `api-staging`, and a test asserts the
> two name sets stay disjoint. **Anything new added to `alsigil-edge` must carry
> a name that cannot collide with a production service.**

> **Why staging's `/api/*` has no password.** `Authorization` is a single
> header. A browser holding basic credentials sends `Authorization: Basic …`,
> and the app must send `Authorization: Bearer <clerk session>` on the same
> request — they cannot both be present. Measured through the proxy: with Basic,
> the request reaches the API, which finds no bearer token and answers 403; with
> Bearer, Caddy itself answers 401. Signing in to staging was structurally
> impossible until the password was scoped to the interface alone. What guards
> those routes is the API's own authentication — every route requires a valid
> Clerk session — so **restrict sign-ups on the staging Clerk development
> instance to our own addresses** (Clerk dashboard → Restrictions → allowlist).

## 3. Repository layout that matters here

| Path | What it is |
| --- | --- |
| `src/legalrag/` | FastAPI backend, the corpus and retrieval code |
| `web/` | Next.js 16 frontend, Arabic RTL |
| `migrations/` | Numbered SQL migrations, applied by `scripts/migrate.py` |
| `deploy/` | Everything about the box: compose files, Caddyfile, provisioning, backups, systemd units |
| `.github/workflows/` | tests, image build, deployment |
| `docs/ci-cd.ar.md` | The two-track CI/CD design (Arabic) |
| `tests/test_deploy_config.py` | Assertions about all of the above — read it before changing anything in `deploy/` |

## 4. How a change reaches production today

```
branch ──PR──► tests (pytest + tsc)  ← required, and they gate the image
                 │
             merge to main
                 │
        build.yml: runs the suite, then builds and pushes both images to
        GHCR tagged with the commit SHA
                 │
        deployment to the box  ← currently run by hand; see below
```

The test suite is a **gate on the image**, not an opinion beside it:
`build.yml` calls `test.yml` as a reusable workflow and depends on it, so a red
suite means no image is ever built, and therefore nothing can be deployed.

From there the two tracks diverge, and the difference is deliberate:

| | `deploy-staging.yml` | `promote.yml` |
| --- | --- | --- |
| Trigger | automatic, after every successful build on `main` | `workflow_dispatch` only — a person, on purpose |
| Target | `staging.alsigil.com` | `alsigil.com` |
| Which tag | the SHA just built | by default, **the SHA staging is running** |
| Refuses to run when | the build failed | the tag is not what staging is running (override: `allow_unstaged`, for rollbacks) |

Both pull the image, run migrations as a discrete step, swap the containers,
smoke-check the result, and **roll back automatically** — image *and*
configuration — if the check fails.

`promote.yml` reads its default tag from `/opt/alsigil-staging/deploy/.current_tag`
**on the box**, not from git: a branch head can move between the moment
something was verified on staging and the moment it is promoted, and promoting
that would ship an artefact nobody looked at.

The staging track deliberately never copies the `Caddyfile`. One Caddy serves
both hostnames and it belongs to the production project, so a staging deploy
that shipped it could break the production proxy.

Neither can run yet: they need repository secrets that only a repo admin can add
(see [What Adham needs to do](#what-adham-needs-to-do)). Until then, deployments
are the same steps run by hand over SSH.

### Deploying by hand

```sh
ssh deploy@91.99.216.187
cd /opt/alsigil/deploy
export GITHUB_REPOSITORY_OWNER=adhamesam82-hue
export IMAGE_TAG=<the git SHA you want>
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml run --rm api python scripts/migrate.py
docker compose -f docker-compose.prod.yml up -d
echo "$IMAGE_TAG" > .current_tag
```

Staging is identical with `-f /opt/alsigil-staging/deploy/docker-compose.staging.yml`
from `/opt/alsigil-staging/deploy`.

Rolling back is the same sequence with the previous SHA — which is why
`.current_tag` is written on every deployment.

### Checking a deployment

```sh
uv run --with httpx python scripts/smoke_check.py https://alsigil.com 91.99.216.187
```

The second argument pins the hostname to that address, so the check cannot pass
against whatever DNS happens to answer.

## 5. How we work together

We share one box and one staging environment, so the rules are about not
colliding rather than about ceremony.

**Branches and review**

- `main` is deployable at all times. Nobody pushes to it directly.
- One branch per ticket, named after it. Small pull requests; a PR that touches
  the backend, the frontend and `deploy/` at once cannot be reviewed usefully.
- Open a PR as a **draft** while it is for discussion, mark it ready when it is
  for merging. Merge fast-forward.
- The tests must be green. They run on every push and every PR.

**The branch model, concretely**

One long-lived branch: `main`. There is deliberately no `develop` and no
`staging` branch. Staging is an **environment**, not a branch — it runs whatever
image was built from `main`. A second long-lived branch would mean the two
diverge, that "what is on staging" is a branch state rather than a specific
artefact, and that promoting to production rebuilds the code instead of moving
the tested image.

Everything else is short-lived and named after the ticket it closes:

```
feature/T-023-pending-invites     a new capability
fix/T-031-invite-email            a defect
chore/rotate-clerk-keys           maintenance, no ticket
```

Short means **one to three days**. A branch that lives a week has stopped being
a change and become a fork; `fix/qa-sweep-2026-08-31` is currently five commits
and two days old, which is the outer edge.

The full lifecycle of one change:

```sh
git switch main && git pull                      # always start from main
git switch -c feature/T-023-pending-invites
# ... work, commit ...
git push -u origin feature/T-023-pending-invites
gh pr create --draft                             # draft while it is for discussion
# ... review, more commits, tests green ...
git pull --rebase origin main                    # replay onto current main
gh pr ready && gh pr merge --rebase              # fast-forward; no merge commits
```

Merging to `main` is what triggers everything else:

```
merge to main
   │
   ├─► build.yml     tests, then images tagged with the merge commit SHA
   │
   ├─► staging       deployed automatically. Both of us look at it here.
   │
   └─► production    promoted BY HAND, with that same SHA, when we agree
```

After a promotion, tag the commit so git itself records what production is
running — `.current_tag` on the box says the same thing, but only to whoever can
SSH in:

```sh
git tag -a prod-2026-09-01 -m "promoted after staging soak" <sha>
git push origin prod-2026-09-01
```

Rolling back is promoting the previous tag. Nothing is reverted in git for an
operational rollback; the fix comes as a normal branch afterwards.

A hotfix takes the same path — branch, PR, tests, merge, staging, promote — just
faster. It does not skip staging: the ten minutes staging costs are the ten
minutes that catch a hotfix which breaks something else.

**Two collisions to watch for, both specific to this repository**

1. **Migration numbers.** `migrations/` is numbered sequentially, and two
   branches that each add `0021_*.sql` will merge cleanly and then fail on the
   box, because the numbers are the ordering. Announce the number you are taking
   when you open the PR, and renumber during the rebase if someone got there
   first. The gap at `0019` in the current tree is what this looks like after
   the fact.
2. **Ticket state files.** `.claude/` and `tickets/` are edited by the ticket
   tooling on both machines and conflict noisily. Rebase before touching them.

**Staging belongs to `main`, not to a person**

This is the rule that keeps two people out of each other's way: staging always
runs what is on `main`. Nobody "books" it for a branch, and nobody deploys a
personal branch onto it. Feature work is verified locally; staging is where
merged work is verified *together*, with real Clerk sessions and a real
database, before it is promoted.

If we ever need per-branch environments, that means a second box — not sharing
this one.

**Production is promoted, never pushed**

A production deployment takes the exact image tag that has been running on
staging. Not "latest main", which may have moved. This is what makes "it worked
on staging" a statement about the artefact rather than about a commit range.

**Ownership of access** (neither of us can do the other's half today)

| | Ahmed | Adham |
| --- | --- | --- |
| SSH to the box, secrets on it | yes | to be added |
| GitHub repo admin (secrets, branch protection) | no | yes — repo owner |
| Clerk dashboard | via shared account | account is under `adhamesam82@gmail.com` |
| DNS (Namecheap), Cloudflare R2 | yes | — |

**Working on the box**

Read-only inspection is fine for both of us at any time (`docker compose ps`,
`logs`). Anything that restarts, migrates or deploys: say so in the channel
first. Two `docker compose up -d` runs against the same project at the same
moment is how a stack ends up half old and half new.

## 6. What Adham needs to do

1. **Send Ahmed an SSH public key** (`~/.ssh/id_ed25519.pub`) so it can be added
   to the `deploy` account on the box.
2. **Add the three deployment secrets** to the repository (Settings → Secrets and
   variables → Actions). This is the only thing blocking automated deployment:
   - `SSH_HOST` — `91.99.216.187`
   - `SSH_KNOWN_HOSTS` — output of `ssh-keyscan -H 91.99.216.187`
   - `SSH_PRIVATE_KEY` — the deploy key Ahmed holds
   - `STAGING_BASIC_AUTH` — `alsigil:<the staging password>`, so the staging
     smoke check can get past Caddy's password. Without it every staging
     deployment reads 401 as a broken deployment and rolls back a healthy one.
3. **Protect `main`**: require pull requests, and require the `pytest` and
   `typecheck` checks to pass. The in-repo gate stops a red suite from producing
   an image; branch protection is what stops a direct push from skipping the PR
   entirely.

## 7. Safety rules that are not negotiable

- **No real client data on the box until backups are working and a restore has
  actually been performed.** Sample data only. This is a legal-practice product;
  the data is privileged.
- **`LEGALOS_DEV_AUTH` must never be set in production.** It disables JWT
  verification and treats every visitor as the same signed-in user. It is
  acceptable on staging only because staging is behind a password.
- **Staging never receives a copy of production data.** It has weaker
  authentication, a shared password, and no backups.
- **Secrets live only in the two `.env` trees on the box**, `root:deploy` mode
  `0640`. Never in the repository, never baked into an image. The mode is not an
  oversight: Compose reads `env_file:` as the invoking user, so `0600` breaks
  every deployment.
- **The restic backup passphrase must also live in a password manager.** A copy
  that exists only on the box is worthless in the exact scenario backups are for.

## 8. What is not done yet

In rough priority order:

1. **Backups are written but not running.** `deploy/backup.sh` and its systemd
   timer are installed and verified to fail closed; the Cloudflare R2 bucket and
   credentials do not exist yet, so the timer is deliberately not enabled.
2. **No restore test.** `deploy/restore_check.sh` is not written. Phase 0 is not
   complete until a restore has been performed, not merely a backup taken.
3. **The corpus is not loaded** in either environment — `/api/health` reports an
   empty corpus and legal search returns nothing. It has to be copied from the
   local development database (~138 MB).
4. **Automated deployment is blocked** on the repository secrets above. The
   two-track workflows themselves are written and their invariants are tested;
   they have never executed, because no run can authenticate to the box yet.
5. **No monitoring.** `SENTRY_DSN` is unset and there is no external uptime
   check. The smoke check protects the moment of deployment, nothing after it.
6. **A missing Clerk setting surfaces as a 500**, not as a refusal to boot — the
   API raises inside the authentication guard on the first request. A startup
   guard should reject a misconfigured production container instead.
7. **`docs/deployment.md` is stale** and describes infrastructure we no longer
   use.
