# Ruminate Portal Admin Guide

## Creating a program

Open **Programs → Create program**. Add the name, URL slug, dates, participation mode, capacity, team bounds, review requirement, and waitlist rule. Save it as a draft while configuration is incomplete.

## Creating a form

Open the program and choose **Form**. Add sections, then fields. Give every field a stable lowercase key such as `startup_name`. Configure required values, choices, file limits, and simple visibility conditions. Move sections into the intended order, preview, save the draft, and publish. Editing a published form creates a new version; old submissions remain attached to the version participants saw.

## Publishing registration

Confirm dates, team rules, capacity, form version, and eligibility text. Change the program to **Published** or **Registration Open**. The public call-to-action follows both lifecycle status and server time. Closing-time enforcement happens on the server.

## Viewing applications

Choose **Applications** in the program or global admin navigation. Search by reference, applicant, email, or team. Filter by status. Open a row for responses, team, documents, reviews, and history. Data is paginated on the server.

## Assigning reviewers

Open an application, choose its stage rubric, select an eligible reviewer, and set an optional due date. Reviewers see only explicit assignments. Assigning a reviewer can move a submitted application to **Under Review**.

## Creating rubrics

Open **Evaluation**, create a rubric, and add ordered criteria. Give each a maximum score and optional weight. Attach it to the relevant stage. The portal normalizes weighted totals to 100.

## Shortlisting applicants

Open one or more applications, review submitted evaluations, and select **Shortlisted**. Add a meaningful reason; every transition is audited. Results remain private until the program’s publication setting allows participants to see them.

## Requesting changes

Move the application to **Changes Requested** and write clear applicant-visible guidance. The participant can edit and resubmit. Resubmission creates a new immutable revision, preserving the earlier submission.

## Exporting CSV

Filter the application table, choose **Export CSV**, and confirm the fields. Dynamic questions become columns. Exports include only programs and confidential fields the current admin may access.

## Creating announcements

Open **Announcements**, choose the program audience, add a title and concise body, and set publication/expiry times. Important announcements may also enqueue email when production email is configured.

## Closing a program

Change its lifecycle to **Registration Closed**, then **Completed** after delivery. Closing prevents new submissions on the server. Participant history remains available.

## Duplicating for next year

Choose **Duplicate program**, update the name, slug, and dates, then inspect the copied form, stages, rubric, and rules. Applications, reviewer submissions, and historical results must never be copied. Publish only after reviewing every deadline and form field.
