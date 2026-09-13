# Admin interface update

- Programs and Workshops now use separate catalogue filters. Workshops created with the custom form engine remain in the Workshops list, with links to their existing management pages. Existing registrations and URLs are preserved.
- The form builder has one Back control supplied by the portal layout. Its other navigation action is labelled Launch / schedule registration.
- Admin page headings include an information button, with additional help beside operational section headings (stages, reviewers, scoring, submissions, status changes, documents, teams, SSIP, and more). Help is written in plain English and can be opened by hover, keyboard activation or tap. Escape dismisses it.
- Shared admin styles improve header/action wrapping, table scrolling, stage and rubric columns, form-builder spacing, preview placement, and mobile control layouts.
- A small amber cursor is enabled on devices with a fine mouse pointer. Native text-entry and disabled cursors are preserved; touch and forced-colour modes use their normal cursors.

No database migration, production data changes, or new environment variables are needed. Changes must be deployed before they appear on the live website. Authenticated visual testing across every admin page has not been performed in this pass.
