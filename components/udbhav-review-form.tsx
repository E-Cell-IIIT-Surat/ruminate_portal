"use client";

import { useState } from "react";

const fields = [
  ["creativity", "Creativity"],
  ["problemUnderstanding", "Problem understanding"],
  ["innovation", "Innovation"],
  ["execution", "Execution"],
  ["feasibility", "Feasibility"],
  ["scalability", "Scalability"],
  ["impact", "Impact"],
  ["sustainability", "Sustainability"],
  ["presentation", "Presentation"],
  ["completeness", "Completeness"],
] as const;

export function UdbhavReviewForm({
  submissionId,
  initial,
}: {
  submissionId: string;
  initial?: Record<string, number | string | null>;
}) {
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setState("Saving review…");
    const response = await fetch(`/api/udbhav/submissions/${submissionId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setState(response.ok ? "Review saved" : (result.error ?? "Unable to save review"));
    setBusy(false);
  }
  return (
    <form className="panel form-panel" onSubmit={submit}>
      <div className="panel-header">
        <div>
          <span className="eyebrow">10-section rubric</span>
          <h2>Score this idea</h2>
        </div>
        <span className="config-state" role="status">
          {state}
        </span>
      </div>
      <div className="score-grid">
        {fields.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              name={key}
              type="number"
              min="0"
              max="10"
              step="0.5"
              required
              defaultValue={initial?.[key]?.toString() ?? ""}
            />
            <small>0–10</small>
          </label>
        ))}
      </div>
      <label className="field field-full">
        <span>Reviewer feedback</span>
        <textarea
          className="textarea"
          name="feedback"
          defaultValue={initial?.feedback?.toString() ?? ""}
          placeholder="Specific, actionable feedback for the team"
        />
      </label>
      <button className="button button-primary" disabled={busy}>
        {busy ? "Saving…" : "Save review"}
      </button>
    </form>
  );
}
