# The lawyer app (E-3)

What a lawyer needs away from the desk: what is due, what is in court, and
what happened when they walked out of it.

Three screens, Arabic-first and RTL from the first line. Not a second copy of
the web app — the web app answers "how is the firm doing", and this answers
"what is mine and what is now", which is the only question worth asking in a
corridor between sittings.

## Not the same app as `mobile/`

`mobile/` is the consumer product: Firebase sign-in, one person per account,
no firm, and its whole surface is a Q&A chat. This one signs in a member of a
law firm, is organization-scoped on every call, and has no chat at all. They
share a backend and nothing else — which is why `firebase_auth` and
`google_sign_in` are absent from this `pubspec.yaml`.

`core/api_client.dart` and `core/config.dart` are adapted from `mobile/`
rather than extracted into a shared package. They are ~100 lines between them,
and a shared package pinning two apps to one Dio version would cost more than
the duplication saves.

## Running it

The backend must be up, and it decides who the caller is. In dev-auth mode it
needs no token:

```bash
LEGALOS_DEV_AUTH=seed_ahmed_al_sayed .venv/Scripts/python.exe -m uvicorn legalrag.api:app --port 8000
```

Then, from this directory:

```bash
flutter run -d web-server --web-port 5000 --dart-define=DEV_AUTH=true
```

Port 5000 is not arbitrary: it is allowed by `LOCAL_CORS_ORIGINS` in
`src/legalrag/config.py` alongside the Next.js dev server's 3000. A browser on
any other port is refused by CORS, and that presents as every request failing
for no visible reason.

Chrome and Edge work as devices too (`-d chrome`). Windows desktop needs the
"Desktop development with C++" workload in Visual Studio, and Android needs
the Android SDK; neither is required to develop the screens.

### Configuration

All build-time, via `--dart-define`:

| Define | Default | Meaning |
|---|---|---|
| `API_URL` | `http://127.0.0.1:8000` | Where the backend is, **from the device**. |
| `ORG_ID` | `1` | Which firm. Read from the membership once Clerk lands. |
| `DEV_AUTH` | false | Send no token and let `LEGALOS_DEV_AUTH` decide. |

`127.0.0.1`, not `localhost`: uvicorn binds IPv4 by default and on Windows
`localhost` resolves to `::1` first, which is then refused. On the Android
emulator the default becomes `10.0.2.2`, because `127.0.0.1` inside the
emulator is the emulator.

## What is here

| Screen | Endpoint | |
|---|---|---|
| يومي | `GET /my-day` | Overdue first and never collapsed — a deadline missed last week is exactly what a horizon starting today would drop. |
| الجلسات | `GET /hearings`, `PATCH /hearings/{id}` | Search across every column. Recording an outcome is the app's one real write. |
| القضايا | `GET /matters`, `POST /time-entries` | Search and open-only filter, both local to one fetch. |

## What is not here yet

**Real sign-in.** `DevAuthGateway` sends no token. The replacement is decided
and not written: Clerk through the browser (`flutter_web_auth_2` → Clerk
hosted sign-in → session token → Bearer), *not* the community Flutter SDK,
which is pre-1.0. `auth_gateway.dart` is an interface for exactly this reason
— `api_client.dart` will not change when it lands.

**Push registration.** `PracticeRepository.registerDevice` exists and nothing
calls it; it needs an FCM token, which needs the Firebase client SDK on this
side. The server half is done — see `src/legalrag/push.py` and migration 0017.

**Documents.** `GET /documents/{id}/content` serves them with the right
headers; no screen reads it yet.

**Offline (E-4).** Deliberately not started. The roadmap gates it on a
design-partner firm asking, and there is an unresolved question in front of
it: a Clerk session token is short-lived and cannot be refreshed without a
network, so a lawyer in a courtroom with no signal is signed out and cannot
read even cached matters. That is a decision, not an implementation detail.

## Tests

```bash
flutter test
```

The JSON in `test/parsing_test.dart` was copied from live responses of a
running API, not written from the Python source. A model that agrees with what
someone believed an endpoint returns is worth nothing.
