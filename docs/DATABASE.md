# Database Model

Ruminate Portal uses PostgreSQL through Prisma. Foreign keys, uniqueness constraints, useful indexes, transactions, and soft-archive timestamps protect consistency.

## Identity and access

`User`, `Account`, `Session`, and `VerificationToken` support Auth.js. `Role`, `Permission`, `UserRole`, and `RolePermission` provide global RBAC. `ProgramManager` is intentionally separate and scopes management to one program.

## Program engine

`Program` stores lifecycle, visibility, dates, capacity, waitlist, participation, edit, review, and result-publication rules. `ProgramStage` provides ordered configurable rounds. UdbhAV, SSIP, and Industry Visit are normal rows—not separate schemas.

## Versioned forms

`Form` belongs to one program. `FormVersion` is draft, published, or retired. `FormSection` and `FormField` hold ordered configuration. An `Application` points to exactly the version used when it started. Published versions are never edited in place; new edits create a draft next version.

## Applications and teams

`Application` has a unique public reference, owner, program, form version, stage, status, and submission timestamps. `ApplicationAnswer` stores one typed JSON value per related field, preserving queryability without adding SQL columns for every question. `ApplicationRevision` snapshots each submission/resubmission. `ApplicationStatusHistory` and `ApplicationStageHistory` provide timelines. `Team` and `TeamMember` store program-scoped teams.

## Private documents

`ApplicationFile` stores metadata and the private R2 object key. File bytes never enter PostgreSQL. Rows relate each document to the application, dynamic file field, and uploader.

## Review and evaluation

`ReviewerAssignment` grants reviewer access to one application and rubric. `Rubric` may be program-wide or stage-specific. `RubricCriterion`, `Evaluation`, and `EvaluationScore` preserve draft/submitted evaluation state, criterion values, weighted totals, comments, and applicant feedback.

## Communication and governance

`Announcement` supports program or portal communication. `Notification` targets a user and optional application. `EmailDelivery` tracks provider delivery without storing full sensitive content. `AuditLog` records actor, action, entity, program scope, and minimal metadata. `RateLimitBucket` protects expensive or sensitive endpoints across server instances.

## Transaction boundaries

Final submission updates status/timestamps, writes a revision, adds history, creates a notification, and writes an audit record in one transaction. Evaluation submission writes evaluation, criterion scores, assignment completion, and audit data together. Status and stage transitions follow the same pattern.

## Indexes

High-value indexes cover application program/user/status/stage/submission time, reviewer and notification queues, program lifecycle, audit time/scope, manager membership, files, status history, and rate-limit expiry. Admin tables paginate and select only required fields to avoid large dynamic-answer loads.
