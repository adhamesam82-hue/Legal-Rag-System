# SaaS Phase — Sub-project 1: Auth & Organizations — Design

## Where this fits

This begins a new phase of the project: turning the existing legal-research engine
(Phase 2 — corpus, retrieval, grounded Q&A, FastAPI + Next.js/Astryx UI) into a
"lightweight Clio" for Egyptian lawyers and firms. That initiative bundles several
independent subsystems — auth/multi-tenancy, client/contact management, matter
management, documents, time & billing, calendaring, client intake, AI-research
integration, and SaaS billing for the product itself — too much for one spec.

It is being built as a sequence of sub-projects, each with its own spec:

1. **Auth & Organizations** (this document) — firms sign up, invite their team, log in.
2. Clients & Matters — the core entities everything else attaches to.
3. A practice-management pillar (documents, or time & billing, or calendaring — TBD
   once sub-project 2 exists).
4. AI-research integration — tying the existing chat/search/explainer into a matter's
   context. This is the differentiator versus a generic Clio clone.
5. SaaS billing for the product itself (Stripe subscriptions).

Nothing after this sub-project is meaningful without it: every other pillar needs to
know which firm and which user is making a request.

## Decisions made

- **Multi-tenant from day one.** Any Egyptian lawyer or firm can sign up immediately —
  not a single-tenant tool for one practice first.
- **Clerk for identity only.** Clerk (managed auth) handles signup, login, sessions,
  password reset, and email verification. Clerk also offers a native "Organizations"
  primitive (invites, membership, roles) — deliberately not used. Using it would split
  organization state across two sources of truth: Clerk's org data and our own
  Postgres, where matters, clients, documents, and billing will all live starting in
  sub-project 2. Organizations, memberships, and roles are modeled entirely in our
  own database instead, keyed by Clerk's `user_id` (not a foreign key — Clerk owns
  that identity, we don't).
- **Custom RTL-native auth screens, not Clerk's prebuilt widgets.** Clerk's
  `@clerk/localizations` package translates widget text to Arabic, but there is no
  confirmation its prebuilt `<SignIn/>`/`<SignUp/>` components correctly mirror
  layout for RTL. Since the rest of this product is RTL-native (Astryx, chosen partly
  for this), sign-in/sign-up/invite-accept screens are built on **Clerk Elements**
  (Clerk's headless/unstyled auth API) using Astryx components, so layout direction
  is correct by construction rather than hoped-for.
- **Three roles: Owner, Lawyer, Staff.** Owner manages billing, team, and has full
  product access. Lawyer and Staff both have full product access for now (no
  per-matter restriction exists yet — there are no matters yet); the distinction
  becomes load-bearing once Clients & Matters ships and data-level access rules are
  needed. Owner is the only role that can invite new members in v1; new members are
  invited as Lawyer or Staff (Owner is not itself invitable — reserved for the
  org's creator until ownership transfer is built, which is out of scope here).
- **Open self-serve signup.** No waitlist or manual approval gate.

## Architecture

```text
Next.js (Astryx UI, RTL)
  │  custom sign-in / sign-up / invite-accept screens
  │  built on Clerk Elements (headless), not Clerk's prebuilt widgets
  ▼
Clerk (hosted)
  │  owns: user identity, passwords, sessions,
  │        email verification, password reset
  │  issues: a JWT per session
  ▼
FastAPI
  │  verifies every request's JWT against Clerk's JWKS
  │  (clerk-backend-api, the official Python SDK)
  │  looks up caller's org + role from OUR memberships table
  ▼
Postgres (same instance as the corpus, new tables)
  organizations, memberships, invitations
  -- Clerk owns "who is this person";
  -- we own "what firm are they in, and what role"
```

Invitations are built ourselves rather than via Clerk's native Organizations invite
flow, for the same single-source-of-truth reason: an Owner enters an email and role,
we create an `invitations` row with a random token, and send the email via a
transactional provider (Resend). The invitee authenticates via Clerk, and our
backend uses the token to create their `memberships` row.

## Data model

```sql
organizations
  id            bigserial PK
  name          text NOT NULL
  created_by    text NOT NULL   -- clerk_user_id of the creator
  created_at    timestamptz NOT NULL DEFAULT now()

memberships
  id                bigserial PK
  organization_id   bigint NOT NULL REFERENCES organizations(id)
  clerk_user_id     text NOT NULL   -- NOT a FK; Clerk owns this identity
  role              text NOT NULL CHECK (role IN ('owner', 'lawyer', 'staff'))
  created_at        timestamptz NOT NULL DEFAULT now()
  UNIQUE (organization_id, clerk_user_id)

invitations
  id                bigserial PK
  organization_id   bigint NOT NULL REFERENCES organizations(id)
  email             text NOT NULL
  role              text NOT NULL CHECK (role IN ('lawyer', 'staff'))
  token             text NOT NULL UNIQUE
  invited_by        text NOT NULL   -- clerk_user_id
  status            text NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
                    DEFAULT 'pending'
  expires_at        timestamptz NOT NULL
  accepted_at       timestamptz
  created_at        timestamptz NOT NULL DEFAULT now()
```

`memberships` is many-to-many, so a user can structurally belong to more than one
organization. No org-switcher UI is built in v1 — see "Multi-org edge case" below for
the one piece of UI this still requires.

## Flows

**Signup:** user creates a Clerk account via the custom sign-up screen. On first
authenticated request, the backend checks for an existing `memberships` row for that
`clerk_user_id`:

- None found → onboarding screen asks for a firm name → creates `organizations` +
  a `memberships` row with `role='owner'`.
- One found → straight into the app under that organization.
- Two or more found → see "Multi-org edge case."

**Invite:** an Owner, from a team-settings screen, enters an email and picks a role
(Lawyer or Staff). Backend creates an `invitations` row with a securely random
token and a 7-day expiry, and sends an email via Resend containing an accept link.
The invitee authenticates via Clerk (signing up if they don't already have an
account), and the backend validates the token — unexpired, status `pending`, and
the authenticated account's email matches the invitation's email — before creating
their `memberships` row and marking the invitation `accepted`.

**Multi-org edge case:** the moment a user who already created their own solo
organization also accepts an invitation elsewhere, they have two `memberships`
rows. v1 does not build a full org switcher, but it does need *some* handling here
to avoid undefined behavior: if login resolves to 2+ organizations, show a minimal
"choose which firm" list (not a persistent switcher) and remember the choice for
the session.

## Error handling & invariants

- Expired, already-used, or revoked invite token → a clear error screen telling the
  invitee to ask their firm to resend it.
- **An organization must always have at least one Owner.** Removing the last Owner
  from an organization is blocked at the database/service layer, not just the UI.
- Invite email fails to send → surfaced to the Owner as an error with a "resend"
  action, not a silent failure.

## Testing

- Unit tests for invite-token logic (expiry, single-use, role validity) — pure
  Python, no network calls.
- Postgres integration tests, following the existing style in
  `tests/test_retrieval_db.py`, covering the "at least one Owner" invariant and the
  `(organization_id, clerk_user_id)` uniqueness constraint.
- FastAPI route tests via `TestClient` with the Clerk-auth dependency overridden, so
  the test suite never makes real Clerk API calls.

## Explicitly out of scope for this sub-project

Clients, matters, documents, time & billing, calendaring (later sub-projects) ·
organization deletion · ownership transfer between users · SSO or MFA beyond
Clerk's own defaults · a full multi-org switcher (only the minimal picker above) ·
product billing / Stripe subscriptions (sub-project 5).
