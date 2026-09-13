# Program form flow verification

This pass covers the generic program form engine used by the seven built-in templates, edited templates and custom forms. The separate SSIP/UDHBHAV standalone submission APIs are not replaced by these changes.

## Resulting flow

1. Admin chooses a template or builds fields, saves and publishes the form, then opens or schedules registration in the launch panel. Publishing a new version preserves older application versions.
2. Applicant enters answers and uploads documents. Draft saves are serialized in the browser; server writes use an application lock and batched answer inserts.
3. Review checks all sections using the same validation as the server. Invalid email/number/choice/required values show a dismissible error toast and inline errors, and open the first invalid section. Required uploads apply only when visible. Optional unchecked checkboxes are accepted.
4. For team programs, the applicant saves the separate team details before submitting. Team changes use the same application lock.
5. Submit includes final answers. Validation, final answer writes, submission status, revision, status history and audit are committed in one transaction. Conflicting serializable transactions retry up to three attempts; the timeout is explicit. Team timestamps are converted to JSON-safe strings in revisions.
6. The applicant sees an on-page confirmation and reference. Authorized admins see the record at `/admin/applications` and the program's Applications tab. The detail page lists responses in form order, saved team members, private documents, status and submission time. Program CSV exports include saved dynamic answers.
7. A confirmation email is queued, then `next/server`'s `after` attempts delivery once the HTTP response is sent. SMTP errors do not reverse submission. Pending/failed email retries are processed by an authenticated daily Vercel Cron job at 00:00 UTC, five messages per run. Interrupted delivery claims can be recovered. For a larger backlog or faster retries, use an authorized scheduler to call the existing POST endpoint more frequently; the daily schedule is only a fallback.

## Deployment configuration

No database migration is needed for this pass. Retain the existing email configuration in Vercel:

- `EMAIL_PROVIDER=smtp` for actual SMTP delivery (`console` intentionally does not send email).
- `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`.
- `CRON_SECRET` (at least 32 characters) so the retry endpoint can authenticate Vercel Cron.

The added `vercel.json` schedules retries automatically on deployment. A queue-insertion failure is logged separately and cannot be retried by the email worker because no queue row exists; inspect server logs if this occurs. Delivery to an inbox still depends on valid SMTP configuration, provider availability and recipient filtering.

## Verification scope

Automated tests exercise the actual submission service with a simulated database adapter: all seven real templates, final answer persistence, invalid inputs, team snapshots, closed windows, ownership, duplicate submission rejection, stale saves, receipt queue failure and retry behavior. Shared validation tests cover custom/modified field types, required files and conditional visibility. Tests do not send email or write production records.

Typecheck, lint, tests and the production build are run separately and their actual results are reported in the task response. These checks do not prove live SMTP delivery, R2 connectivity, database migrations or full browser workflows.

Before inviting applicants, use an isolated staging environment to create and publish a template and a custom form, register with a test account, save a team where required, upload PDF/DOCX files, submit, verify the reference and email, and open the same reference in admin detail/CSV export. Repeat with an invalid email and a missing required field to verify the toast and correction flow. No production submissions or emails were created during this pass.
