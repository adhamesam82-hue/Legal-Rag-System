# The lawyer app (E-3): what exists, what is missing

Written from a machine with no Flutter toolchain, so this is an audit of the
repository and the API — not code. Its purpose is to make the first session on
a machine that *has* Flutter short, by settling in advance the questions that
would otherwise be answered by guessing.

Nothing here is speculative about the backend: every endpoint named below was
built and tested in this repository, and the route count and names come from
`legalrag.practice_api.router`.

---

## What is already in `mobile/`

The consumer app is ~2,700 lines of Dart. It is a *different product* — Firebase
sign-in, one consumer per account, no firm — but roughly half of it is
plumbing that a lawyer app needs identically.

### Reusable as-is

| File | Lines | Why it transfers |
|---|---:|---|
| `core/api_client.dart` | 66 | Dio instance, auth interceptor, 401-retry. Only the token source changes. |
| `core/config.dart` | 35 | `--dart-define` config, and the Android `10.0.2.2` loopback rule that costs an hour to rediscover. |
| `core/sse.dart` | 57 | Server-sent events. Needed only if the lawyer app streams answers. |
| `core/theme.dart` | 102 | Arabic-first, RTL. |
| `l10n/strings.dart` | 128 | The string table pattern. Contents differ. |

### Not reusable

`chat_bloc`, `chat_page`, `message_bubble`, `answer_text`, `composer`,
`mode_grid`, `sources_sheet`, `conversations_page` — about 1,500 lines, all of
it the consumer Q&A surface. A lawyer app has no chat.

`auth/auth_gateway.dart` (194 lines) is Firebase. It is the right *shape* — an
interface the API client depends on — and the wrong implementation.

---

## The one decision that must be made first

**Authentication.** The roadmap already calls it:

> Clerk's Flutter SDK is community-maintained and pre-1.0. Use the
> browser-based flow (`flutter_web_auth_2` → Clerk hosted sign-in → session
> token → Bearer) rather than depending on the SDK.

That is the right call and nothing since has changed it. `auth_gateway.dart`
becomes an interface with two implementations — Firebase for the consumer app,
Clerk-via-browser for this one — and `api_client.dart` does not change at all.

`config.dart` already supports `DEV_AUTH`, so the app can be built and run
against a local backend before any Clerk work is done. That is the order to
work in: screens first against dev-auth, real sign-in last.

---

## Every endpoint the app needs already exists

The roadmap scopes the app to: *today's deadlines, matter lookup, document
read, legal search, time capture, notifications.* All six are served:

| Screen | Endpoint | Notes |
|---|---|---|
| Today | `GET /my-day` | Overdue, today, and a configurable horizon, already split apart. Honours matter scoping. |
| Case lookup | `GET /matters`, `GET /matters/{id}` | Scoped per member. |
| Hearings | `GET /hearings` | Per-column filters and one search box. |
| Record what happened | `PATCH /hearings/{id}` | Outcome, the clerk's note, and the adjourned-to date. |
| Documents | `GET /documents`, `GET /documents/{id}/content` | `attachment` + `nosniff`; Arabic filenames survive. |
| Time capture | `POST /time-entries` | |
| Legal search | `POST /api/search`, `POST /api/ask/stream` | Authenticated since batch 0. Gated by the `legalResearch` flag on web; the app should respect the same decision. |
| Push registration | `PUT /devices`, `GET /devices`, `DELETE /devices/{id}` | Keyed on the token, so a handset that changes hands is reassigned rather than duplicated. |

**No backend work is required to start.** That is the point of having built
these first.

---

## What is genuinely missing, and its shape

### 1. Push dispatch

**Done.** `legalrag/push.py` sends through FCM's v1 API, and the sweep now
runs both channels.

One claim in the earlier draft of this section was wrong and is worth
recording: it said the sweep "records sends idempotently per channel". It did
not. Migration 0013 created `notification_sends` with a `channel` column but
left it out of the UNIQUE key, so the morning email would write the row and
the push for the same hearing would collide with it — the lawyer gets the
mail, never gets the notification, and nothing reports a failure. Migration
0017 widened the key. The column had been there from the start; adding the
second channel is what turned the omission into a defect.

Still required to actually deliver: an FCM service account, set as
`FIREBASE_SERVICE_ACCOUNT` (a path to the JSON key, or the JSON itself). It is
a credential this repository does not and should not contain. Absent it, the
sweep skips the channel deliberately rather than reporting a failure per
reminder — `push_is_configured()` is asked once per run.

### 2. The app itself

Six screens, Arabic-first and RTL from the first one. Desktop is a build
target of the same project, not a second app.

### 3. Offline (E-4)

Depends on this app existing, and the roadmap gates it explicitly:

> **Only build this when a design-partner firm has asked for it.**

One thing the roadmap does not address and should, before that work starts:
**offline authentication**. A Clerk session token is short-lived and cannot be
refreshed without a network. A lawyer in a courtroom with no signal will be
signed out and unable to read even locally cached matters — which defeats the
purpose. The decision is between caching a longer-lived credential encrypted
on the device, or allowing reads under a recently-expired token with all
writes blocked until the network returns.

---

## Suggested order

1. Project skeleton reusing `core/` and `theme.dart`, run against `DEV_AUTH`.
2. Today's screen against `/my-day` — the app's whole reason to exist on a phone.
3. Case lookup and hearings.
4. Documents and time capture.
5. Clerk via the browser flow; retire `DEV_AUTH`.
6. Push: FCM credential, dispatch beside the email channel, `PUT /devices` on sign-in.

Steps 1–4 need no credentials of any kind.
