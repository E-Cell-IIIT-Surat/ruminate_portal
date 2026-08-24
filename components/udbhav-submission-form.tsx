"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Member = { name: string; email: string; role: string };

export function UdbhavSubmissionForm({ cycleId }: { cycleId?: string }) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([{ name: "", email: "", role: "Team leader" }]);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("");
  function updateMember(index: number, key: keyof Member, value: string) {
    setMembers((current) =>
      current.map((member, itemIndex) => (itemIndex === index ? { ...member, [key]: value } : member)),
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setState("Submitting your idea…");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const response = await fetch("/api/udbhav/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, cycleId, teamMembers: members }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; submission?: { id: string } };
    setBusy(false);
    if (!response.ok) {
      setState(result.error ?? "Unable to submit your idea");
      return;
    }
    router.push(`/udbhav/submissions/${result.submission?.id}`);
  }
  return (
    <form className="panel form-panel udbhav-form" onSubmit={submit}>
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="udbhav-team">Team name *</label>
          <input className="input" id="udbhav-team" name="teamName" required placeholder="Your team name" />
        </div>
        <div className="field field-full">
          <label htmlFor="udbhav-title">Title of the idea *</label>
          <input
            className="input"
            id="udbhav-title"
            name="title"
            required
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
            Add team member
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
