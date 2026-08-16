# Ruminate Portal

The operations platform for Ruminate — E-Cell IIIT Surat. This is a separate product from `ecelliiitsurat.in`; it is designed for eventual deployment at a domain such as `portal.ecelliiitsurat.in`.

## Overview

Ruminate Portal is one reusable program engine for registrations, UdbhAV, SSIP, Abhyudaya, hackathons, workshops, industry visits, mentorship, pitch competitions, and future initiatives. Program behavior comes from database configuration—forms, team limits, stages, capacity, rubrics, and permissions—not event-specific code.

## Architecture

- `app/` — App Router pages and protected route handlers
- `components/` — accessible shared UI and interactive product surfaces
- `lib/authz.ts` — database-backed roles, permissions, ownership, reviewer, and program-manager scope checks
- `lib/services/` — transactional application, evaluation, status, and private-file workflows
- `lib/validation/` — Zod request and dynamic-form validation
- `prisma/schema.prisma` — PostgreSQL data model and constraints
- `prisma/seed.ts` — development-only roles, accounts, and configurable demonstration programs
- `docs/` — admin, security, and database guides
- `tests/` — high-value domain tests

## Tech stack

Next.js-compatible App Router (Vinext runtime), React 19, TypeScript strict mode, Tailwind CSS, PostgreSQL, Prisma, Auth.js, Google OAuth, Zod, and a private Cloudflare R2 bucket using S3-compatible signed requests.

## Local setup

1. Install Node.js 22+ and PostgreSQL 15+.
2. Copy `.env.example` to `.env` and replace placeholder values.
3. Create an empty PostgreSQL database named `ruminate_portal` (or change `DATABASE_URL`).
4. Install dependencies with `npm install`.
5. Generate the Prisma client with `npm run db:generate`.
6. Apply migrations with `npm run db:migrate`.
7. Optionally load development data with `npm run db:seed`.
8. Start the portal with `npm run dev`.

## Environment variables

Required in production:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_TRUST_HOST`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPER_ADMIN_EMAILS`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PRIVATE_BUCKET`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `APP_URL`

Optional/provider-specific: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. No server secret uses the `NEXT_PUBLIC_` prefix.

## PostgreSQL and Prisma migrations

`DATABASE_URL` must use a least-privilege PostgreSQL account in production. Use `npm run db:migrate` locally when changing the schema and commit the resulting `prisma/migrations` directory. Deploy existing migrations with `npm run db:deploy`; never run the development migration command in production.

## Google OAuth and Auth.js

Create a Google OAuth web client and add these redirect URIs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://portal.ecelliiitsurat.in/api/auth/callback/google`

Set the client ID and secret in the runtime environment. Auth.js persists accounts and sessions in PostgreSQL. No password authentication is implemented.

## Initial Super Admin

Set `SUPER_ADMIN_EMAILS` to a comma-separated allowlist before the first sign-in. Seed roles and permissions first, then sign in with exactly one listed Google account. The Auth.js user-creation event attaches `PARTICIPANT` and, only when explicitly allowlisted, `SUPER_ADMIN`. After bootstrap, role assignments are database-backed. Remove the bootstrap email when operational policy allows. Institution domains are never treated as administrators automatically.

## Cloudflare R2 private bucket

Create a private bucket with no public `r2.dev` access. Configure an R2 API token scoped only to that bucket. The browser asks the authenticated server for a five-minute PUT URL; the server verifies application ownership, field rules, MIME type, size, and object-key prefix. After upload, the server verifies R2 metadata before saving the database record. Downloads require a fresh ownership/assignment/manager authorization check and return a two-minute signed URL.

Recommended bucket CORS permits `PUT` from the portal origin and the exact content types used by forms. Do not permit wildcard public reads.

## Email configuration

`EMAIL_PROVIDER=console` is the safe development setting and must never contact a production provider. Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and a verified `EMAIL_FROM` only in production. Delivery attempts belong in `EmailDelivery`; providers must be called from a queue or retry-capable server workflow.

## Seed data

`npm run db:seed` is blocked when `NODE_ENV=production`. It creates clearly named local users and three configuration-driven examples:

- UdbhAV: team application, pitch deck, four stages, rubric
- SSIP: proposal, private document, revision-oriented stages, faculty-ready review
- Industry Visit: individual registration, capacity 50, waitlist, no evaluation

These are normal `Program`, `FormVersion`, `ProgramStage`, and `Rubric` records. There is no event-specific backend.

## Development and testing

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run format:check`

The pure-domain suite covers deadlines, team bounds, edit overrides, weighted scores, and dynamic field validation. Authorization-sensitive route handlers always query by owner, assigned reviewer, or managed program; add PostgreSQL integration tests for transactions and file access in CI with isolated users.

## Production build and deployment

Run migrations before starting the new release, then run `npm run build`. Configure all secrets in the hosting platform, keep PostgreSQL and R2 private, force HTTPS, and set `APP_URL` to the canonical portal origin. Google OAuth callback URLs must match exactly. Use a pooled PostgreSQL endpoint compatible with the deployment runtime. Back up PostgreSQL, enable R2 object-versioning/retention as policy requires, and forward application logs without confidential answer or file content.

## Security notes

Every mutation is server-authorized. Participant ownership, program-manager scope, reviewer assignment, and Super Admin powers are checked independently of UI visibility. Submission is transactional; form versions preserve historical readability; files have non-guessable keys and short-lived access; important changes create audit rows. See [docs/SECURITY.md](docs/SECURITY.md).

## Important routes

- Public: `/`, `/programs`, `/programs/[slug]`, `/signin`
- Participant: `/dashboard`, `/applications`, `/applications/[id]`
- Reviewer: `/reviewer`, `/reviewer/reviews/[id]`
- Admin: `/admin`, `/admin/programs`, `/admin/programs/new`, `/admin/programs/[id]`, `/admin/programs/[id]/form`, `/admin/applications`, `/admin/applications/[id]`
- Auth/API: `/api/auth/*`, `/api/programs/*`, `/api/applications/*`, `/api/files/*`, `/api/reviews/*`

## Core-member workflow

A Super Admin grants a core member the Program Manager role and assigns the relevant program. The manager configures dates and rules, builds and publishes the form, creates stages and rubrics, assigns reviewers, publishes registration, monitors submissions, moves applications through authorized statuses, communicates outcomes, publishes results, exports authorized data, and archives the completed program. Repeating the initiative should duplicate configuration—not applications or past evaluations.
