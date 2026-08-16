"use client";

import { useState } from "react";

export function ReviewerAssignment({
  applicationId,
  reviewers,
  rubrics,
}: {
  applicationId: string;
  reviewers: { id: string; name: string | null; email: string }[];
  rubrics: { id: string; name: string }[];
}) {
  const [reviewerId, setReviewerId] = useState(reviewers[0]?.id ?? "");
  const [rubricId, setRubricId] = useState(rubrics[0]?.id ?? "");
  const [dueAt, setDueAt] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  async function assign() {
    if (busy) return;
    setBusy(true);
    setState("Assigning…");
    try {
      const response = await fetch(`/api/applications/${applicationId}/reviewers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewerId, rubricId, dueAt: dueAt || null }),
      });
      const result = await response.json();
      setState(response.ok ? "Reviewer assigned" : (result.error ?? "Assignment failed"));
      if (response.ok) location.reload();
    } catch {
      setState("Assignment failed");
    } finally {
      setBusy(false);
    }
  }
  if (!reviewers.length || !rubrics.length)
    return <p className="config-state">Create a rubric and assign reviewer roles before sending reviews.</p>;
  return (
    <div className="status-control">
      <select value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} aria-label="Reviewer">
        {reviewers.map((reviewer) => (
          <option value={reviewer.id} key={reviewer.id}>
            {reviewer.name ?? reviewer.email}
          </option>
        ))}
      </select>
      <select value={rubricId} onChange={(event) => setRubricId(event.target.value)} aria-label="Rubric">
        {rubrics.map((rubric) => (
          <option value={rubric.id} key={rubric.id}>
            {rubric.name}
          </option>
        ))}
      </select>
      <input
        type="datetime-local"
        value={dueAt}
        onChange={(event) => setDueAt(event.target.value)}
        aria-label="Review due date"
      />
      <button className="button button-primary" onClick={assign} disabled={busy}>
        {busy ? "Assigning…" : "Assign reviewer"}
      </button>
      {state && <small role="status">{state}</small>}
    </div>
  );
}
