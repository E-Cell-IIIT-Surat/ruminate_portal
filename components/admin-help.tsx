"use client";

import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Info } from "lucide-react";

const help: Record<string, string> = {
  form: "Build the questions applicants will answer. Choose a template or add your own fields. Save draft keeps changes private. Publish form makes the questions ready; use the program overview to launch registration.",
  stages:
    "Stages are the steps an application follows, such as Application, Review and Final round. Add them in the order you use, then Save stages. These steps help admins track progress; they do not open registration.",
  evaluation:
    "Set the scoring rules reviewers use. Each criterion explains what to assess, its maximum score and its weight. These rules are used on assigned reviews and in score summaries.",
  reviewers:
    "Assign reviewers to assess applications and check their workload. Program managers can maintain this program. Assigning someone here does not give them access to all programs.",
  applications:
    "Find submitted applications, inspect answers and documents, and manage decisions. Filters change the visible list. Open an application to review it; exports use the records you are allowed to access.",
  programs:
    "Manage events, competitions, visits and other programs. Create details, publish a form, then launch or schedule registration. Public programs appear in the Programs directory. Workshops are listed separately under Workshops.",
  workshops:
    "Create and manage learning workshops. Use simple bookings for seat reservations or a custom form for extra questions and files. Launch or schedule the registration window. Public workshops appear in the Workshops directory.",
  bookings:
    "See workshop seat reservations and update booking decisions. Open the workshop to change its registration window. These records are separate from custom-form applications.",
  teams:
    "Approve or reject requests to create public teams. Approved teams appear in the team directory. Team leaders accept members' join requests. Closing a listing stops recruitment without removing its records.",
  announcements:
    "Send updates to the intended audience. Check the selected program and recipients before publishing. Announcements appear in notifications; email delivery depends on the configured email service.",
  analytics:
    "See totals and outcomes for programs you can access. Use these summaries to understand participation and review progress. This page reports data; it does not change applications.",
  users:
    "Manage account access and assign roles. Select the roles and click Save roles. Roles grant different capabilities; program managers also need program assignments. Disable access blocks an account from using the portal.",
  reviews:
    "Track review assignments and completed evaluations. Reviewers see their assigned applications and score them using the program's rubric. Final application decisions are managed separately.",
  participants:
    "Find participants and their application records within your access. Use this page to understand who has registered and follow up through the relevant program.",
  ssip: "Control the SSIP application window, inspect submissions and download exports. Close the form to stop new submissions. Review each proposal and its supporting documents before changing its status.",
  udbhav:
    "Manage UDHBHAV cycles, submitted ideas and review assignments. Open an idea to read its details, assign reviewers and record progress. Check the cycle window before inviting students to apply.",
  feedback:
    "Read bugs and suggestions sent through the Feedback button. Filter by type to find relevant reports. The page path tells you where the user was when they sent the report.",
  settings:
    "Review platform configuration and service readiness. Program dates, visibility and application rules are managed in each program's Settings tab. Keep private keys out of messages and screenshots.",
  "audit-logs":
    "See who performed important actions, when they happened and which records changed. Use these records to investigate mistakes. Viewing this page does not undo an action.",
  audit:
    "Review recorded administrative actions to understand who changed a record and when. Audit records support troubleshooting and accountability.",
  guide:
    "Follow the steps to create a form, launch an event and verify its public registration page. The guide also explains scheduling, documents and deletion.",
};
const sections: Record<string, string> = {
  "Ordered stages": help.stages,
  Responses:
    "These are the applicant's saved answers. Compare them with the program requirements before making a decision.",
  "Private documents":
    "Open supporting files using the protected download links. Only people with access to this application can retrieve them.",
  Comments:
    "Record feedback and discussion for this application. Check any visibility options before posting information that should stay internal.",
  "Change status":
    "Record the application's next decision or workflow step. Confirm your choice carefully; participants may receive a notification or email.",
  History: "Read the sequence of changes made to this application, including earlier statuses and decisions.",
  Results:
    "Publish decisions when they are ready to be shared. Participants can then see the results and may receive email notifications.",
  "Duplicate configuration":
    "Copy this program's setup to start a new draft. The copy needs its own name, link, dates and launch; existing applications are not copied.",
  "Reviewer workload": "See how many reviews each reviewer has been assigned so you can distribute work fairly.",
  "Program managers":
    "Choose who can manage this program. They still need the appropriate account role; this assignment does not grant access to other programs.",
  "Status distribution":
    "Compare how many applications are at each stage or outcome. These counts reflect records you are allowed to see.",
  "Recent activity":
    "Review the latest actions across your workspace, then open the relevant section to investigate or continue work.",
  "Application form":
    "This preview shows how your questions are arranged. It does not save an application or upload files. Use Publish form when your questions are ready.",
};

export function AdminHelp({ title, description }: { title: string; description?: string }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!pathname.startsWith("/admin")) return null;
  const parts = pathname.split("/").filter(Boolean);
  const section = parts.at(-1) ?? "";
  const programSettings = parts[1] === "programs" && section === "settings";
  const text =
    sections[title] ??
    (programSettings
      ? "Set this program's dates in IST, visibility, team size and application rules. Public programs appear in their directory when launched. Save changes to apply your settings; review the launch panel to open or close registration."
      : (help[section] ??
        help[parts[1]] ??
        "This dashboard brings together the work you can manage. Use the sidebar to open programs, applications, workshops and other sections. Each page explains its controls through these information buttons."));
  return (
    <span
      className="admin-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="admin-help-trigger"
        aria-label={`About ${title}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <Info size={16} />
      </button>
      {open && (
        <span id={id} className="admin-help-content" role="note">
          <strong>{title}</strong>
          <span>{text}</span>
          {description && <span>{description}</span>}
        </span>
      )}
    </span>
  );
}
