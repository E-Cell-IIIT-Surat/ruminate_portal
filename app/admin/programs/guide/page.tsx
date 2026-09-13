import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/authz";

export default async function ProgramGuide() {
  await requirePermission("program:update");
  return (
    <>
      <PageHeader
        title="Create and launch an event"
        description="A practical guide for KTB, workshops, industry visits, hackathons, and custom programs."
      />
      <article className="panel launch-guide">
        <ol>
          <li>
            <h2>Create the program</h2>
            <p>
              Choose Create program, enter the name, event type, description and eligibility, and choose individual or
              team participation. Choose Public visibility to show it on the homepage. Saving creates a draft.
            </p>
          </li>
          <li>
            <h2>Choose a template or build your own form</h2>
            <p>
              Open Form. Choose Basic registration, Workshop, Industry visit, Startup competition, KTB / Pitch event,
              Hackathon, or SSIP. Edit questions, add sections, and mark compulsory fields Required. Templates replace
              the current editor contents after confirmation.
            </p>
          </li>
          <li>
            <h2>Allow documents</h2>
            <p>
              Add a FILE field and use PDF & DOCX. Set the size limit and Required if needed. Uploads use the portal’s
              private file storage; applicants sign in before uploading.
            </p>
          </li>
          <li>
            <h2>Publish the form, then launch the program</h2>
            <p>
              Click Publish form, then Launch / schedule registration. Publishing a form prepares the questions; it does
              not open registration. A saved draft revision does not remove the existing published form.
            </p>
          </li>
          <li>
            <h2>Launch now or schedule</h2>
            <p>
              Choose Launch now to open immediately, or Schedule registration and select a future opening time. Always
              choose a closing time after opening. All event administration times use India Standard Time (IST,
              UTC+05:30). Scheduled programs are listed immediately; registration opens automatically when the time
              arrives.
            </p>
          </li>
          <li>
            <h2>Check the public page</h2>
            <p>
              Open Programs in the navbar, choose your event, and check its details. Signed-in users can register during
              its opening window. Private programs do not appear publicly; Unlisted programs are accessible through
              their direct link.
            </p>
          </li>
          <li>
            <h2>Close, reopen, or delete</h2>
            <p>
              Use Close registration to stop entries. To reopen, use Launch now and set a new future closing time.
              Delete removes the event from listings and stops registration while retaining applications and bookings
              for records. A confirmation appears first.
            </p>
          </li>
        </ol>
        <h2>If it still says Draft</h2>
        <p>
          Return to the overview after publishing and use Launch now or Schedule registration. Read any error shown
          there. Expired closing dates must be updated. Existing live KTB records need this launch action after the
          updated code is deployed.
        </p>
        <p>
          For simple workshop seat bookings, use Workshops. For custom questions, team registration or PDF/DOCX uploads,
          create a program with type Workshop.
        </p>
        <Link className="button button-primary" href="/admin/programs">
          Back to programs
        </Link>
      </article>
    </>
  );
}
