# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Egyptian and MENA lawyers and law firms — solo practitioners and small-to-mid
firms currently running research manually and practice operations on ad hoc
tools (WhatsApp, spreadsheets, paper files). The existing product started as
the founder's own Arabic legal-research tool; the SaaS pivot opens it to other
firms.

## Product Purpose

LegalOS is a practice-management SaaS ("lightweight Clio") for Egyptian/MENA
law firms, built around the project's existing Arabic-grounded legal research
and citation engine as its core AI differentiator, expanding outward to cover
the full practice lifecycle: client/matter management, documents, calendaring,
time & billing, and eventually the product's own subscription billing.

## Positioning

Generic practice-management tools (Clio) have no legal-research AI. Generic
LLM legal-chat wrappers have no firm operations and no citation discipline.
LegalOS's mechanism a neighbor could not truthfully copy: AI research and
drafting grounded in verified Egyptian (and Saudi) statute text with exact
article citations — refusing to answer rather than guessing, enforcing hard
jurisdiction isolation — wired directly into a firm's matters, clients, and
documents rather than living in a separate chat tab.

## Operating Context

- RTL-native Arabic UI is an existing, binding product commitment (Astryx was
  chosen specifically for real RTL support); English runs alongside it, not
  in place of it.
- Multi-tenant firms with three roles — Owner, Lawyer, Staff — established in
  the shipped Auth & Organizations sub-project.
- Solo-founder build, phased sub-project sequencing (see
  `docs/ailab/specs/`). Auth & Organizations, the core research/answering
  engine, and the practice-management pillars — clients, matters, cases,
  documents, calendaring, tasks, time tracking and billing — have real
  backends today (migration `0006_practice.sql`, `legalrag.practice`,
  `legalrag.practice_api`). CRM, accounting, automations, messaging,
  knowledge base and reports do not yet have backend implementations, and
  their screens say so.
- This design pass is an explicit exception to that phased sequencing: a
  full-surface UI concept for the entire intended product, requested ahead of
  the backend roadmap, to be made functional pillar-by-pillar afterward. It
  does not replace or reorder the actual backend build plan recorded in
  `docs/ailab/specs/` and `docs/ailab/plans/`.

## Capabilities and Constraints

- Confirmed and shipped: Clerk-based auth with custom RTL sign-in/sign-up/
  invite screens; organizations/memberships/roles in Postgres; grounded Q&A
  over the Egyptian (and Saudi) statute corpus with mandatory citations and
  refusal-over-hallucination; FastAPI backend; Next.js 16 + Astryx (RTL-native)
  frontend at `web/`.
- This pass's scope: real Next.js/Astryx page scaffolds (not static mockups)
  for the full nav surface — Dashboard, CRM, Clients, Matters, Cases,
  Calendar, Tasks, Documents, AI Assistant, Legal Research, Contract Review,
  Time Tracking, Billing, Accounting, Reports, Knowledge Base, Messages,
  Automation, Settings — populated with mock/placeholder data, since most
  pillars have no backend yet.
- Screens must not fabricate claims that could be mistaken for real product
  state (no invented customer metrics, no implying integrations exist that
  don't). Mock data should read as plausible sample content, not as evidence.
- Terminology: "matter" is the core practice record; "case" is the
  litigation-specific record a matter can hold (court, judge, case number,
  opposing party) — not a synonym for matter.
- Undecided: how/when each pillar's real backend gets built is not decided by
  this document — that stays sub-project-by-sub-project per
  `docs/ailab/specs/`.

## Brand Commitments

- Product name for this full-surface build: **LegalOS**. This is a rebrand
  introduced by the brief that requested this work; the shipped app currently
  identifies as "LegalRAG" in `web/app/layout.tsx` metadata. Treated as an
  intentional rename for the SaaS surface — flagged here rather than silently
  assumed.
- Palette (binding, from the brief): primary deep navy `#0F172A`, accent
  emerald `#10B981`, AI-accent purple `#7C3AED`, background `#F8FAFC`, white
  cards, subtle borders.
- Typography: Inter.
- Applied as a theme layered on Astryx (the existing RTL design system),
  per the user's explicit choice — not a replacement of Astryx.
- Visual reference points named in the brief: Stripe Dashboard, Linear,
  Notion, Vercel, Clerk, Attio CRM, Arc Browser.

## Evidence on Hand

- Existing production UI (chat/search/library) in `web/app` on Astryx.
- Existing Auth & Organizations design spec and implementation plan under
  `docs/ailab/`.
- Astryx CLI (`npx astryx`) available in `web/` for component discovery,
  theming (`astryx theme`), and page/block templates.
- No real client, matter, billing, or firm-operations data exists yet. All
  content in the new pillars is mock/placeholder.

## Product Principles

1. Grounded AI is the product's core differentiator — every AI-surfaced legal
   claim traces to a citation. This carries into LegalOS's AI Assistant,
   Legal Research, and Contract Review screens, not just the original chat UI.
2. RTL-native, not RTL-retrofitted — Arabic is a first-class layout direction
   throughout, per the existing Astryx commitment.
3. Operate mode over marketing polish — daily-use professional tools for
   lawyers under time pressure; scanability, density, and native app
   conventions outrank persuasion, even while matching the named craft bar.
4. UI concept precedes backend, honestly — this pass intentionally builds
   ahead of the phased backend roadmap; it must not imply pillars are
   functional before they are.
5. Multi-tenant, role-aware by construction — Owner/Lawyer/Staff distinctions
   from Auth & Organizations should visibly inform what each screen shows or
   allows, even in concept form.

## Accessibility & Inclusion

Inherits Astryx's accessibility baseline. Arabic script legibility rules
already established in `web/app/globals.css` (line-height, font stack) must
be preserved and extended into new screens.
