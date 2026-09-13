# Custom form save and publish repair

## Findings

The PUT route returns 422 when form configuration fails validation, before writing to the database. Previously the editor displayed only the generic error and ignored nested validation details. Without the failed production request payload/runtime log, its precise triggering field cannot be determined retrospectively.

Confirmed code defects addressed:

- Comma-separated choices and MIME types were trimmed and empty entries removed on every keystroke. Typing a comma immediately removed it, preventing normal entry of multiple values. Preserve editor input; normalize on validation instead.
- Changing a custom field to FILE left its allowed types empty, which the API rejects. New file fields now default to PDF/DOCX with a 10 MB limit.
- Section titles and field keys were used as mutable React keys, remounting inputs during editing. Editing these values no longer changes component keys.
- Hidden constraints survived a field-type change. Switching types now resets length/number limits.
- Validation issues now retain the section, field number and setting, both locally and in API responses. Invalid configurations still cannot be published.
- Save/publish previously used two independent HTTP requests. The editor now sends PUT with `publish: true`, saving and publishing atomically.
- Latest-version lookup is now inside a transaction protected by a per-program advisory lock shared with the legacy POST publisher. Published versions remain immutable; audit records remain intact.
- Fields are inserted in batches per section, with an explicit 20-second transaction timeout, reducing round trips for large forms.
- JSON null values use Prisma's explicit database-null representation.
- Inputs are disabled during requests. Unsaved-change warnings depend on actual contents, not a success/error label. Failures retain editor contents and show a support reference for unexpected server errors.

## Admin workflow

1. Build the form or choose a template. Give each field a unique key starting with a letter.
2. For choices, enter comma-separated options. For uploads, PDF/DOCX is preconfigured; adjust types/size if needed.
3. Save draft to keep a validated private version, or Publish form to save and publish together.
4. If validation fails, correct the specified section and field, then retry. No invalid draft or partial published version is committed.
5. Use Launch / schedule registration to open the program. Publishing a form does not itself open program registration.

## Deployment and verification scope

No new environment variables or database migration are required. Deploy the code normally. Added regression tests cover mixed custom fields, normalized lists, missing upload settings, duplicate/invalid keys, invalid ranges/conditions and 100-field forms.

Production data was not modified. Authenticated save/reload/publish and concurrent database operations still require a staging smoke test; unit tests and compilation do not prove a live database workflow.
