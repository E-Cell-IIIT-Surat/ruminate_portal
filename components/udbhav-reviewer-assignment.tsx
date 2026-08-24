"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Reviewer = { id: string; name: string | null; email: string };
type Assignment = { id: string; status: string; reviewer: Reviewer };

export function UdbhavReviewerAssignment({
  submissionId,
  reviewers,
  initial,
}: {
  submissionId: string;
  reviewers: Reviewer[];
  initial: Assignment[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [items, setItems] = useState(initial);
  const [state, setState] = useState("");
  async function assign() {
    if (!selected) return;
    setState("Assigning…");
    const response = await fetch(`/api/udbhav/submissions/${submissionId}/reviewers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewerId: selected }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; assignment?: Assignment };
    if (!response.ok || !result.assignment) {
      setState(result.error ?? "Unable to assign reviewer");
      return;
    }
    setItems((current) => [...current.filter((item) => item.reviewer.id !== selected), result.assignment!]);
    setSelected("");
    setState("Reviewer assigned");
    router.refresh();
  }
  return (
    <div className="udbhav-reviewer-assignment">
      <div className="form-grid reviewer-assignment-row">
        <select className="select" value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Choose a reviewer…</option>
          {reviewers
            .filter((reviewer) => !items.some((item) => item.reviewer.id === reviewer.id))
            .map((reviewer) => (
              <option key={reviewer.id} value={reviewer.id}>
                {reviewer.name ?? reviewer.email} · {reviewer.email}
              </option>
            ))}
        </select>
        <button type="button" className="button button-secondary" onClick={assign} disabled={!selected}>
          Assign reviewer
        </button>
      </div>
      {state && (
        <small className="config-state" role="status">
          {state}
        </small>
      )}
      <div className="compact-list">
        {items.map((item) => (
          <div key={item.id}>
            <strong>{item.reviewer.name ?? item.reviewer.email}</strong>
            <small>
              {item.reviewer.email} · {item.status.replaceAll("_", " ")}
            </small>
          </div>
        ))}
        {!items.length && <small className="muted-copy">No reviewers assigned yet.</small>}
      </div>
    </div>
  );
}
