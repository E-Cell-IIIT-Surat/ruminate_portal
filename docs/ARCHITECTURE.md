# Ruminate Operations Platform Architecture

## Product boundary

Ruminate Portal is the operational system for applications, evaluation, and outcomes. It is separate from the public `ecelliiitsurat.in` marketing site. UdbhAV, SSIP, workshops, industry visits, and future initiatives are configurations of one program engine rather than separate backends.

## Runtime layers

1. App Router server components render public, participant, reviewer, and admin views.
2. Small client components handle form editing, autosave, uploads, status changes, and rubric scoring.
3. Route handlers authenticate the user, validate input with Zod, enforce object scope and rate limits, and call domain services.
4. Domain services own transactional submission, workflow, evaluation, email-queue, and private-file behavior.
5. Prisma accesses PostgreSQL through the JavaScript PostgreSQL driver adapter, allowing the server build to run in standard Node.js serverless functions.
6. Private document bytes live in Cloudflare R2; PostgreSQL stores only ownership and file metadata.

## Identity and authorization

Auth.js performs Google OAuth and stores database sessions. Every account receives `PARTICIPANT`; an exact email in `SUPER_ADMIN_EMAILS` may receive the bootstrap administrator role. Authorization is reloaded from PostgreSQL for protected operations.

Global roles grant permission keys. `ProgramManager` adds the required program scope, so managing one program never grants access to another. Participant ownership, reviewer assignment, manager scope, and Super Admin access are evaluated independently for every application or file.

## Program engine

`Program` controls lifecycle, dates, visibility, team rules, capacity, waitlist, review requirement, edit rules, domain restrictions, and result publication. `ProgramStage` and `Rubric` configure the workflow. No event-specific service exists.

Programs without evaluation confirm registrations transactionally until capacity is reached; overflow becomes waitlisted when enabled. Evaluation programs enter the submission/review workflow. PostgreSQL advisory locks and serializable submission transactions prevent concurrent oversubscription.

## Versioned dynamic forms

`Form` owns immutable `FormVersion` records. Sections and fields contain labels, validation limits, choices, private file rules, blind-review visibility, ordering, and simple `==`/`!=` conditions. Publishing retires the previous active version without deleting it. Every application remains linked to the version it originally used.

Answers are stored per field in `ApplicationAnswer`; submission snapshots are stored in `ApplicationRevision`. The server validates the complete immutable form version before accepting a submission.

## Application and evaluation flow

Draft answers autosave with a debounce and may also be saved explicitly. Final submission atomically updates the status and timestamp, creates a revision and history row, queues notifications/email, and writes an audit event.

Reviewer access comes only from `ReviewerAssignment`. Draft evaluations and criterion scores are persisted separately. Submission validates every criterion, calculates a normalized weighted score, completes the assignment, and writes an audit event in one transaction.

## Communication and governance

Announcements target all active applicants, submitted applicants, a status, or a stage. In-app notifications are recipient-specific. Email is first persisted to `EmailDelivery`, then delivered separately through the configured provider so provider failure cannot roll back a business transaction.

`AuditLog` records important actors and actions without copying confidential responses. Application status and stage histories remain dedicated participant-workflow records.

## Deployment shape

The application builds as a standard Next.js 15 App Router application for Vercel's Node.js runtime. Runtime secrets are supplied by the hosting environment. PostgreSQL and the private R2 bucket remain external managed services. See `docs/DEPLOYMENT.md` for the release procedure.
