# Program and workshop launch guide

## Why KTB could remain in Draft

The form and program have separate publication states. Publishing a form never changed the program status. The overview also selected the newest form version, so saving a newer draft hid an existing published version from the launch checklist. The form builder did not refresh the router after publishing, allowing previously visited overview data to stay stale. These source-level issues are fixed in this change; the production KTB record was not edited or tested with real registrations.

The older creation/settings forms also sent timezone-less dates, which a UTC production server could interpret differently from a local development machine. Creation, settings and launch controls now consistently convert explicitly labelled IST times to UTC for storage. Review existing saved dates before launching; old records have not been silently shifted.

## Launch an existing KTB program

1. Open Admin → Programs → KNOW THE BUSINESS → Form.
2. Review the questions. Use the existing form or a template. Publish form saves your questions for applicants.
3. Click **Launch / schedule registration**.
4. Select **Launch now** and a future closing time, then click **Launch now**. To schedule instead, choose a future opening and closing time. Event administration consistently uses India Standard Time (IST, UTC+05:30).
5. Confirm Visibility is Public in Settings if it should appear in the homepage and Programs directory.
6. Visit Programs in the public navbar and open the event details. Participants sign in and register through the existing application flow.

Scheduled programs appear publicly immediately with an Upcoming label. The existing server-side registration window opens automatically at the scheduled time without a cron job. Scheduled program storage uses PUBLISHED; the admin listing displays its effective Scheduled/Open/Closed state. Closing is exclusive: at the closing instant, new submissions stop.

## Forms and documents

Templates include Basic registration, Workshop, Industry visit, Startup competition, SSIP, KTB / Pitch event, and Hackathon. They can all be edited, or build your own with Add section and Add field. Applying a template asks before replacing editor contents.

For documents, select FILE, click **Allow PDF & DOCX**, select a size limit, and mark Required when necessary. These files use the existing private upload and download controls. A published form stays available while a new draft revision is edited.

## Workshops

For simple seat bookings, open Admin → Workshops. Each existing workshop has **Launch / schedule** with an optional opening time (blank means now) and required closing time. For workshops needing custom questions, team registration or document uploads, create a program of type Workshop.

## Closing and deletion

Close a program from its launch panel; reopen with Launch now and a new future closing time. Delete is available on the program overview and workshop list. It asks for confirmation, archives/cancels the event, removes it from public listings, and preserves existing applications/bookings and audit records. No live records were deleted during development.

## Deployment

This change adds no database migrations or environment variables. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`, commit the changes and deploy. Then launch the existing KTB record using the steps above. Keep applying any unrelated pending migrations using the project's normal deployment process.

## Verification — 12 September 2026

- Typecheck and ESLint passed.
- All 23 tests passed, including IST conversion, immediate launch, scheduled opening/closing boundaries, expired dates, and draft/archived registration rejection.
- Production build passed. The first restricted-network attempt could not fetch the Google font; the network-enabled build succeeded.
- Production KTB registration, real uploads and authenticated admin actions have not been exercised against live records. The changes are local and await deployment.
