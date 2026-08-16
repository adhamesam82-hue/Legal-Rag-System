# Security and data handling

Last updated: 2026-08-14

> ## Status: this describes an arrangement that is not yet in place
>
> This document describes our infrastructure as of the migration to a dedicated
> Hetzner server. **That migration has not yet taken place.** Today the service
> runs on Vercel, Railway and Neon, which are listed as current subprocessors in
> the table below.
>
> Until the migration is complete, nothing in "Where your data is stored", "Who
> can reach it" or "Backups" describes the arrangement your data is under right
> now. In particular: the nightly encrypted backup to a second provider does not
> exist yet, and no restore has been performed. The "Open questions" section
> likewise describes the position after the migration, not today's.
>
> We would rather hand you a document that says this than one that reads well.
> If you need the current position in writing before the migration, ask us and
> we will put it in writing — do not treat this page as covering it.
>
> This note will be removed when the migration is complete and a restore has
> actually been verified.

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

Restores are tested, not assumed. A script restores the most recent backup into
an isolated container and verifies that the data and search functionality come
back intact.

## Subprocessors

| Provider | Purpose | Location | Status |
| --- | --- | --- | --- |
| Vercel Inc. | Frontend application hosting | United States | **Current** |
| Railway Corp. | API hosting | United States | **Current** |
| Neon Inc. | Database hosting | United States (data region as configured) | **Current** |
| Hetzner Online GmbH | Application and database hosting | Germany (EU) | Takes effect on migration; replaces the three above |
| Cloudflare, Inc. | Encrypted backup storage | Global | Takes effect on migration |
| Clerk, Inc. | Authentication and user accounts | United States | **Current** |
| Resend | Transactional email | United States | **Current** |
| NVIDIA Corporation | Text embeddings for legal search | United States | **Current** |
| OpenRouter, Inc. | Language model routing for generated answers | United States | **Current** |

Vercel, Railway and Neon are the providers holding your data today. Hetzner and
Cloudflare hold none of it yet. We will confirm the exact configured region of
any current provider in writing on request.

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

Security questions: adhamesam82@gmail.com
