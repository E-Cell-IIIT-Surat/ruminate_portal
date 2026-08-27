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

Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS, PostgreSQL, Prisma, Auth.js, Google OAuth, Zod, and a private Cloudflare R2 bucket using S3-compatible signed requests.

## Local setup

1. Install Node.js 22+ and PostgreSQL 15+.
2. Copy `.env.example` to `.env` and replace placeholder values.
3. Create an empty PostgreSQL database named `ruminate_portal` (or change `DATABASE_URL`).
4. Install dependencies with `npm install`.
5. Generate the Prisma client with `npm run db:generate`.
6. Apply migrations with `npm run db:migrate`.
7. Optionally load development data with `npm run db:seed`.
8. Start the portal with `npm run dev`.

`npm run dev` starts the standard Next.js development server. Production uses
the normal Node.js runtime provided by Vercel.

## Environment variables

Required in production:

- `DATABASE_URL`
- `DIRECT_URL` (direct PostgreSQL endpoint used by Prisma migrations)
- `AUTH_SECRET`
- `AUTH_TRUST_HOST`
- `AUTH_URL`
- `NEXTAUTH_URL`
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

When `EMAIL_PROVIDER=resend`, add `RESEND_API_KEY`. When `EMAIL_PROVIDER=smtp`, add
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS`. Optional
Turnstile values are `TURNSTILE_SECRET_KEY` and
`NEXT_PUBLIC_TURNSTILE_SITE_KEY`; no server secret uses the `NEXT_PUBLIC_`
prefix.

`CRON_SECRET` is required when a scheduler calls the protected email-queue processor. Generate a random value of at least 32 characters and send it as `Authorization: Bearer <CRON_SECRET>` to `POST /api/internal/email/process`.

## PostgreSQL and Prisma migrations

`DATABASE_URL` must use a least-privilege PostgreSQL account in production. Use `npm run db:migrate` locally when changing the schema and commit the resulting `prisma/migrations` directory. Deploy existing migrations with `npm run db:deploy`; never run the development migration command in production.

## Google OAuth and Auth.js

Create a Google OAuth web client and add these redirect URIs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://portal.ecelliiitsurat.in/api/auth/callback/google`

Set the client ID and secret in the runtime environment. Auth.js persists
accounts and sessions in PostgreSQL. Users can sign in with Google or with a
password created through the manual signup form.

## Initial Super Admin

Set `SUPER_ADMIN_EMAILS` to a comma-separated allowlist before the first sign-in. Seed roles and permissions first, then sign in with exactly one listed Google account. The Auth.js user-creation event attaches `PARTICIPANT` and, only when explicitly allowlisted, `SUPER_ADMIN`. After bootstrap, role assignments are database-backed. Remove the bootstrap email when operational policy allows. Institution domains are never treated as administrators automatically.

## Cloudflare R2 private bucket

Create a private bucket with no public `r2.dev` access. Configure an R2 API token scoped only to that bucket. The browser asks the authenticated server for a five-minute PUT URL; the server verifies application ownership, field rules, MIME type, size, and object-key prefix. After upload, the server verifies R2 metadata before saving the database record. Downloads require a fresh ownership/assignment/manager authorization check and return a two-minute signed URL.

Recommended bucket CORS permits `PUT` from the portal origin and the exact content types used by forms. Do not permit wildcard public reads.

## Email configuration

`EMAIL_PROVIDER=console` is the safe development setting and must never contact a production provider. Set `EMAIL_PROVIDER=resend` with `RESEND_API_KEY` and a verified `EMAIL_FROM`, or set `EMAIL_PROVIDER=smtp` with all five `SMTP_*` values. Delivery attempts belong in `EmailDelivery`; providers must be called from a queue or retry-capable server workflow.

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

Run `npm run db:deploy` before starting the new release, then run `npm run build`. Configure all secrets in the hosting platform, keep PostgreSQL and R2 private, force HTTPS, and set `APP_URL` to the canonical portal origin. Google OAuth callback URLs must match exactly. Use a pooled PostgreSQL endpoint compatible with the deployment runtime. The Prisma client uses its JavaScript engine with the PostgreSQL driver adapter, so it runs in standard Vercel serverless functions without a native query-engine binary. Back up PostgreSQL, enable R2 object-versioning/retention as policy requires, and forward application logs without confidential answer or file content.

Use `GET /api/health` as the deployment readiness probe. It returns `200` only when PostgreSQL is configured and reachable. Configure a scheduler to call the protected email processor regularly; failed deliveries are retried up to five times.

Before releasing, run `npm audit --omit=dev`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. Apply dependency security patches before production deployment.

## Security notes

Every mutation is server-authorized. Participant ownership, program-manager scope, reviewer assignment, and Super Admin powers are checked independently of UI visibility. Submission is transactional; form versions preserve historical readability; files have non-guessable keys and short-lived access; important changes create audit rows. See [docs/SECURITY.md](docs/SECURITY.md).

## Important routes

- Public: `/`, `/programs`, `/programs/[slug]`, `/udbhav`, `/ssip`, `/financial-literacy-workshop`, `/signin`
- Participant: `/dashboard`, `/applications`, `/applications/[id]`, `/teams`, `/notifications`, `/profile`
- Reviewer: `/reviewer`, `/reviewer/reviews/[id]`
- Admin: `/admin`, `/admin/programs`, program form/stages/reviewers/evaluation/announcements/analytics/settings, `/admin/applications`, `/admin/reviews`, `/admin/participants`, `/admin/users`, `/admin/workshops/financial-literacy`, and `/admin/audit-logs`
- Auth/API: `/api/auth/*`, `/api/programs/*`, `/api/applications/*`, `/api/files/*`, `/api/reviews/*`, `/api/workshops/financial-literacy`

## Reviewer access and submission workflow

Every new Google or manual-signup account starts as a `PARTICIPANT`. A Super Admin (or an account with role-management permission) opens **Admin → Users & Roles**, selects `REVIEWER` or `FACULTY_REVIEWER`, and saves. The admin then opens the relevant program's **Reviewers** tab and assigns that reviewer to an application and rubric. Only assigned applications appear in the reviewer's workspace; the reviewer cannot grant roles or see unrelated submissions.

The **Start application** action creates a draft through `POST /api/programs/[id]/applications` and then navigates to the new `/applications/[id]` record. It does not send the participant back to `/programs`. Administrators configure and publish forms under **Admin → Programs → Form**; submitted student records are available under **Admin → Applications** and each program's **Applications** tab.

The Financial Literacy Workshop is intentionally a separate seat-booking workflow rather than a program application. The public form at `/financial-literacy-workshop` stores name, batch, academic year, email, phone, student ID, and department in `WorkshopBooking`. Authorized administrators review and confirm requests at `/admin/workshops/financial-literacy`.

## Core-member workflow

A Super Admin grants a core member the Program Manager role and assigns the relevant program. The manager configures dates and rules, builds and publishes the form, creates stages and rubrics, assigns reviewers, publishes registration, monitors submissions, moves applications through authorized statuses, communicates outcomes, publishes results, exports authorized data, and archives the completed program. Repeating the initiative should duplicate configuration—not applications or past evaluations.

```
rumi_portal
├─ .prettierignore
├─ .prettierrc.json
├─ app
│  ├─ admin
│  │  ├─ analytics
│  │  │  └─ page.tsx
│  │  ├─ announcements
│  │  │  └─ page.tsx
│  │  ├─ applications
│  │  │  ├─ page.tsx
│  │  │  └─ [id]
│  │  │     └─ page.tsx
│  │  ├─ audit
│  │  │  └─ page.tsx
│  │  ├─ audit-logs
│  │  │  └─ page.tsx
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ participants
│  │  │  └─ page.tsx
│  │  ├─ programs
│  │  │  ├─ new
│  │  │  │  └─ page.tsx
│  │  │  ├─ page.tsx
│  │  │  └─ [id]
│  │  │     ├─ analytics
│  │  │     │  └─ page.tsx
│  │  │     ├─ announcements
│  │  │     │  └─ page.tsx
│  │  │     ├─ applications
│  │  │     │  └─ page.tsx
│  │  │     ├─ evaluation
│  │  │     │  └─ page.tsx
│  │  │     ├─ form
│  │  │     │  └─ page.tsx
│  │  │     ├─ page.tsx
│  │  │     ├─ reviewers
│  │  │     │  └─ page.tsx
│  │  │     ├─ settings
│  │  │     │  └─ page.tsx
│  │  │     └─ stages
│  │  │        └─ page.tsx
│  │  ├─ reviews
│  │  │  └─ page.tsx
│  │  ├─ settings
│  │  │  └─ page.tsx
│  │  └─ users
│  │     └─ page.tsx
│  ├─ api
│  │  ├─ admin
│  │  │  ├─ programs
│  │  │  │  └─ [id]
│  │  │  │     ├─ announcements
│  │  │  │     │  └─ route.ts
│  │  │  │     ├─ export
│  │  │  │     │  └─ route.ts
│  │  │  │     ├─ form
│  │  │  │     │  └─ route.ts
│  │  │  │     ├─ managers
│  │  │  │     │  └─ route.ts
│  │  │  │     ├─ route.ts
│  │  │  │     ├─ rubrics
│  │  │  │     │  └─ route.ts
│  │  │  │     └─ stages
│  │  │  │        └─ route.ts
│  │  │  └─ users
│  │  │     └─ [id]
│  │  │        ├─ roles
│  │  │        │  └─ route.ts
│  │  │        └─ route.ts
│  │  ├─ applications
│  │  │  └─ [id]
│  │  │     ├─ comments
│  │  │     │  └─ route.ts
│  │  │     ├─ draft
│  │  │     │  └─ route.ts
│  │  │     ├─ reviewers
│  │  │     │  └─ route.ts
│  │  │     ├─ status
│  │  │     │  └─ route.ts
│  │  │     ├─ submit
│  │  │     │  └─ route.ts
│  │  │     ├─ team
│  │  │     │  └─ route.ts
│  │  │     └─ withdraw
│  │  │        └─ route.ts
│  │  ├─ auth
│  │  │  ├─ signup
│  │  │  │  └─ route.ts
│  │  │  └─ [...nextauth]
│  │  │     └─ route.ts
│  │  ├─ files
│  │  │  ├─ finalize
│  │  │  │  └─ route.ts
│  │  │  ├─ upload-url
│  │  │  │  └─ route.ts
│  │  │  └─ [id]
│  │  │     └─ download
│  │  │        └─ route.ts
│  │  ├─ health
│  │  │  └─ route.ts
│  │  ├─ internal
│  │  │  └─ email
│  │  │     └─ process
│  │  │        └─ route.ts
│  │  ├─ notifications
│  │  │  └─ read
│  │  │     └─ route.ts
│  │  ├─ profile
│  │  │  └─ route.ts
│  │  ├─ programs
│  │  │  ├─ route.ts
│  │  │  └─ [id]
│  │  │     └─ applications
│  │  │        └─ route.ts
│  │  └─ reviews
│  │     └─ [id]
│  │        └─ submit
│  │           └─ route.ts
│  ├─ applications
│  │  ├─ page.tsx
│  │  ├─ start
│  │  │  └─ page.tsx
│  │  └─ [id]
│  │     ├─ edit
│  │     │  └─ page.tsx
│  │     └─ page.tsx
│  ├─ chatgpt-auth.ts
│  ├─ dashboard
│  │  └─ page.tsx
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ notifications
│  │  └─ page.tsx
│  ├─ page.tsx
│  ├─ profile
│  │  └─ page.tsx
│  ├─ programs
│  │  ├─ page.tsx
│  │  └─ [slug]
│  │     └─ page.tsx
│  ├─ reviewer
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  └─ reviews
│  │     └─ [id]
│  │        └─ page.tsx
│  ├─ signin
│  │  └─ page.tsx
│  ├─ teams
│  │  └─ page.tsx
│  └─ _sites-preview
├─ auth.ts
├─ components
│  ├─ account-access-control.tsx
│  ├─ application-comments.tsx
│  ├─ application-form.tsx
│  ├─ auth-gate.tsx
│  ├─ brand.tsx
│  ├─ form-builder.tsx
│  ├─ google-sign-in-button.tsx
│  ├─ manager-assignment.tsx
│  ├─ notification-list.tsx
│  ├─ portal-shell.tsx
│  ├─ profile-form.tsx
│  ├─ program-config-editors.tsx
│  ├─ program-form.tsx
│  ├─ program-settings.tsx
│  ├─ public-header.tsx
│  ├─ review-form.tsx
│  ├─ reviewer-assignment.tsx
│  ├─ role-editor.tsx
│  ├─ sign-out-button.tsx
│  ├─ start-application.tsx
│  ├─ status-control.tsx
│  ├─ team-editor.tsx
│  ├─ ui.tsx
│  └─ withdraw-application.tsx
├─ db
├─ docs
│  ├─ ADMIN_GUIDE.md
│  ├─ ARCHITECTURE.md
│  ├─ DATABASE.md
│  ├─ DEPLOYMENT.md
│  └─ SECURITY.md
├─ drizzle
│  └─ meta
├─ eslint.config.mjs
├─ examples
│  └─ d1
│     ├─ app
│     │  └─ api
│     │     └─ notes
│     └─ db
├─ lib
│  ├─ authz.ts
│  ├─ data
│  │  └─ public.ts
│  ├─ db.ts
│  ├─ domain
│  │  ├─ access.ts
│  │  ├─ evaluation.ts
│  │  ├─ program.ts
│  │  └─ status.ts
│  ├─ env.ts
│  ├─ errors.ts
│  ├─ permissions.ts
│  ├─ rate-limit.ts
│  ├─ services
│  │  ├─ applications.ts
│  │  ├─ bootstrap.ts
│  │  ├─ email.ts
│  │  ├─ evaluations.ts
│  │  ├─ files.ts
│  │  └─ status.ts
│  └─ validation
│     ├─ api.ts
│     ├─ dynamic-form.ts
│     ├─ form-builder.ts
│     ├─ program-settings.ts
│     └─ program.ts
├─ next-env.d.ts
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ prisma
│  ├─ migrations
│  │  ├─ 20260816000000_init
│  │  │  └─ migration.sql
│  │  ├─ 20260816010000_email_queue
│  │  │  └─ migration.sql
│  │  ├─ 20260816011000_blind_review_fields
│  │  │  └─ migration.sql
│  │  ├─ 20260816012000_team_member_order
│  │  │  └─ migration.sql
│  │  ├─ 20260816013000_announcement_targeting
│  │  │  └─ migration.sql
│  │  ├─ 20260822052243_add_password_hash
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  ├─ schema.prisma
│  └─ seed.ts
├─ middleware.ts
├─ public
│  ├─ favicon.svg
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ ruminate-social-card.png
│  └─ window.svg
├─ README.md
├─ scripts
├─ tests
│  └─ domain.test.ts
├─ tsconfig.json
└─ next.config.ts

```
