"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Member = { name: string; email: string; role: string };

export function UdbhavSubmissionForm({ cycleId }: { cycleId?: string }) {
  const router = useRouter();
  // The signed-in user is persisted as the team leader by the API. Keep this
  // list for optional collaborators only.
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("");
  function updateMember(index: number, key: keyof Member, value: string) {
    setMembers((current) =>
      current.map((member, itemIndex) => (itemIndex === index ? { ...member, [key]: value } : member)),
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setState("Submitting your idea…");
    const form = new FormData(event.currentTarget);
    const file = form.get("supportingFile");
    if (!(file instanceof File) || file.size === 0) {
      setState("Attach a PDF or DOCX supporting document before submitting.");
      setBusy(false);
      return;
    }
    const fileName = file.name.toLowerCase();
    const allowedDocument = /\.(pdf|docx)$/.test(fileName);
    const allowedMime =
      !file.type ||
      file.type === "application/octet-stream" ||
      file.type === "application/pdf" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!allowedDocument || !allowedMime) {
      setState("Only PDF or DOCX supporting documents are allowed.");
      setBusy(false);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setState("The supporting document must be smaller than 5 MB.");
      setBusy(false);
      return;
    }
    form.set("cycleId", cycleId ?? "");
    form.set("estimatedBudget", String(form.get("estimatedBudget") ?? ""));
    form.set("teamMembers", JSON.stringify(members));
    try {
      const response = await fetch("/api/udbhav/submissions", {
        method: "POST",
        body: form,
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, unknown>;
        submission?: { id?: string };
      };
      if (!response.ok) {
        const fieldErrors = result.fields
          ? Object.entries(result.fields)
              .flatMap(([field, messages]) =>
                (Array.isArray(messages) ? messages : [messages]).map(String).map((message) => `${field}: ${message}`),
              )
              .join(" ")
          : "";
        setState(
          fieldErrors
            ? `${result.error ?? "Please check the form"} ${fieldErrors}`
            : (result.error ?? "Unable to submit your idea"),
        );
        return;
      }
      if (!result.submission?.id) {
        setState("The submission was accepted but no reference was returned. Please refresh and check your ideas.");
        return;
      }
      router.push(`/udbhav/submissions/${result.submission.id}`);
    } catch (error) {
      setState(
        error instanceof Error ? error.message : "Unable to reach the server. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel form-panel udbhav-form" onSubmit={submit}>
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="udbhav-team">Team name *</label>
          <input
            className="input"
            id="udbhav-team"
            name="teamName"
            required
            minLength={2}
            placeholder="Your team name"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="udbhav-title">Title of the idea *</label>
          <input
            className="input"
            id="udbhav-title"
            name="title"
            required
            minLength={5}
            maxLength={200}
            placeholder="A clear name for your innovation"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="udbhav-challenge">Challenge / problem statement *</label>
          <textarea
            className="textarea"
            id="udbhav-challenge"
            name="challenge"
            required
            minLength={20}
            placeholder="What problem are you solving?"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="udbhav-proposal">Understanding and proposed solution *</label>
          <textarea
            className="textarea"
            id="udbhav-proposal"
            name="proposal"
            required
            minLength={20}
            placeholder="Explain the context and your proposal in detail"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="udbhav-solution">Solution details *</label>
          <textarea
            className="textarea"
            id="udbhav-solution"
            name="solution"
            required
            minLength={20}
            placeholder="How will the solution work?"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="udbhav-technology">Technology and technical details *</label>
          <textarea
            className="textarea"
            id="udbhav-technology"
            name="technology"
            required
            minLength={3}
            placeholder="Technology, data requirements, architecture, and dependencies"
          />
        </div>
        <div className="field">
          <label htmlFor="udbhav-budget">Estimated budget (₹)</label>
          <input
            className="input"
            id="udbhav-budget"
            name="estimatedBudget"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="udbhav-distribution">Distribution / implementation plan *</label>
          <textarea
            className="textarea"
            id="udbhav-distribution"
            name="distributionPlan"
            required
            minLength={10}
            placeholder="Who will use it and how will it reach them?"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="udbhav-milestones">Detailed work structure / milestones</label>
          <textarea
            className="textarea"
            id="udbhav-milestones"
            name="milestones"
            placeholder="Milestone, timeline, contribution, and expected outcome"
          />
        </div>
        <div className="field field-full">
          <label htmlFor="udbhav-supporting-file">Supporting document (PDF or DOCX) *</label>
          <input
            className="input"
            id="udbhav-supporting-file"
            name="supportingFile"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            required
          />
          <p className="muted-copy">Upload your proposal or supporting material. Maximum size: 5 MB.</p>
        </div>
      </div>
      <section className="team-capture">
        <div className="panel-header">
          <div>
            <h3>Team members</h3>
            <p>Invite collaborators by adding their details. The signed-in account remains the team leader.</p>
          </div>
        </div>
        {members.map((member, index) => (
          <div className="form-grid team-capture-row" key={index}>
            <div className="field">
              <label htmlFor={`udbhav-member-name-${index}`}>Name</label>
              <input
                id={`udbhav-member-name-${index}`}
                className="input"
                required
                minLength={2}
                value={member.name}
                onChange={(event) => updateMember(index, "name", event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`udbhav-member-email-${index}`}>Email</label>
              <input
                id={`udbhav-member-email-${index}`}
                className="input"
                required
                type="email"
                value={member.email}
                onChange={(event) => updateMember(index, "email", event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`udbhav-member-role-${index}`}>Role</label>
              <input
                id={`udbhav-member-role-${index}`}
                className="input"
                value={member.role}
                onChange={(event) => updateMember(index, "role", event.target.value)}
              />
            </div>
          </div>
        ))}
        {members.length < 8 && (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setMembers((current) => [...current, { name: "", email: "", role: "" }])}
          >
            {members.length ? "Add another team member" : "Add a team member (optional)"}
          </button>
        )}
      </section>
      <div className="form-actions">
        <span className="config-state" role="status">
          {state}
        </span>
        <button className="button button-primary" disabled={busy}>
          {busy ? "Submitting…" : "Submit UdbhAV idea"}
        </button>
      </div>
    </form>
  );
}
