# Ruminate Operations Platform — Project Report for the Next ChatGPT Session

**Report date:** 24 August 2026  
**Repository:** `ruminate-portal`  
**Local path:** `C:\Users\Acer\Desktop\rumi_portal`  
**Current assessment:** the core product foundation is implemented and builds successfully, but deployment/runtime configuration and end-to-end acceptance testing are not finished.

## 1. Executive summary

Ruminate is the digital operations portal for E-Cell IIIT Surat. It gives students a single place to discover programmes, register or submit ideas, upload documents, form teams, follow application status, and receive updates. It gives programme managers, admins, faculty, and reviewers tools to configure forms, assign reviews, score submissions, update statuses, communicate with participants, and audit activity.

The project is a full-stack React/TypeScript application using the Next.js 15 App Router, Auth.js v5, PostgreSQL, Prisma, and Cloudflare R2 storage.

### Estimated completion

These are engineering estimates, not a substitute for acceptance testing:

| Area                             | Estimated complete | Meaning                                                                                                           |
| -------------------------------- | -----------------: | ----------------------------------------------------------------------------------------------------------------- |
| UI and route foundation          |                85% | Most public, participant, reviewer, and admin screens exist and are styled.                                       |
| Authentication and authorization |                80% | Google and credentials flows plus role/permission checks exist; staging OAuth still needs verification.           |
| Database/domain model            |                85% | Prisma schema, migrations, seed data, status and review models exist.                                             |
| Core workflows                   |                75% | Programme applications, reviews, files, workshops, Udbhav, teams, notifications, and admin tools are implemented. |
| Production operations            |                55% | Build is deployable, but live bindings, email, backups, monitoring, OAuth domain, and staging QA remain.          |
| Automated verification           |                40% | Unit/domain tests pass; a full browser/API/role matrix is still needed.                                           |
| **Overall practical readiness**  |      **about 70%** | Suitable for controlled staging testing, not yet a claim of production readiness.                                 |

The next ChatGPT session should treat this as a **working staging candidate** and focus first on live infrastructure, role-based acceptance tests, upload/email verification, and security hardening.

## 2. Product goal and personas

### Product goal

Provide one reusable, secure operations engine for E-Cell IIIT Surat programmes instead of creating a separate custom form and review system for every event.

### Personas

- **Participant:** discovers a programme, creates an account, starts an application, saves drafts, uploads files, forms a team, submits, and follows decisions.
- **Reviewer:** sees only assigned applications, uses a rubric, submits scores/comments, and tracks review work.
- **Programme manager:** manages a programme’s lifecycle, configuration, form versions, stages, reviewers, announcements, and participant records within an allowed scope.
- **Content manager:** manages permitted public programme/workshop content and communications where granted.
- **Faculty reviewer:** can review and score assigned work with elevated faculty capabilities.
- **Super admin:** unrestricted system administrator; manages users, roles, programmes, cycles, settings, audits, and operational data.

Two baseline super-admin emails are configured by the application’s environment logic: the E-Cell account and `nishad.deshpande@iiitsurat.ac.in`. Do not put real credentials or secret values in a report, issue, commit, or prompt.

## 3. Technology stack

- **Frontend/server rendering:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4.
- **Authentication:** Auth.js v5 beta with Google OAuth and Credentials provider.
- **Database:** PostgreSQL with Prisma 6 and `@prisma/adapter-pg`.
- **File storage:** private Cloudflare R2 bucket using AWS S3 SDK presigned URLs.
- **Runtime/deployment:** Standard Node.js runtime on Vercel with Cloudflare R2 accessed through its S3-compatible API.
- **Validation/security:** Zod schemas, server-side authorization, ownership/program scoping, audit logging, rate limiting, signed file URLs, and Auth.js CSRF/session handling.
- **Email:** queue-backed delivery service; console mode is used locally and Resend is supported for real delivery.
- **Testing/tooling:** TypeScript, ESLint, Prettier, Node test runner through `tsx`, and Prisma migrations.

## 4. Repository tree

```text
rumi_portal/
├─ app/
│  ├─ admin/                         # admin workspace pages
│  │  ├─ analytics/ announcements/ audit/ audit-logs/
│  │  ├─ applications/ participants/ programs/ reviews/
│  │  ├─ settings/ users/ workshops/ udbhav/
│  ├─ api/                           # server route handlers
│  │  ├─ auth/ admin/ applications/ files/ programs/
│  │  ├─ reviews/ workshops/ udbhav/ health/ internal/
│  ├─ applications/                  # participant application pages
│  ├─ dashboard/                     # participant dashboard
│  ├─ financial-literacy-workshop/   # public workshop landing/booking
│  ├─ programs/                      # public programme list and detail
│  ├─ reviewer/                      # reviewer workspace
│  ├─ signin/                        # Google + manual sign-in UI
│  ├─ ssip/                          # SSIP public page
│  ├─ teams/                         # participant team UI
│  ├─ udbhav/                        # Udbhav public/submission UI
│  ├─ error.tsx loading.tsx not-found.tsx
│  ├─ layout.tsx page.tsx globals.css
├─ components/                       # reusable/client UI components
├─ lib/
│  ├─ authz.ts permissions.ts rate-limit.ts db.ts env.ts
│  ├─ domain/                        # access, evaluation, programme, status rules
│  ├─ services/                      # applications, bootstrap, email, files, reviews
│  └─ validation/                    # Zod request/form validation
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ public/                           # logo and social-card assets
├─ docs/                             # architecture, security, database, deployment guides
├─ tests/domain.test.ts
├─ scripts/                          # runtime/build helper scripts
├─ auth.ts
├─ middleware.ts
├─ next.config.ts
├─ package.json
├─ .env.example
└─ README.md
```

## 5. Authentication and role model

### Sign-in flow

1. A user opens `/signin`.
2. Google OAuth is initiated through `/api/auth/signin/google`; the client helper obtains providers/CSRF and follows Auth.js’s redirect response.
3. Credentials sign-in uses the same Auth.js session and checks the stored password hash.
4. A first-time account is created as a participant unless role-management rules assign another role.
5. The callback/session layer reads the user’s roles and permissions.
6. Protected pages and API handlers check authorization on the server; hiding a link in the UI is not the security boundary.

### Roles

| Role               | Typical capabilities                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `PARTICIPANT`      | Browse public programmes, create/edit own applications, upload own files, manage teams, view own statuses/notifications. |
| `REVIEWER`         | View assigned applications only, score using the configured rubric, add review comments, submit a review.                |
| `PROGRAM_MANAGER`  | Manage assigned programmes, forms, stages, reviewers, announcements, participant/application operations within scope.    |
| `CONTENT_MANAGER`  | Manage permitted public programme/workshop content and communications.                                                   |
| `FACULTY_REVIEWER` | Reviewer capabilities with faculty/elevated review privileges where assigned.                                            |
| `SUPER_ADMIN`      | Global users/roles, all programmes/cycles, settings, audits, assignments, exports, statuses, and operational controls.   |

`nishad.deshpande@iiitsurat.ac.in` is intended as a global professor/super-admin identity, not an Udbhav-only identity. Extra faculty powers should still be enforced through explicit permissions and tested with a second account.

### How to make a normal user a reviewer

1. Sign in with a super-admin or account with role-management permission.
2. Open `/admin/users`.
3. Find the user by email.
4. Assign `REVIEWER` or `FACULTY_REVIEWER` and save.
5. Open the relevant programme’s reviewer assignment screen and assign that reviewer to a stage/application set.
6. Verify the reviewer can see the assigned review but cannot see unrelated participant data.

## 6. Implemented feature inventory

### Public experience

- Ruminate-branded landing page with animated spark/fire visual treatment and responsive navigation.
- Public programme catalogue and programme detail pages.
- Udbhav and SSIP public pages.
- Financial literacy workshop page with upcoming/previous workshops and seat reservation flow.
- Branded sign-in page with Google and email/password options.
- Global loading, not-found, error, and slow-network presentation components.
- Active navigation highlighting and responsive app shell.

### Participant experience

- Participant dashboard with applications, available programmes, notifications, and teams.
- Configurable multi-step application forms with drafts, validation, review-before-submit, submission, withdrawal, and comments.
- Team creation/invitations and participant profile/notifications.
- Private file upload flow: request upload URL, upload to R2, finalize metadata, then download through an authorized endpoint.
- Application/programme status tracking.
- Udbhav proposal flow with title, problem/proposal, solution, technology, budget, distribution/impact, and supporting-file fields.
- Workshop booking form with name, email, phone, batch, year, student ID, department, and attendance reason.

### Reviewer/faculty experience

- Reviewer dashboard and assigned review pages.
- Review assignments, blind-review support fields, rubric/evaluation model, comments, and submit action.
- Udbhav review/status surfaces and reviewer assignment support.

### Admin/manager experience

- Admin dashboard and analytics surfaces.
- User and role management.
- Programme CRUD, publication/lifecycle controls, form versions, stages, rubrics, reviewer assignments, applications, announcements, and settings.
- Workshop creation/editing, status/lifecycle, banner metadata, and booking management.
- Udbhav cycle management, opening/closing controls, submissions, reviewer assignments, status updates, and export support.
- Audit logs and operational settings.
- Email queue/notification status tracking.

### Backend capabilities

- Auth.js v5 Google + Credentials providers.
- Prisma schema and migrations for users, roles, permissions, programmes, forms, applications, teams, reviewers, evaluations, files, workshops, bookings, Udbhav cycles/submissions, notifications, emails, announcements, and audits.
- Zod validation, server authorization/scoping, rate limiting, audit logging, and ownership checks.
- Private R2 upload/download signing.
- CSV/Excel-oriented export endpoints/services for operational data.

## 7. Important route map

### Public routes

```text
/                              Landing page
/programs                      Programme catalogue
/programs/:slug                Programme detail
/udbhav                        Udbhav information and cycle/submission entry
/ssip                          SSIP information
/financial-literacy-workshop   Workshop catalogue, details, seat booking
/signin                        Google + credentials sign-in
```

### Participant routes

```text
/dashboard
/applications
/applications/start
/applications/:id
/applications/:id/edit
/teams
/notifications
/profile
```

### Reviewer routes

```text
/reviewer
/reviewer/reviews/:id
/reviewer/udbhav
/reviewer/udbhav/:id
```

### Admin routes

```text
/admin
/admin/users
/admin/programs
/admin/programs/new
/admin/programs/:id/form
/admin/programs/:id/stages
/admin/programs/:id/reviewers
/admin/programs/:id/evaluation
/admin/programs/:id/applications
/admin/programs/:id/announcements
/admin/programs/:id/analytics
/admin/programs/:id/settings
/admin/applications
/admin/reviews
/admin/participants
/admin/workshops
/admin/workshops/financial-literacy
/admin/workshops/bookings
/admin/udbhav
/admin/udbhav/:id
/admin/announcements
/admin/audit-logs
/admin/settings
```

### Key API groups

```text
/api/auth/*
/api/auth/signup
/api/health
/api/programs
/api/programs/:id/applications
/api/applications/:id/{draft,submit,withdraw,team,reviewers,status,comments}
/api/files/{upload-url,finalize}
/api/files/:id/download
/api/reviews/:id/submit
/api/workshops
/api/workshops/:id
/api/workshops/bookings
/api/workshops/financial-literacy
/api/udbhav/cycle
/api/udbhav/submissions
/api/udbhav/submissions/:id/{review,reviewers,file}
/api/admin/*
/api/internal/email/process
```

The canonical OAuth callback is:

```text
http(s)://YOUR_ORIGIN/api/auth/callback/google
```

The origin must match the current browser host and the Google Cloud OAuth client configuration exactly, including scheme, hostname, port, and path.

## 8. Environment variables

The real `.env` must stay local/secret. This report records names and purpose only.

| Variable                                   | Purpose                                          | Staging guidance                                                               |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `DATABASE_URL`                             | PostgreSQL connection string                     | Use a dedicated staging database; never use local credentials in production.   |
| `DIRECT_URL`                               | Direct PostgreSQL endpoint for Prisma migrations | Use the provider's direct/non-pooled endpoint; never expose it to the browser. |
| `AUTH_SECRET`                              | Auth.js session/signing secret                   | Generate a new random value for staging and production.                        |
| `AUTH_TRUST_HOST`                          | Allows Auth.js to trust the deployment host      | Set only according to the deployment’s Auth.js requirements.                   |
| `AUTH_URL`, `NEXTAUTH_URL`                 | Canonical Auth.js origin                         | Set both to the exact staging HTTPS origin.                                    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client credentials                  | Use a client whose authorized redirect URI is the exact staging callback.      |
| `SUPER_ADMIN_EMAILS`                       | Comma-separated global admin allow-list          | Keep minimal; audit every address.                                             |
| `UDHBHAV_ADMIN_EMAILS`                     | Udbhav-specific allow-list/compatibility         | Keep aligned with the intended professor/admin policy.                         |
| `R2_ACCOUNT_ID`                            | Cloudflare account identifier                    | Configure as a secret/platform variable.                                       |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 S3-compatible credentials                     | Use least privilege and rotate if exposed.                                     |
| `R2_PRIVATE_BUCKET`                        | Private object bucket name                       | Use a separate staging bucket and configure CORS.                              |
| `EMAIL_PROVIDER`                           | `console`, `resend`, or `smtp`                   | Use `console` locally; configure one production provider only.                 |
| `EMAIL_FROM`                               | Sender identity                                  | Must be a verified sender in the email provider.                               |
| `RESEND_API_KEY`                           | Resend API key                                   | Store only as a deployment secret.                                             |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`    | SMTP server connection                           | Required only when `EMAIL_PROVIDER=smtp`; use `465/true` or `587/false`.       |
| `SMTP_USER`, `SMTP_PASS`                   | SMTP authentication                              | Required only when `EMAIL_PROVIDER=smtp`; store as deployment secrets.         |
| `CRON_SECRET`                              | Protects internal email processing endpoint      | Required when a scheduler calls the endpoint.                                  |
| `TURNSTILE_SECRET_KEY`                     | Optional server Turnstile validation             | Add only if guest forms use Turnstile.                                         |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`           | Optional browser Turnstile key                   | Safe for browser exposure, paired with server secret.                          |
| `APP_URL`                                  | Application canonical URL                        | Set to staging/production HTTPS origin.                                        |
| `NODE_ENV`                                 | Runtime environment                              | `production` for deployed production.                                          |

## 9. What has already been verified

The following checks were run after the Google OAuth/client-runtime fixes:

| Check                            | Result                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `npm.cmd run typecheck`          | Pass                                                                          |
| `npm.cmd run lint`               | Pass                                                                          |
| `npm.cmd test`                   | Pass; 12 domain tests                                                         |
| `npm.cmd run format:check`       | Pass                                                                          |
| `npm.cmd run build`              | Pass                                                                          |
| `npm.cmd run build`              | Pass; standard Next.js production bundle generated                            |
| Local Auth.js providers endpoint | Google provider present                                                       |
| Local sign-in POST               | Auth.js sign-in endpoint returned successfully and produced an OAuth redirect |

The local build proves that the standard Next.js bundle can be generated, but it does not prove that production PostgreSQL/R2/email resources are connected in Vercel.

## 10. Known incomplete work and risks

### P0 — must complete before sharing a serious staging build

1. **Configure staging infrastructure:** PostgreSQL, R2 private bucket, Vercel environment variables, and a real HTTPS origin.
2. **Configure OAuth for the staging origin:** add the exact `/api/auth/callback/google` redirect URI and authorized origin; add test users if the OAuth consent screen is in testing mode.
3. **Verify database connectivity from the deployed Vercel app:** `/api/health` must return HTTP 200 with database readiness.
4. **Verify the Vercel environment:** all required variables must be configured for Preview and Production, using a pooled PostgreSQL URL for serverless connections.
5. **Test R2 upload end to end:** presign, upload, finalize, authorized download, size/type rejection, and expired URL behavior.
6. **Test email delivery:** switch from console to Resend only after sender/domain verification; run the queue processor/scheduler and test every status template.
7. **Run the role matrix below with separate accounts.**

### P1 — strongly recommended before public launch

- Add browser/API integration tests for Google login, credentials login, applications, uploads, workshops, Udbhav, role changes, reviewer scoring, and exports.
- Add database backups/restore rehearsal, monitoring, error alerts, structured logs, and request tracing.
- Add rate limits and abuse controls to public booking/signup/upload endpoints and confirm limits in the deployed runtime.
- Confirm all admin APIs enforce server-side permission checks and programme scoping, not only UI visibility.
- Review file content type/size limits, malware scanning policy, retention, and privacy notices.
- Confirm Udbhav cycle date/time-zone behavior, monthly opening rule, three-day window, manual admin override, and closed-state UX.
- Verify Excel/CSV export encoding, date formats, and privacy restrictions.
- Rotate secrets that may have appeared in screenshots, terminal output, or chat history.

### P2 — polish and maintainability

- Add product analytics with privacy-safe events.
- Add an accessibility audit (keyboard navigation, focus states, labels, contrast, reduced motion).
- Add content editing for SSIP/Udbhav/workshop banners and richer public CMS-style sections.
- Add release/version notes and a staging-to-production migration checklist.
- Resolve or formally accept the current `npm audit --omit=dev --audit-level=high` result: three high findings are in a Prisma dependency chain. Do not use `npm audit fix --force` without compatibility testing because it proposes a breaking Prisma change.

## 11. Staging deployment plan

1. Create a separate staging PostgreSQL database and run:

   ```text
   npm ci
   npm run db:generate
   npm run db:deploy
   npm run db:seed        # only where seed data is desired
   ```

2. Create a separate private R2 staging bucket. Configure upload CORS for the staging origin and least-privilege S3-compatible credentials.
3. Build and run quality checks:

   ```text
   npm run typecheck
   npm run lint
   npm test
   npm run format:check
   npm run build
   ```

4. Import the repository into Vercel with the repository root as the Root Directory, use `npm run build`, and leave Output Directory blank.
5. Add environment values through Vercel Project Settings. Never commit `.env` or paste secrets into issues.
6. Set `APP_URL`, `AUTH_URL`, and `NEXTAUTH_URL` to the same staging HTTPS origin.
7. In Google Cloud, add exactly:

   ```text
   https://YOUR-STAGING-DOMAIN/api/auth/callback/google
   ```

8. Open `https://YOUR-STAGING-DOMAIN/api/health` and require HTTP 200 readiness before testing UI flows.
9. Share the staging URL with teammates, not a local `localhost` URL. Give them a short test account/role matrix and a bug-report template.

Useful official deployment references:

- [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)
- [Vercel project configuration](https://vercel.com/docs/project-configuration)

## 12. Teammate acceptance-test plan

Use separate Google accounts for each role. Do not test admin behavior using a participant session left in the same browser profile; use private windows or separate browser profiles.

### Participant test

1. Sign in with a non-admin Google account.
2. Confirm `/dashboard` shows participant navigation only.
3. Browse `/programs`, `/udbhav`, `/ssip`, and `/financial-literacy-workshop`.
4. Start a programme application, save a draft, reload, edit, and submit.
5. Create a team, invite another account, accept the invite, and verify membership.
6. Upload a valid PDF/image; confirm progress, finalization, and download.
7. Try a wrong file type/oversized file and confirm a clear rejection.
8. Book a workshop seat and verify confirmation/status.
9. Confirm the participant cannot open `/admin` or unrelated reviewer records.

### Reviewer test

1. Have an admin assign the account `REVIEWER` and assign it to a programme/application stage.
2. Confirm `/reviewer` lists only assigned work.
3. Open a review, score every rubric section, add comments, submit, and confirm it becomes read-only or follows the intended workflow.
4. Try to access an unassigned application ID and confirm denial.

### Manager/admin test

1. Create a draft programme and configure its form, stages, rubric, dates, visibility, and reviewers.
2. Publish/open registration and verify the public page reflects it.
3. Review participant submissions, request changes, shortlist/reject/select, and verify audit events.
4. Create a workshop with a banner; verify public display and seat booking.
5. Create/open/close an Udbhav cycle, submit an idea, assign reviewers, score it, change status, export records, and verify participant visibility.
6. Create an announcement and verify the intended audience sees it; test email delivery separately.
7. Change a user’s role and verify the next session reflects the new permissions.

### Regression test after every deployment

- Google sign-in and sign-out.
- Credentials sign-in and sign-up.
- `/api/health`.
- Dashboard reload and navigation between all major route groups.
- Application draft/save/submit.
- File upload/finalize/download.
- Workshop booking.
- Reviewer assignment and evaluation submission.
- Admin role save.
- No unexpected `?` query strings or duplicate route prefixes; query strings should appear only when a feature intentionally uses filters, pagination, or callback/error state.

## 13. Bug-report template for teammates

```text
Environment: staging URL / browser / device
Account role: participant | reviewer | manager | faculty | admin
Route: /exact/path
Action: what was clicked or submitted
Expected:
Actual:
Time (IST):
Screenshot/video:
Browser console error:
Network request + status:
Server log correlation ID (if available):
Can it be reproduced? always | sometimes | once
```

## 14. Copy/paste context prompt for the next ChatGPT session

```text
You are helping maintain the Ruminate Operations Platform in C:\Users\Acer\Desktop\rumi_portal.

Ruminate is a full-stack React/TypeScript Next.js 15 App Router application for E-Cell IIIT Surat. It supports public programme discovery, participant applications, configurable forms, teams, private R2 uploads, workshops/bookings, Udbhav idea submissions, reviewer assignments and rubric scoring, admin/manager operations, announcements, notifications, audit logs, exports, Google OAuth, and credentials authentication.

Stack: Next.js 15, React 19, TypeScript, Auth.js v5, PostgreSQL, Prisma 6, pg, Cloudflare R2, Zod, Tailwind CSS. The local and production runtime is standard Node.js.

Important roles: PARTICIPANT, REVIEWER, PROGRAM_MANAGER, CONTENT_MANAGER, FACULTY_REVIEWER, SUPER_ADMIN. New users normally start as participants. Super-admin/role-management users assign roles and programme-specific reviewer assignments. The professor email nishad.deshpande@iiitsurat.ac.in is intended to have global admin access plus faculty/reviewer powers.

Important files: auth.ts, app/api/auth/[...nextauth]/route.ts, app/signin/page.tsx, lib/client-auth.ts, lib/authz.ts, lib/permissions.ts, lib/db.ts, lib/env.ts, prisma/schema.prisma, next.config.ts, .env.example, docs/DEPLOYMENT.md, docs/SECURITY.md.

Before changing code:
1. Read docs/CHATGPT_PROJECT_REPORT.md, README.md, docs/DEPLOYMENT.md, docs/SECURITY.md, and the relevant route/service/schema files.
2. Reproduce the issue with the correct role and route.
3. Keep server-side authorization intact; never rely only on hidden UI links.
4. Do not expose or print .env secrets.
5. Run typecheck, lint, tests, format check, and build after changes.
6. For deployment issues, verify /api/health, database connectivity, R2 binding/storage, email provider, and exact Google OAuth callback URI on the deployed origin.

Current readiness is approximately 70% overall: the core app and checks pass, but staging infrastructure, Vercel environment variables, R2/email end-to-end verification, browser/API role tests, backups/monitoring, and security review remain. Treat the application as a controlled staging candidate, not as proven production-ready until the P0 checklist passes.
```

## 15. Security and release checklist

- [ ] Rotate any secret that appeared in screenshots, chat, terminal output, or shared files.
- [ ] Keep `.env` ignored and out of Git history.
- [ ] Use separate staging and production databases, R2 buckets, OAuth clients, and email credentials.
- [ ] Use HTTPS and set secure cookie/origin settings for the deployed domain.
- [ ] Confirm every admin/reviewer API performs server-side permission and ownership checks.
- [ ] Confirm private R2 objects are never publicly readable.
- [ ] Configure file size/type limits and a malware scanning/retention policy.
- [ ] Configure Resend sender/domain and email queue scheduling.
- [ ] Configure PostgreSQL backups and test restore.
- [ ] Configure Vercel logs, alerts, uptime checks, and error tracking.
- [ ] Run the full role matrix with fresh sessions.
- [ ] Review privacy/consent copy for participant data and student identifiers.
- [ ] Re-run all quality checks and record the deployment commit/version.

## 16. Bottom line

<!-- Latest production-readiness details are appended below. -->

---

# Latest production-readiness pass — 27 August 2026

This section supersedes the historical estimate above for the changes made in this pass. It describes repository evidence, not a claim that external services have been tested in every Vercel environment.

## 0. Domain and deployment target

- The repository was searched for `ruminate-portal.vercel.app` and `ruminate-portal2.vercel.app`; no references remain in tracked source, docs, or configuration (generated dependency/build folders were excluded).
- `AUTH_URL`, `NEXTAUTH_URL`, and `APP_URL` are read from the server environment in `lib/env.ts`; they are not hardcoded in auth or redirect code. Production validation requires all three to be the same HTTPS origin.
- The intended production origin is `https://portal.ecelliiitsurat.in`.
- External actions still required: attach/verify this domain in Vercel; set the Production (and, if used, Preview) variables on the Vercel project serving it; add `https://portal.ecelliiitsurat.in/api/auth/callback/google` and the matching HTTPS JavaScript origin to the Google OAuth client.

## Exact environment contract

Required in Vercel (exact casing):

`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `AUTH_URL`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PRIVATE_BUCKET`, `EMAIL_PROVIDER`, `EMAIL_FROM`, and `APP_URL`.

Conditional/optional variables:

- `RESEND_API_KEY` is required only when `EMAIL_PROVIDER=resend`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS` are required only when `EMAIL_PROVIDER=smtp`; the port must be 1–65535 and secure should normally be `true` for 465 and `false` for 587.
- `CRON_SECRET` protects the email queue processor when configured.
- `SUPER_ADMIN_EMAILS`, `UDHBHAV_ADMIN_EMAILS`, and `TURNSTILE_SECRET_KEY` are optional. `AUTH_DEBUG` is an optional direct read in `auth.ts` and should be unset/false in production. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` appears only in legacy documentation/example material and is not read by the current server code.

`NODE_ENV` is supplied by Vercel/Next.js. `AUTH_TRUST_HOST` must be the string `true` in production. No environment parser falls back to localhost or the old Vercel domains; invalid/missing required values throw a named configuration error.

## Security (1–8)

| Area                          | Result                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authentication abuse controls | Credentials sign-in and signup have independent IP/email rate limits. Failed credential attempts use a five-failure/15-minute backoff bucket and successful authentication clears it. There is no password-reset endpoint in this repository, so none was rate-limited.                                                                                      |
| Password/session hardening    | `bcrypt-ts` hashes with cost 12. Passwords are not logged. Auth.js uses JWT sessions with a 30-day max age and its production cookie defaults (httpOnly, secure on HTTPS, sameSite=lax). Verify the deployed cookie flags in a browser before launch.                                                                                                        |
| Authorization                 | Admin, reviewer, manager, faculty, and participant checks remain server-side in route handlers/services. Team join-request mutations verify team-leader ownership. Direct unauthorized API access is rejected.                                                                                                                                               |
| Auditability                  | Existing audit events cover role, team, application, workshop/program, and evaluation actions. Udbhav status changes, reviewer assignments, and review submissions now also create audit events with actor, record, timestamp, and metadata.                                                                                                                 |
| Validation/injection          | API payloads use Zod before database writes. No `$queryRawUnsafe` or raw SQL string concatenation was found. User content is rendered as React text; no `dangerouslySetInnerHTML` exists.                                                                                                                                                                    |
| Upload safety                 | R2 and Udbhav uploads enforce allowlists, size limits, sanitized/random object keys, and private short-lived signed URLs. Malware scanning is not implemented and remains a launch decision/risk.                                                                                                                                                            |
| HTTP headers/CSP              | `next.config.ts` adds nosniff, frame denial, strict-origin referrer policy, restrictive permissions, and a Content-Security-Policy-Report-Only policy with only the Google OAuth/font/image/connect exceptions currently needed. `/api/csp-report` records violation reports. Review reports before enforcing CSP.                                           |
| CSRF/secrets/dependencies     | Middleware checks Origin/host on state-changing non-Auth.js API calls, including signup. `.env` has no Git history (`git log --all --full-history -- .env` returned no commits). No hardcoded secret fallback remains. `npm audit --audit-level=high` could not reach the registry in this environment; run it in CI/local network and apply reviewed fixes. |

## Reliability (9–11)

- `safeError` logs structured JSON (`timestamp`, route, method, error name/message/stack, request ID) server-side and returns a safe request-ID response. Auth, signup, workshop, Udbhav, feedback, and other route handlers use this pattern; the financial-literacy route is a deliberate re-export of the booking handler, which contains the try/catch.
- `app/error.tsx` logs the actual error before rendering the friendly boundary and preserves an intended destination for session-expiry redirects.
- `lib/db.ts` removed the invalid localhost fallback and validates production URLs. Prisma uses a small serverless-safe `pg` pool (max 5, idle timeout 10s, connection timeout 10s); `DATABASE_URL` is the pooled runtime URL and `DIRECT_URL` is reserved for migrations.
- `/api/health` runs a real `SELECT 1`, validates production configuration, returns 200 only when ready, and returns 503 when the database/configuration is unhealthy.

## UX and accessibility (12–18)

- Branded loading/skeleton states now cover the dashboard, admin, reviewer, teams, and other data-heavy route groups. Existing forms retain inline status/error feedback and disabled in-flight actions; no new global toast library was introduced because this pass avoided changing business behavior.
- Empty states are present for list surfaces, and destructive operations retain confirmation requirements where implemented.
- Session failures show a clear message and redirect to sign-in with the original path preserved.
- Authenticated navigation now has a mobile hamburger/scrim menu, active-route highlighting, keyboard Escape handling, and icon labels. The public navigation remains responsive. Dark-theme contrast and keyboard-friendly controls were reviewed in the touched surfaces.

## Launch features (19–22)

- `app/layout.tsx` now provides the Ruminate title/tagline, custom-domain metadata base, Open Graph/Twitter cards, icons, and theme color. Generated assets are present at `public/og-image.png` (1200×630), `public/icon.png` (512×512), `public/apple-touch-icon.png` (180×180), `public/favicon.ico`, and `public/icons/192x192.png`/`512x512.png`. Review the generated art/brand wording before launch.
- `app/robots.ts` and `app/sitemap.ts` expose only public pages. The sitemap is dynamic so a Vercel build does not require database access.
- `app/privacy/page.tsx` and `app/terms/page.tsx` match the dark/ember style. They are explicitly starter legal text and require lawyer/organisational review before being treated as final.
- `components/feedback-widget.tsx`, `app/api/feedback/route.ts`, and `/admin/feedback` provide a persistent Bug/Suggestion/Other channel, optional signed-in email/page context, Zod validation, database storage, admin notification/email queueing, and newest-first filtering.
- `app/manifest.ts` and `components/install-prompt.tsx` provide a manifest-only install experience. No service worker/offline cache was added, avoiding stale application data.

## Files changed/added in this pass

Key changed files include `lib/env.ts`, `lib/db.ts`, `lib/rate-limit.ts`, `lib/errors.ts`, `auth.ts`, `middleware.ts`, `next.config.ts`, `app/layout.tsx`, `app/error.tsx`, `app/globals.css`, the Auth/signup/Udbhav/team routes, and the navigation/loading components. New launch surfaces include `app/api/csp-report/route.ts`, `app/api/feedback/route.ts`, `app/admin/feedback/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`, mobile/install/feedback components, launch assets, and the `Feedback` Prisma migration. `.env.example`, `README.md`, `docs/DEPLOYMENT.md`, and this report document the new contract.

## Verification

Passed in this workspace:

- `npm.cmd run db:generate`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run format:check`
- `npm.cmd test` (12 tests)
- `npm.cmd run build` (plain Next.js 15 output; no worker/Vinext output)

`npm.cmd audit --audit-level=high` was attempted but the sandbox could not access the npm audit registry; this is an environment/network limitation, not a clean vulnerability result. No commit was created in this pass.

## Manual pre-launch checklist and decisions

1. Configure the custom domain/DNS and all exact variables above in the correct Vercel environment; redeploy after changing variables.
2. Register the Google callback and JavaScript origin for the custom domain; test Google and credentials sign-in in a fresh browser session.
3. Run `prisma migrate deploy` against the production database during deployment; verify pooled/direct Neon (or other provider) URLs and backups/restore.
4. Configure the R2 private bucket, CORS for the custom domain, signed URL access, retention, and a malware/content-scanning policy.
5. Choose and verify email delivery (Resend or SMTP), sender-domain authentication, queue processing, and a scheduled `POST /api/internal/email/process` job protected by `CRON_SECRET`.
6. Review CSP Report-Only logs, then decide when to remove `unsafe-inline`/`unsafe-eval` and switch to enforcing CSP.
7. Review the generated social images, privacy/terms text, retention/consent language, and institutional contacts.
8. Execute a fresh-session role matrix (participant, reviewer, programme manager, content manager, faculty reviewer, super admin), including direct API 401/403 tests, Udbhav uploads/statuses, team approvals, exports, workshop bookings, announcements, and feedback.
9. Configure Vercel runtime logs, uptime alerts, error tracking, database monitoring, rate-limit capacity, and an incident/rollback plan.

Serious remaining risks requiring an explicit decision are malware scanning for uploaded documents, legal approval of the starter policies, final CSP enforcement, production email/provider limits, and the unverified npm audit result. Do not paste `.env` values or credentials into chat/screenshots; rotate any secret that has already been exposed.
