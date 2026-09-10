# Ruminate Portal — Complete Product and Developer Guide

**Product:** Ruminate — E-Cell IIIT Surat  
**Canonical production origin:** https://portal.ecelliiitsurat.in  
**Repository:** ruminate-portal  
**Audience:** participants, reviewers, faculty, programme managers, content managers, super admins, developers, and operators  
**Purpose:** one practical description of the portal, its workflows, architecture, security model, configuration, and launch process.

This guide describes the current source code. It is not a substitute for acceptance testing, infrastructure ownership documentation, privacy/legal review, or an incident-response plan.

## 1. What the portal is

Ruminate is the operations portal for E-Cell IIIT Surat. It is the working system behind public opportunities and their complete lifecycle:

1. A visitor discovers a programme, workshop, competition, industry visit, SSIP opportunity, or UdbhAV cycle.
2. A participant signs in, starts an application or submission, saves a draft, adds a team, and uploads allowed files.
3. The server validates the request, checks dates/capacity/ownership, and stores the record in PostgreSQL.
4. Reviewers receive only applications explicitly assigned to them and score against a configured rubric.
5. Managers and administrators move records through audited statuses, request changes, publish outcomes, send announcements, and export authorized data.
6. Participants see their own progress, notifications, decisions, and next steps.

The product is one reusable programme engine. UdbhAV, SSIP, workshops, industry visits, hackathons, mentorship, pitch events, and future initiatives are configured records and forms; they are not separate backends.

## 2. Product areas

### Public discovery

- Branded home page explaining the portal and the application journey.
- Public programme catalogue at /programs, with type, registration-state, and year filters.
- Public programme details at /programs/[slug].
- UdbhAV information and the current monthly submission window at /udbhav.
- SSIP information and the current submission-window status at /ssip.
- Workshop/event directory at /financial-literacy-workshop, showing upcoming and previous workshops plus published competitions, hackathons, and related programmes.
- Workshop detail and booking pages at /financial-literacy-workshop/[slug].
- Google and email/password sign-in at /signin.
- Starter Privacy Policy and Terms pages at /privacy and /terms.
- Persistent Feedback control on public and authenticated pages.
- Responsive public navigation with a mobile menu.

### Participant workspace

- Dashboard at /dashboard with applications, available programmes, notifications, and teams.
- Application list at /applications.
- Application start screen at /applications/start.
- Application detail/draft/review screen at /applications/[id].
- Edit route at /applications/[id]/edit.
- Dynamic forms made from published, versioned form definitions.
- Draft autosave and explicit save.
- Final submission with server-side validation.
- Post-submission edit and withdrawal where programme rules permit them.
- Team creation, public team discovery, join requests, and leader decisions at /teams.
- Notification inbox at /notifications.
- Profile maintenance at /profile.
- Private document uploads and downloads through Cloudflare R2 signed URLs.
- UdbhAV idea submissions, team capture, supporting PDF/DOCX upload, status history, and submission detail.
- SSIP proposal submission at /ssip/apply.
- Financial-literacy or other workshop seat booking forms.
- Feedback submission with optional signed-in user and current-page context.
- PWA install prompt; no offline cache or service worker is used.

### Reviewer workspace

- Reviewer home at /reviewer.
- Pending and completed review views using the view query parameter.
- Assigned application review at /reviewer/reviews/[id].
- UdbhAV review queue at /reviewer/udbhav.
- UdbhAV detail/review view at /reviewer/udbhav/[id].
- Rubric-led scoring, draft evaluation saving, comments/feedback, and final review submission.
- Access is assignment-based; a reviewer cannot browse arbitrary applications.

### Administration and operations

- Admin dashboard at /admin.
- Programme catalogue and creation at /admin/programs and /admin/programs/new.
- Per-programme overview and launch controls.
- Per-programme form builder, stages, reviewers/managers, evaluation rubrics, applications, announcements, analytics, and settings.
- Global application operations at /admin/applications and /admin/applications/[id].
- Global review operations at /admin/reviews.
- Participant directory at /admin/participants.
- Workshop management at /admin/workshops, detail editors, and booking operations.
- UdbhAV cycles, submissions, assignments, review/status controls, and CSV export.
- SSIP submission window controls, status updates, and CSV export at /admin/ssip.
- Team directory governance and approval at /admin/teams.
- Announcements at /admin/announcements.
- Portfolio and programme analytics.
- User and role management at /admin/users.
- Audit logs at /admin/audit-logs and /admin/audit.
- Feedback inbox at /admin/feedback.
- Infrastructure readiness checks at /admin/settings.

### Cross-cutting UX and launch surfaces

- Shared dark/ember visual system, branded logo and typography, responsive cards/forms, and active navigation states.
- Server-rendered loading and skeleton states for the dashboard, admin, reviewer, teams, and other data-heavy areas.
- Friendly not-found and error boundaries; underlying server errors are logged with request IDs.
- Network-status banner, disabled in-flight submit buttons, inline field errors, empty states, and status messages.
- Keyboard-friendly mobile navigation, Escape-to-close menus, icon labels, and role/team help tips.
- Site footer with public links, Privacy Policy, Terms of Use, and E-Cell links.
- Open Graph/Twitter metadata, custom favicon/icons, a 1200×630 social card, robots.txt, sitemap.xml, and a manifest.

### Brand and static assets

The primary image assets are in public/: ruminate-logo.png (hero/footer), logo_of_rumi.png (alternate source artwork), og-image.png (social preview), favicon.ico, favicon.svg, icon.png, apple-touch-icon.png, and public/icons/192x192.png plus public/icons/512x512.png for the PWA manifest. Components/brand.tsx is the text/logo link used by the portal shell.

## 3. Roles and authorization

Authentication identifies an account; it does not automatically grant access to every feature. Server-side authorization is evaluated for every protected page and API request.

| Role | Current capabilities |
| --- | --- |
| PARTICIPANT | Browse public opportunities; create/edit own applications; save drafts; upload own files; create/manage own teams; request to join public teams; submit UdbhAV/SSIP/workshop forms; read own statuses and notifications; update own profile. |
| REVIEWER | See explicitly assigned applications; save and submit assigned rubric evaluations; add review feedback. |
| FACULTY_REVIEWER | Reviewer capabilities with faculty/elevated review handling where the account has an explicit assignment or permitted UdbhAV scope. |
| PROGRAM_MANAGER | Create/update/archive programmes in scope; manage forms, stages, rubrics, reviewers, managers, applications, statuses, announcements, and authorized exports for assigned programmes. |
| CONTENT_MANAGER | Current global grant is announcement:create; it can publish permitted announcements but does not automatically gain user, role, database, or programme-administration powers. |
| SUPER_ADMIN | All configured permissions: global users/roles, every programme and cycle, settings, assignments, audits, exports, status decisions, and operational controls. |

### Important derived capabilities

- Team leader is not a global role. A user is a leader because Team.leaderId points to the account. Only that leader can accept or reject join requests for that team.
- Programme manager access is scoped. A manager is linked to individual programmes through ProgramManager. Managing Programme A does not grant access to Programme B.
- Reviewer access is assignment-based. ReviewerAssignment determines which application and rubric a reviewer may open.
- New users start as participants. ensureUserRoles creates the baseline participant role. Super-admin bootstrap is controlled by the configured email allowlist and the two baseline institutional administrator addresses currently present in lib/env.ts.
- UI visibility is not security. Hidden links only improve usability. The API repeats permission, ownership, reviewer-assignment, team-leader, and programme-scope checks.

### Assigning a reviewer or manager

1. A user signs in once so a database user record exists.
2. A role-management administrator opens Admin → Users & Roles.
3. The administrator assigns REVIEWER, FACULTY_REVIEWER, PROGRAM_MANAGER, or another allowed role and saves.
4. For a manager, open the programme’s Reviewers and managers page and add the programme scope.
5. For a reviewer, assign the user to the relevant application and rubric.
6. Use a fresh session after a role change when checking navigation; protected operations still reload authorization from the database.

## 4. User guide

### 4.1 A visitor

1. Open the portal home page.
2. Browse Programs, UdbhAV, SSIP, or Workshops.
3. Read purpose, eligibility, dates, participation mode, and current registration state.
4. Use Feedback for a bug, suggestion, or other signal.
5. Use the site footer for Privacy Policy and Terms of Use.
6. If the browser supports installation, the one-time install banner explains how to install the manifest-based app.

### 4.2 Sign-in and account setup

- Google OAuth requires the exact production callback /api/auth/callback/google in Google Cloud Console.
- Credentials signup and sign-in use the same Auth.js session.
- Passwords are hashed with bcrypt-ts at cost factor 12 and are never shown or logged.
- Repeated failed credential attempts use an email-based backoff bucket; signup and sign-in also use IP/email rate limits.
- A new account receives a participant role. The first successful account login can queue a one-time welcome email and in-app welcome notification.
- Disabled/archived accounts are denied at sign-in.

### 4.3 Applying to a programme

1. Open a programme whose registration state is OPEN.
2. Click Start application. The server creates or reuses the participant’s application draft.
3. Complete each section. Field types include short text, long text, email, phone, number, URL, date, dropdown, multi-select, radio, checkbox/consent, and private file.
4. Save manually or wait for autosave. Drafts are linked to the form version used when created.
5. Review required fields and file uploads.
6. Submit. The server revalidates every field against the immutable published form version, checks deadline/capacity/team rules, writes a revision and history row, creates an in-app notification, queues email, and records an audit event.
7. If the programme requests changes, edit and resubmit. Each resubmission creates a new immutable revision.

### 4.4 Application statuses

Application statuses are DRAFT, SUBMITTED, UNDER_REVIEW, CHANGES_REQUESTED, SHORTLISTED, SELECTED, REJECTED, APPROVED, WAITLISTED, CONFIRMED, WITHDRAWN, and ARCHIVED.

Important behavior:

- A no-review programme can confirm a participant immediately if capacity is available.
- A no-review programme with full capacity can waitlist the participant when waitlisting is enabled.
- A review programme normally begins in SUBMITTED.
- Private decisions such as selected, rejected, approved, and confirmed may remain masked as Under review until the programme publishes results.
- Status transitions are checked by the server; invalid jumps return a safe error.

### 4.5 Teams

Participants can:

- Request a public team with name, motto, project summary, required member count, and a “looking for” description.
- See approved public teams and current member counts.
- Send a join request with an optional message.
- See outgoing request status in My teams and requests.
- As a leader, accept or reject incoming requests. A full team cannot accept more members.

Team approval is separate from join approval. A super admin or professor-level administrator approves the team listing first; only then is it publicly discoverable.

### 4.6 UdbhAV

- The public page explains the monthly idea programme and shows the active or next window.
- The default window is the first three UTC calendar days of each month; an administrator can manage an explicit cycle.
- A signed-in participant submits team name, idea title, challenge, proposal, solution, technology, budget, distribution/implementation plan, milestones, optional collaborators, and one required PDF or DOCX supporting document up to 5 MB.
- The server stores the submission, uploads the supporting document to private R2, and returns a reference/detail page.
- Participants can view their own ideas and status history.
- Admins can manage the cycle, assign reviewers, update status/stage, inspect scores, and export CSV.
- UdbhAV review criteria currently cover creativity, problem understanding, innovation, execution, feasibility, scalability, impact, sustainability, presentation, and completeness.

UdbhAV statuses are DRAFT, SUBMITTED, UNDER_REVIEW, IN_PROGRESS, ON_HOLD, ACTION_NEEDED, PITCH_SCHEDULED, ACCEPTED, and REJECTED.

### 4.7 SSIP

- /ssip is the public information and submission-window status page; it does not expose the private application form by default.
- /ssip/apply requires authentication and shows the form only while the administrator-controlled window is open.
- The form collects name, email, phone, institution, degree/programme, academic year, team name, idea title, problem statement, proposed solution, technology/approach, estimated budget, and expected impact.
- The server rejects submissions outside the window even if an old link is used.
- Admins open/close the window, configure opening/closing times, review incoming proposals, update status, and export CSV.
- SSIP statuses are SUBMITTED, UNDER_REVIEW, CHANGES_REQUESTED, SHORTLISTED, ON_HOLD, ACCEPTED, and REJECTED.

### 4.8 Workshops and bookings

- The directory shows upcoming and previous sessions plus published programme cards.
- Forms are hidden behind an event detail card so the directory remains scannable.
- The financial-literacy booking flow collects name, email, phone, batch, academic year, optional student ID, department/programme, and attendance reason.
- Booking records have PENDING, CONFIRMED, and CANCELLED states.
- Administrators create/edit/publish/complete/cancel workshops, manage banners and dates, and update booking status.
- Booking confirmation/status emails are queued when a production email provider is configured.

### 4.9 Notifications and email

In-app notifications are stored in the Notification table and appear in the dashboard/notification inbox. Examples include welcome/onboarding, application submitted/status changed, changes requested, reviewer assignment, targeted announcements, team join-request and team-approval decisions, UdbhAV/SSIP updates, and workshop booking updates.

Email is deliberately auxiliary:

1. The business action is committed first.
2. An EmailDelivery row is created.
3. The application makes a best-effort immediate delivery.
4. A scheduled POST to /api/internal/email/process retries queued/failed deliveries, up to five attempts.
5. Provider errors are logged server-side and do not roll back signup, approval, submission, or status changes.

Provider behavior:

- EMAIL_PROVIDER=console: local development mode; the message is logged as suppressed and never sent.
- EMAIL_PROVIDER=resend: uses the Resend HTTP API.
- EMAIL_PROVIDER=smtp: uses Nodemailer and the SMTP variables in Section 9.

### 4.10 Feedback

The fixed Feedback button opens a modal with a Bug, Suggestion, or Other type and a required 10–4000 character message. The current path is attached automatically, and signed-in user ID/email is attached when available. Submissions are stored in PostgreSQL, notify configured super-admin email recipients through the email queue, and appear newest-first under Admin → Feedback.

### 4.11 PWA installation

The portal exposes a manifest with the Ruminate name, /dashboard start URL, standalone display, dark/ember colors, and 192×192 and 512×512 icons. The custom install banner captures the browser install event when available, gives iOS/browser-menu instructions when unavailable, stores a local “seen” flag, and hides itself after dismissal or installation. There is intentionally no service worker, offline cache, or background sync.

## 5. Administrator guide

### 5.1 Create and launch a programme

New programmes begin as DRAFT. The complete flow is:

1. Open Admin → Programs → Create program.
2. Enter name, URL slug, type, short and detailed descriptions, visibility, participation mode, dates, capacity, team bounds, domain restrictions, and workflow options.
3. Save. The programme overview opens automatically.
4. Open Form → Build form. Add sections and typed fields, required rules, choices, file allowlists/limits, help text, and conditional visibility.
5. Save a draft form and then Publish form. Publishing creates an immutable version; later edits create another draft version.
6. Configure stages and initial/terminal behavior.
7. Create a rubric and ordered criteria with maximum scores and weights when evaluation is required.
8. Add programme managers and assign reviewers to applications/rubrics.
9. Configure announcements and programme settings.
10. Use the overview Launch checklist. Registration can launch only after a form is published. Click Launch registration to set REGISTRATION_OPEN.
11. Monitor applications, capacity, stages, reviews, announcements, analytics, and audit events.
12. Close registration with Close registration, then move through in-progress, completed, and archive states as appropriate.

The launch checklist prevents the common mistake of creating a programme and leaving it in draft without publishing its form or opening registration.

### 5.2 Dynamic form builder

Forms are versioned:

- Form is the programme’s form container.
- FormVersion is a draft, published, or retired snapshot.
- FormSection provides order and grouping.
- FormField contains the stable key, type, label, help text, required flag, length/number limits, options, file rules, conditions, and reviewer visibility.
- Applications point to the exact FormVersion they used.

Never edit a published version in place. Create a new draft version so historical applications remain readable and auditable.

### 5.3 Stages and reviews

- Stages are ordered and may be initial or terminal.
- Rubrics can be programme-wide or attached to a stage.
- Criteria have a maximum score and optional weight.
- Reviewer scores are normalized to a 0–100 weighted total.
- Reviewer drafts are saved separately from submitted evaluations.
- Submitting an evaluation completes the assignment and writes an audit event.
- Blind-review fields marked by the form builder are hidden from reviewers.

### 5.4 Application operations

Admins/managers can search and filter applications, inspect responses, teams, private files, reviews, comments, status history, and stage history; assign reviewers; request changes; shortlist/select/approve/reject/confirm; publish results; and export authorized data to CSV.

Exports are server-authorized and scoped to the caller’s permissions/programmes. Dynamic form fields become columns; confidential data is not exposed to an unauthorized caller.

### 5.5 Announcements

Announcements can be associated with a programme and targeted to all applicants, submitted applicants, a specific application status, or a specific stage. They are stored, shown in recipient in-app notifications, and can enqueue email when production email is configured.

### 5.6 User and role administration

Admin → Users & Roles lets a role-management administrator search accounts, assign/remove supported roles, disable/restore access, and see active/disabled state. Role changes affect server authorization immediately. A user may need a new session for the navigation/session role label to refresh.

### 5.7 Team governance

Admin → Teams lists pending, public, full, archived, rejected, and closed teams. An administrator can approve/reject a team request, archive/close a listing, monitor members/join requests, and review leader/project details. Team leaders separately control member requests from the participant team directory.

### 5.8 SSIP operations

Admin → SSIP provides an open/closed switch, opening and closing timestamps, submission metrics, status controls, newest-first proposal table, and CSV export. Closing the window blocks new submissions at the API boundary; it is not only a UI state.

### 5.9 UdbhAV operations

Admin → UdbhAV provides cycle creation and monthly window management, open/close scheduling, submission detail, reviewer assignments, reviewer workload, ten-criterion scoring, status/stage updates, status history, audit events, and CSV export.

### 5.10 Workshop operations

Admin → Workshops manages workshop records; Workshop bookings manages seat requests. A workshop can have summary, description, batch/year, venue, capacity, dates, registration dates, status, and optional banner URL.

### 5.11 Analytics, audit, settings, and feedback

- Analytics: portfolio totals plus status/stage/college distributions within authorized scope.
- Audit logs: actor, action, entity, programme scope, timestamp, and minimal metadata for sensitive changes.
- Settings: non-secret readiness checks for PostgreSQL, Google OAuth, R2, and email.
- Feedback: newest-first user signals with type filtering.

## 6. Technical architecture

### 6.1 Request path

~~~text
Browser
  │
  ├─ Next.js App Router page (server component)
  │      or client component fetch
  │
  ├─ middleware.ts
  │      ├─ CSRF/origin checks for state-changing API calls
  │      └─ baseline security response headers
  │
  ├─ app/api/**/route.ts
  │      ├─ authenticate with Auth.js
  │      ├─ authorize with lib/authz.ts / permissions
  │      ├─ validate body/query with Zod
  │      └─ call a domain service
  │
  ├─ lib/domain/*
  │      ├─ deadlines and registration state
  │      ├─ team/capacity rules
  │      ├─ valid status transitions
  │      └─ weighted evaluation scoring
  │
  ├─ lib/services/*
  │      ├─ applications and transactional submission
  │      ├─ evaluations and reviewer workflow
  │      ├─ status changes and notifications
  │      ├─ teams
  │      ├─ email queue/delivery
  │      └─ private files
  │
  ├─ Prisma client + pg adapter
  │      └─ PostgreSQL
  │
  ├─ AWS SDK S3-compatible client
  │      └─ private Cloudflare R2 bucket
  │
  └─ email provider (console, Resend, or SMTP)
~~~

### 6.2 Source layout

| Location | Responsibility |
| --- | --- |
| app/ | Next.js pages, layouts, loading/error/not-found UI, and route handlers. |
| components/ | Shared branded UI and client interaction surfaces. |
| auth.ts | Auth.js configuration, Google/Credentials providers, session callbacks, roles, and trust-host behavior. |
| middleware.ts | Mutation-origin/CSRF checks and baseline security headers. |
| lib/authz.ts | User lookup, roles, permissions, programme manager scope, ownership, and assignment checks. |
| lib/permissions.ts | Stable permission keys and role-to-permission map. |
| lib/env.ts | Environment schema, production validation, email/R2 config parsing, and admin allowlist. |
| lib/db.ts | Prisma client creation and PostgreSQL pool settings. |
| lib/domain/ | Pure workflow rules that are easy to unit test. |
| lib/services/ | Transactional business operations and integrations. |
| lib/validation/ | API, programme, form-builder, dynamic-answer, and settings Zod schemas. |
| prisma/schema.prisma | PostgreSQL data model, relationships, indexes, and enums. |
| prisma/migrations/ | Ordered schema migrations applied with Prisma. |
| prisma/seed.ts | Development-only roles and demonstration data; blocked in production. |
| public/ | Logos, favicon/icons, social-card image, and static assets. |
| tests/ | Domain and authorization-oriented tests. |
| docs/ | Operational, security, database, architecture, admin, and deployment documentation. |

### 6.3 Server/client boundary

- Server components read protected data and render initial state.
- Client components handle form input, autosave, file selection, button state, mobile menus, install prompts, and feedback.
- Client code never receives database credentials, R2 credentials, OAuth secrets, or the direct database URL.
- The server repeats all important validation and authorization because browser code can be bypassed.

### 6.4 Error handling and observability

Route handlers use safeError to log structured JSON with timestamp, route, method, error name/message/stack, and request ID. Unexpected failures return a safe generic response; Zod returns field-level errors; common Prisma conflicts/not-found errors are mapped to safe HTTP responses.

app/error.tsx logs the underlying render error before showing the friendly “That page needs another moment” screen. Vercel Runtime Logs are the source for the real server-side cause.

## 7. Technology stack

| Layer | Technology | Why it is used |
| --- | --- | --- |
| Framework | Next.js 15 App Router | Server rendering, route handlers, layouts, metadata, and Vercel deployment. |
| UI | React 19, TypeScript strict mode | Typed component model and interactive forms. |
| Styling | Tailwind CSS 4/PostCSS plus project CSS | Dark/ember visual system and responsive layouts. |
| Authentication | Auth.js v5 beta | Google OAuth, credentials sign-in, callbacks, CSRF, and session handling. |
| Identity adapter | @auth/prisma-adapter | Auth.js user/account persistence. |
| Database | PostgreSQL | Durable relational storage and transactions. |
| ORM/driver | Prisma 6 with @prisma/adapter-pg and pg | Typed queries with a serverless-safe PostgreSQL pool. |
| Validation | Zod | API payload, programme, settings, form-builder, and dynamic-answer validation. |
| Password hashing | bcrypt-ts | Credentials password hashing at cost factor 12. |
| Object storage | Cloudflare R2 via AWS SDK S3 client | Private documents with presigned upload/download URLs. |
| Email | Console, Resend, or Nodemailer SMTP | Local suppression plus production delivery options. |
| Icons | lucide-react | Consistent accessible UI icons. |
| Testing | Node test runner through tsx | Domain and authorization tests. |
| Quality | ESLint, TypeScript, Prettier | Static analysis, type safety, and formatting. |
| Hosting | Vercel Node.js runtime | Serverless Next.js deployment. |

Node.js 22.13 or newer is required by package.json.

## 8. Database and storage model

### Identity and RBAC

User, Account, Session, VerificationToken, Role, Permission, UserRole, and RolePermission.

### Programme engine

Program, ProgramManager, ProgramStage, and Rubric represent programme configuration, lifecycle, scope, and evaluation rules.

### Versioned forms and applications

Form, FormVersion, FormSection, FormField, Application, ApplicationAnswer, ApplicationRevision, ApplicationStatusHistory, and ApplicationStageHistory.

### Teams and files

Team, TeamMember, and TeamJoinRequest hold programme-scoped collaboration. ApplicationFile stores private object metadata and ownership; document bytes live in R2, not PostgreSQL.

### Reviews

ReviewerAssignment, Evaluation, RubricCriterion, and EvaluationScore preserve assignments, drafts, scores, weights, comments, and completion state.

### Communication and governance

Announcement, Notification, EmailDelivery, AuditLog, RateLimitBucket, and Feedback.

### Workshops

Workshop stores catalog/detail/lifecycle data. WorkshopBooking stores seat requests and status.

### UdbhAV

UdbhavCycle, UdbhavSubmission, UdbhavReviewerAssignment, UdbhavReview, and UdbhavStatusHistory.

### SSIP

SSIPSettings controls the submission window. SSIPSubmission stores the proposal register and workflow status.

### Migration history

The repository currently contains ordered Prisma migrations for the initial schema, email queue, blind-review fields, team-member ordering, announcement targeting, password signup, workshop bookings, workshops/UdbhAV, optional UdbhAV cycle managers, workshop banners/UdbhAV assignments, team directory, feedback, and SSIP submissions. Apply them with Prisma migration commands; do not edit production tables manually.

### Transactional guarantees

- Final application submission writes status, timestamp, revision, history, notification, and audit row transactionally.
- Capacity checks use serializable/locking protections so concurrent submissions do not silently oversubscribe a programme.
- Evaluation submission writes evaluation, criterion scores, assignment completion, and audit data together.
- Status/stage transitions write dedicated history records.
- Prisma migrations, not ad-hoc schema changes, are the production source of truth.

## 9. Environment variables

The exact server-side names currently expected are:

| Name | Required? | Purpose |
| --- | --- | --- |
| DATABASE_URL | Yes | Pooled PostgreSQL runtime connection. Must be a PostgreSQL URL and must not point to localhost in production. |
| DIRECT_URL | Yes | Direct PostgreSQL connection used by Prisma migration tooling. |
| AUTH_SECRET | Yes | At least 32 random characters for Auth.js signing/encryption. |
| AUTH_TRUST_HOST | Yes in production | Must be the string true for the Vercel forwarded host. |
| AUTH_URL | Yes | Canonical Auth.js origin, such as https://portal.ecelliiitsurat.in. |
| NEXTAUTH_URL | Yes | Same canonical origin as AUTH_URL. |
| GOOGLE_CLIENT_ID | Yes | Google OAuth web-client ID. |
| GOOGLE_CLIENT_SECRET | Yes | Google OAuth web-client secret. |
| SUPER_ADMIN_EMAILS | Recommended | Comma-separated bootstrap/administrator email allowlist. |
| UDHBHAV_ADMIN_EMAILS | Optional | Additional UdbhAV administrator allowlist. |
| R2_ACCOUNT_ID | Yes | Cloudflare account ID. |
| R2_ACCESS_KEY_ID | Yes | Least-privilege R2 S3 access key. |
| R2_SECRET_ACCESS_KEY | Yes | R2 secret access key. |
| R2_PRIVATE_BUCKET | Yes | Private R2 bucket name. |
| EMAIL_PROVIDER | Yes | console, resend, or smtp. |
| EMAIL_FROM | Yes | Verified sender address/display identity. |
| RESEND_API_KEY | Conditional | Required only for EMAIL_PROVIDER=resend. |
| SMTP_HOST | Conditional | Required only for EMAIL_PROVIDER=smtp. |
| SMTP_PORT | Conditional | Integer port; normally 465 or 587. |
| SMTP_SECURE | Conditional | String true for TLS/465, false for STARTTLS/587. |
| SMTP_USER | Conditional | SMTP username. |
| SMTP_PASS | Conditional | SMTP password/token. |
| CRON_SECRET | Recommended/conditional | At least 32 characters to protect the email queue processor. |
| TURNSTILE_SECRET_KEY | Optional | Server-side Turnstile integration if enabled by a route. |
| APP_URL | Yes | Canonical site URL used for metadata, sitemap, robots, and links. |
| NODE_ENV | Supplied by runtime | development, test, or production. |
| AUTH_DEBUG | Optional diagnostic | Set true only for controlled troubleshooting; keep unset/false in production. |

NEXT_PUBLIC_TURNSTILE_SITE_KEY remains in the example file for compatibility/documentation but is not read by the current server implementation.

Production APP_URL, AUTH_URL, and NEXTAUTH_URL must all be exactly the same HTTPS origin. Google Cloud Console must contain:

https://portal.ecelliiitsurat.in/api/auth/callback/google

No secret should be committed to Git or placed in a NEXT_PUBLIC_ variable.

## 10. File-upload behavior

### Generic application files

1. The authenticated browser requests /api/files/upload-url.
2. The server checks application ownership/assignment and the published form field’s allowed MIME types and maximum size.
3. The server returns a five-minute R2 PUT URL plus required metadata headers.
4. The browser uploads directly to the private bucket.
5. /api/files/finalize verifies object key prefix, object metadata, size, declared MIME, and common file signature before writing ApplicationFile.
6. /api/files/[id]/download performs a fresh authorization check and returns a two-minute signed GET URL.

Filenames are normalized/sanitized and prefixed with a random UUID. Public R2 reads are not part of the design.

### UdbhAV supporting document

- PDF or DOCX only.
- Maximum 5 MB.
- Extension and MIME are allowlisted.
- The object key contains a random UUID and sanitized filename.
- The document is kept in the private R2 bucket.

Malware scanning is not currently implemented; this is a production policy decision before accepting untrusted documents at scale.

## 11. Security model

- Auth.js Google/Credentials authentication.
- JWT session strategy with a 30-day max age and production secure/httpOnly/lax cookie defaults.
- trustHost: true for Vercel’s forwarded host.
- IP and email rate limits for signup and credential authentication.
- Five-failure/15-minute credential backoff for an email address.
- Server-side role, permission, ownership, manager-scope, reviewer-assignment, and team-leader checks.
- CSRF/origin checks for state-changing non-Auth.js API requests.
- Zod validation before database writes; dynamic answers are validated again on final submission.
- No raw $queryRawUnsafe usage; rate-limit SQL uses parameterized tagged-template values.
- User-generated text is rendered as React text; there is no dangerouslySetInnerHTML.
- Private R2 bucket, short-lived signed URLs, object-key checks, metadata checks, and signature checks.
- Audit logs for sensitive role, programme, application, evaluation, team, workshop, UdbhAV, SSIP, and status actions.
- Report-only CSP plus nosniff, DENY frame policy, strict-origin referrer policy, and disabled camera/microphone/geolocation.
- Safe client errors with request IDs; detailed error context stays in server logs.

## 12. Route catalogue

### Pages

~~~text
/
/programs
/programs/[slug]
/udbhav
/udbhav/submissions/[id]
/ssip
/ssip/apply
/financial-literacy-workshop
/financial-literacy-workshop/[slug]
/signin
/privacy
/terms
/dashboard
/applications
/applications/start
/applications/[id]
/applications/[id]/edit
/teams
/notifications
/profile
/reviewer
/reviewer/reviews/[id]
/reviewer/udbhav
/reviewer/udbhav/[id]
/admin
/admin/programs
/admin/programs/new
/admin/programs/[id]
/admin/programs/[id]/form
/admin/programs/[id]/stages
/admin/programs/[id]/reviewers
/admin/programs/[id]/evaluation
/admin/programs/[id]/applications
/admin/programs/[id]/announcements
/admin/programs/[id]/analytics
/admin/programs/[id]/settings
/admin/applications
/admin/applications/[id]
/admin/reviews
/admin/participants
/admin/workshops
/admin/workshops/financial-literacy
/admin/workshops/bookings
/admin/udbhav
/admin/udbhav/[id]
/admin/ssip
/admin/teams
/admin/announcements
/admin/analytics
/admin/users
/admin/audit
/admin/audit-logs
/admin/feedback
/admin/settings
~~~

### API groups

~~~text
/api/auth/[...nextauth]
/api/auth/signup
/api/health
/api/csp-report
/api/feedback
/api/profile
/api/notifications/read
/api/programs
/api/programs/[id]/applications
/api/applications/[id]/draft
/api/applications/[id]/submit
/api/applications/[id]/withdraw
/api/applications/[id]/team
/api/applications/[id]/reviewers
/api/applications/[id]/status
/api/applications/[id]/comments
/api/files/upload-url
/api/files/finalize
/api/files/[id]/download
/api/reviews/[id]/submit
/api/teams
/api/teams/[id]/join-requests
/api/teams/[id]/join-requests/[requestId]
/api/workshops
/api/workshops/[id]
/api/workshops/bookings
/api/workshops/financial-literacy
/api/admin/programs/[id]
/api/admin/programs/[id]/form
/api/admin/programs/[id]/stages
/api/admin/programs/[id]/rubrics
/api/admin/programs/[id]/managers
/api/admin/programs/[id]/announcements
/api/admin/programs/[id]/export
/api/admin/users/[id]
/api/admin/users/[id]/roles
/api/admin/teams/[id]
/api/admin/workshops/financial-literacy/[id]
/api/admin/workshops/bookings/[id]
/api/admin/udbhav/export
/api/admin/ssip/settings
/api/admin/ssip/submissions/[id]
/api/admin/ssip/export
/api/udbhav/cycle
/api/udbhav/submissions
/api/udbhav/submissions/[id]
/api/udbhav/submissions/[id]/file
/api/udbhav/submissions/[id]/review
/api/udbhav/submissions/[id]/reviewers
/api/ssip/submissions
/api/internal/email/process
~~~

The internal email processor is protected by a bearer CRON_SECRET and should be called only by a trusted scheduler.

## 13. Local development

### Prerequisites

- Node.js 22.13 or newer.
- PostgreSQL 15 or newer.
- A local .env copied from .env.example.
- Optional local R2, OAuth, and email credentials depending on the feature being tested.

### First setup on Windows PowerShell

~~~powershell
cd C:\Users\Acer\Desktop\rumi_portal
Copy-Item .env.example .env
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
~~~

db:migrate and db:seed are development commands. Never use the seed command against production.

### Quality commands

~~~powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run format:check
npm.cmd run build
~~~

### Useful database commands

~~~powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:deploy
~~~

Use db:migrate when creating a new migration locally. Use db:deploy to apply committed migrations to a deployment database.

## 14. Production/Vercel deployment

1. Attach and verify portal.ecelliiitsurat.in in the Vercel project.
2. Configure all required Vercel Production variables from Section 9.
3. Add the exact Google OAuth JavaScript origin and callback URI.
4. Use a pooled PostgreSQL URL for DATABASE_URL and a direct migration URL for DIRECT_URL.
5. Configure a private R2 bucket, least-privilege credentials, and CORS for the portal origin.
6. Choose Resend or SMTP, verify the sender identity, and configure the email queue scheduler.
7. Before the release build, run:

~~~powershell
cd C:\Users\Acer\Desktop\rumi_portal
npm.cmd install
npm.cmd run db:generate
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
git diff --check
~~~

8. Commit and push the intended changes to the connected GitHub branch. Vercel builds the new commit automatically.
9. Apply committed migrations to the production database:

~~~powershell
npm.cmd run db:deploy
~~~

Run that command only when the shell’s DATABASE_URL/DIRECT_URL target the intended production database. Do not run db:migrate, db push, or db:seed against production.

### Post-deploy smoke tests

- GET https://portal.ecelliiitsurat.in/api/health returns HTTP 200 and a ready/database true response.
- Google sign-in and credentials sign-in work in a fresh browser profile.
- A new user is created as a participant and receives welcome notification/email behavior.
- A public programme opens, application draft saves, final submission succeeds, and status is visible.
- A valid file uploads/finalizes/downloads; invalid type/size is rejected.
- Team approval, join request, leader accept/reject, and notification paths work.
- UdbhAV cycle open/closed behavior and PDF/DOCX upload work.
- SSIP open/closed behavior, submission, status update, and CSV export work.
- Workshop booking and admin status update work.
- Reviewer assignment, draft score, final evaluation, and access isolation work.
- Admin role save is visible after a fresh session.
- Email queue processing works with the scheduler bearer token.

## 15. Testing strategy

### Automated tests currently present

The test suite covers registration deadlines, team minimum/maximum rules, capacity confirmation and waitlisting, post-submission edit windows, weighted evaluation normalization, participant/reviewer/manager access isolation, private decision masking until publication, valid application status transitions, SSIP change-request/resubmission rules, UdbhAV review and round progression, duplicate form-key rejection, and typed dynamic-form validation.

### Required manual role matrix

Use separate accounts/browser profiles:

| Test actor | Minimum checks |
| --- | --- |
| Visitor | Public pages, filters, workshop catalogue, privacy/terms, feedback, responsive navigation, install instructions. |
| Participant | Signup/sign-in, dashboard, draft/submit/edit/withdraw, typed validation, upload/download, team create/join, notifications, profile, UdbhAV, SSIP, workshop booking. |
| Reviewer | Assigned queue only, rubric draft, submit, feedback, completed state, denied access to unassigned records. |
| Faculty reviewer | Assigned UdbhAV/application review and access boundary. |
| Programme manager | Only assigned programme, full programme configuration, form versioning, reviewers, stages, announcements, exports, statuses. |
| Content manager | Allowed announcement operations only; no unintended admin escalation. |
| Super admin | Global users/roles, all programmes/cycles, team/SSIP/UdbhAV/workshop controls, audits, exports, settings. |

For each protected API, test both a valid caller and a caller with a different owner, programme, team, or reviewer assignment. The expected result is a safe 401/403/404, not leaked data.

## 16. Common troubleshooting

### Google OAuth “Configuration” error

Check the deployed values and exact host together:

- APP_URL, AUTH_URL, and NEXTAUTH_URL must be the same HTTPS origin.
- AUTH_TRUST_HOST=true.
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET belong to the deployed client.
- Google Cloud Console contains /api/auth/callback/google for the exact custom domain.
- Redeploy after changing Vercel variables.

### Every page shows the friendly error boundary

Open Vercel Runtime Logs and find the structured error/request ID emitted by safeError or the server component log. Common causes are a missing/malformed DATABASE_URL, unapplied Prisma migrations, missing R2 variables for a file path, or a provider configuration error.

### /api/health is not ready

The endpoint performs a real PostgreSQL SELECT 1 and validates production configuration. Check database reachability, pooled URL, direct URL, TLS, migrations, and all required production environment values.

### Programme stays in draft

Creating a programme intentionally starts it in DRAFT. Open the programme overview, build and publish a form, then use the launch checklist’s Launch registration action. The server will not launch registration without a published form.

### Form returns HTTP 422

Read the JSON fields object. It contains the exact field-level validation issue. Typical causes are invalid slug characters, close date before open date, minimum team size above maximum, invalid domain list, missing required field, or a number/phone/email that does not match its field type.

### Email does not arrive

Console mode intentionally suppresses sending. For production, verify the provider, sender verification, SMTP/Resend credentials, CRON_SECRET, scheduler call, and EmailDelivery status. A business action can succeed while an email remains FAILED; inspect Runtime Logs and the queue record.

### Install banner does not appear

The prompt is intentionally one-time per browser storage. Clear the site’s local storage, use a browser that supports the manifest/install event, or follow the displayed browser-menu/iOS instructions. It is hidden when the app is already installed.

### Role change appears stale

Database authorization is authoritative. Sign out and sign in again, or use a fresh browser profile, to refresh the session role/navigation label. Confirm the role row was saved and inspect the next request with changed permissions.

## 17. Operational responsibilities and known decisions

The codebase cannot perform these external tasks automatically:

- DNS/domain attachment and Vercel project selection.
- Google OAuth client creation, consent-screen verification, test-user approval, and redirect URI registration.
- PostgreSQL provisioning, backups, restore rehearsal, connection-limit monitoring, and migration scheduling.
- R2 bucket creation, CORS, retention/versioning, and malware/content scanning.
- Resend sender-domain verification or SMTP account provisioning.
- Cron/scheduler setup for /api/internal/email/process.
- Vercel log retention, uptime alerts, error tracking, and incident/rollback procedures.
- Legal review of the starter Privacy Policy and Terms.
- Final review of CSP Report-Only violations before switching to enforcing CSP.

Known product-level decisions:

- The PWA is manifest-only; there is no offline mode.
- Uploaded documents are type/size/signature checked but are not malware-scanned in the application.
- The current email service is text-email oriented; production sender/provider limits still need operational monitoring.
- npm audit must be run from a networked CI/operator environment and reviewed before release; do not force major dependency upgrades without compatibility testing.
- Retention periods for applications, documents, feedback, email records, and audit logs must be chosen by the organisation and implemented/operated accordingly.

## 18. Developer change rules

When extending the portal:

1. Preserve server-side authorization; never rely only on a hidden button or navigation item.
2. Add or update a Prisma migration for schema changes.
3. Validate every new API input with Zod before database access.
4. Keep private files in R2 and return short-lived signed URLs.
5. Keep business actions independent of email-provider availability.
6. Add an audit event for sensitive mutations.
7. Use safeError so server logs contain diagnostics while clients receive safe responses.
8. Keep published form versions immutable.
9. Add domain tests for new workflow rules and manual role-matrix coverage for new permissions.
10. Run typecheck, lint, tests, format check, and build before pushing.

## 19. Related documents

- docs/ARCHITECTURE.md — concise runtime architecture.
- docs/DATABASE.md — database entities, indexes, and transaction boundaries.
- docs/SECURITY.md — authorization, upload, CSRF, and deployment security.
- docs/ADMIN_GUIDE.md — operational instructions for running programmes.
- docs/DEPLOYMENT.md — Vercel, PostgreSQL, R2, OAuth, and email configuration.
- README.md — quick start and repository overview.
- docs/CHATGPT_PROJECT_REPORT.md — historical implementation and production-readiness report.

## 20. Release checklist

- [ ] Production domain attached and HTTPS verified.
- [ ] Exact environment variable contract configured in the correct Vercel project/environment.
- [ ] Google OAuth origin and callback registered.
- [ ] Production PostgreSQL URLs verified; migrations applied; backups confirmed.
- [ ] Private R2 bucket, CORS, retention, and scanning policy confirmed.
- [ ] Email provider, sender identity, queue scheduler, and retry monitoring tested.
- [ ] GET /api/health returns ready.
- [ ] Automated checks pass.
- [ ] Fresh-session role matrix passes.
- [ ] Upload/download and unauthorized-access tests pass.
- [ ] SSIP, UdbhAV, teams, workshops, applications, reviews, exports, feedback, and notifications pass.
- [ ] Privacy/Terms copy approved by the organisation/lawyer.
- [ ] CSP Report-Only logs reviewed.
- [ ] Monitoring, alerts, rollback, and incident contacts documented.
- [ ] Any secrets exposed in screenshots, logs, or chat have been rotated.
