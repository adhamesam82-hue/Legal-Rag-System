# LegalOS Mobile

A consumer legal-assistant app for Egyptian law — ChatGPT-shaped, Arabic-first,
answering only from the statute corpus.

It is the third product against the shared FastAPI backend, alongside LegalOS
(the firm SaaS in `web/`) and the standalone research web app. It lives in this
repo for now; nothing outside `mobile/` is imported, so `git subtree split`
lifts it into its own repository with history intact when that is wanted.

## Identity

**Firebase, not Clerk.** LegalOS sells to law firms and signs them in with
Clerk; this app sells to consumers. Two businesses, two customer bases, so two
identity providers — a consumer account has no place in a firm's org/role model
and must never reach a firm's matters.

Sign-in is **Apple and Google only**. No password: a password is a thing to
store, reset, leak and support, and neither provider needs one.

The backend enforces the boundary structurally (`src/legalrag/auth.py`):

| Surface | Routes | Accepts |
| --- | --- | --- |
| Consumer | `/api/ask/stream`, `/api/conversations*` | Firebase **or** Clerk |
| Firm | `/api/orgs*`, practice management | Clerk **only** |

Conversation owners are namespaced — `firebase:8fK2p`, `clerk:user_2abc` —
because both are opaque strings from different keyspaces and a collision would
hand one person another's legal questions. A database CHECK constraint keeps it
true.

## Running it

Before a Firebase project exists, run against the backend's dev-auth hatch:

```bash
# from the repo root
LEGALOS_DEV_AUTH=user_local uv run uvicorn legalrag.api:app --reload --port 8000

# from mobile/
flutter run --dart-define=API_URL=http://localhost:8000 --dart-define=DEV_AUTH=true
```

`DEV_AUTH` skips Firebase entirely and sends no token; the API is what actually
authenticates, so both sides must be set or every request 401s.

With Firebase configured, drop the flag:

```bash
flutter run --dart-define=API_URL=https://api.example.com
```

On the Android emulator the host is `http://10.0.2.2:8000`, which is the
default there — `localhost` inside the emulator is the emulator.

## Setup you have to do (not doable from the repo)

Everything below needs your Google and Apple accounts.

**1. Firebase project** — console.firebase.google.com. Enable **Google** and
**Apple** under Authentication → Sign-in method. Then:

- Android: download `google-services.json` → `android/app/`, and add the
  `com.google.gms.google-services` plugin to `android/app/build.gradle.kts`.
  (Not committed pre-emptively: the plugin fails the build when the JSON is
  absent.)
- iOS: download `GoogleService-Info.plist` → `ios/Runner/`, added to the Xcode
  target.
- Put the project id in the backend's `.env` as `FIREBASE_PROJECT_ID`. This is
  checked as the token `aud`, and is what stops a token from someone else's
  Firebase project being accepted.

**2. Sign in with Apple** — needs a paid Apple Developer account.

- Enable the *Sign in with Apple* capability on the iOS target in Xcode.
- In Firebase → Apple provider, fill in the Services ID, Team ID and key.
- Apple **requires** this on iOS for any app offering another social login, and
  this app offers Google. Shipping without it fails review.
- Android has no native Apple flow; `appleAvailable` returns false there and
  the button is hidden rather than shown broken.

**3. Google Sign-In on iOS** — add the reversed client ID from
`GoogleService-Info.plist` as a URL scheme in `ios/Runner/Info.plist`.

Deployment targets are already raised to iOS 13 / macOS 10.15, which the
Firebase SDK requires.

## Tests

```bash
flutter test          # unit + widget; the live tests skip themselves
flutter analyze
```

`test/live_backend_test.dart` runs the real client against a real backend and
is the only test that proves both sides agree on the wire format. It detects
whether the server implements `/api/ask/stream` (via `/openapi.json`, because a
server predating this feature answers `/api/health` perfectly well and then
404s the route) and skips when it does not:

```bash
flutter test --dart-define=API_URL=http://localhost:8000
```

## The one rule this app must not break

`POST /api/ask/stream` sends `articles`, then `delta`s, then `done`.

**A `delta` is a preview. `done.text` is authoritative and replaces every delta
rendered so far — it is never appended to.**

The backend gates tokens so nothing unverified is ever transmitted, but an
answer can still be blocked *after* part of it has been released: a valid
citation opens the gate, an invented one later blocks the whole answer. When
that happens the stream aborts and `done` carries `blocked: true` plus a notice
in place of the text. A client that appends instead of replacing leaves the
rejected legal text on screen underneath a warning, which is precisely the
failure the citation enforcement exists to prevent.

`ChatBloc._apply` implements this, and `test/chat_bloc_test.dart` has a test
named for it.

## Structure

```text
lib/
  auth/       AuthGateway (Firebase + a dev stand-in), AuthCubit
  core/       config, Dio client + token interceptor, SSE parser
  models/     Article, ChatMessage, Conversation, sealed AskEvent
  data/       AssistantRepository — the only thing that talks to the API
  blocs/      ChatBloc, ConversationsCubit
  l10n/       Arabic and English copy
  ui/         SignInPage, ChatPage, ConversationsPage, widgets
```

`AuthGateway` is an interface so the interceptor and cubit are testable without
a Firebase project — `test/auth_test.dart` covers the token attach and the
one-time refresh-and-retry on 401 with no network at all.

Copy is mirrored from `web/lib/i18n/catalogs/ai.ts` so the two products
describe the same capabilities in the same words. A widget test asserts the
"not built yet" wording matches.

## What is not built

- **The Firebase project itself.** The code is complete; the console, Apple
  Developer and platform-config steps above are not, and nothing signs in until
  they are done. Until then, `DEV_AUTH=true`.
- **Account deletion.** Apple requires an in-app way to delete an account for
  any app that offers account creation. `signOut` exists; delete does not.
- **Seven of the eight modes.** Draft, Review, Translate, Summarize, Case
  Analysis, Clause Comparison and Timeline Extraction are listed, locked, and
  labelled — they are not wired to anything.
- **Saudi Arabia.** A valid jurisdiction filter in the API with nothing
  ingested behind it, so it is shown disabled rather than silently refusing
  every question.
- **Offline history.** Conversations are read from the server on demand;
  nothing is cached locally.
- **Rate limiting.** `/api/ask/stream` requires a signed-in user, which bounds
  abuse to accounts rather than to the open internet, but there is no per-user
  quota. `/api/ask` remains unauthenticated and unlimited.
