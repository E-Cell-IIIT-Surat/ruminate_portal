# Security Model

## Authorization philosophy

Authentication identifies a user; it never grants program access by itself. Every protected read and mutation checks database roles plus object scope on the server. Hiding navigation is only a usability aid.

- Participants access applications through `application.userId` ownership checks.
- Reviewers access only records present in `ReviewerAssignment` for their user ID.
- Program Managers access only programs present in `ProgramManager`.
- Faculty Reviewers follow the same explicit assignment rule as reviewers.
- Super Admin is the only global operational role.

Permissions use stable keys such as `form:manage`, `review:submit`, and `audit:view`. Important actions also create an `AuditLog` row without copying confidential answers or document bytes.

## Authentication and sessions

Auth.js uses Google OAuth and database sessions. Passwords are not stored. Production requires HTTPS, a strong `AUTH_SECRET`, exact callback URLs, secure cookies, and a trusted canonical host.

## Admin bootstrap

`SUPER_ADMIN_EMAILS` is an explicit comma-separated allowlist read only when Auth.js creates a user. It does not authorize every institutional address. Roles and permissions must be seeded before first login. Remove or tightly control bootstrap values after assigning the first administrator.

## Private files

The R2 bucket must be private. Credentials exist only on the server and are scoped to the single bucket. Object keys start with the owning application and field IDs plus a random UUID. Upload URLs expire after five minutes; download URLs after two. Finalization uses `HeadObject` to compare content length and MIME metadata. Database metadata stores ownership, field relationship, original name, MIME type, size, uploader, and timestamps.

Never log signed URLs, credentials, form answers, document bytes, OAuth tokens, or full audit payloads. Malicious-file scanning is a recommended production extension before reviewers download newly uploaded documents.

## Secrets

Use the hosting platform’s encrypted secret store. Do not commit `.env`. Rotate Google, R2, email, and database credentials after suspected exposure. No server secret may start with `NEXT_PUBLIC_`.

## Rate limiting and validation

Sensitive routes use PostgreSQL-backed rate-limit buckets so limits apply across instances. Zod validates request shapes. Dynamic answers are validated again at submission against the immutable `FormVersion`. Deadline, capacity, team size, edit-window, and transition checks all run on the server.

## IDOR test cases

Security CI should create two participants, two programs, two managers, and two reviewers and assert:

- Participant A receives 403/404 for Participant B’s draft, submission, team, upload, and download endpoints.
- Reviewer A receives 403/404 for unassigned Application B and its documents.
- Manager A cannot read or mutate Program B or its applications.
- Faculty reviewers behave like scoped reviewers.
- Super Admin can access both programs and every audited action.

Return generic errors for inaccessible object IDs so callers cannot enumerate records.

## Operations

Apply least-privilege PostgreSQL and R2 policies, run regular backups, retain audit logs according to an approved policy, and archive records rather than permanently deleting them. Permanent deletion should require a separately reviewed Super Admin workflow.
