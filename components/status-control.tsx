"use client";

import { useState } from "react";
export function StatusControl({ applicationId, current }: { applicationId: string; current: string }) {
  const [status, setStatus] = useState(current);
  const [reason, setReason] = useState("");
  const [state, setState] = useState("");
  async function update() {
    setState("Updating…");
    const response = await fetch(`/api/applications/${applicationId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, reason }),
    });
    const result = await response.json();
    setState(response.ok ? "Status updated" : (result.error ?? "Update failed"));
    if (response.ok) location.reload();
  }
  return (
    <div className="status-control">
      <select value={status} onChange={(event) => setStatus(event.target.value)}>
        {[
          "UNDER_REVIEW",
          "CHANGES_REQUESTED",
          "SHORTLISTED",
          "SELECTED",
          "REJECTED",
          "APPROVED",
          "WAITLISTED",
          "CONFIRMED",
          "ARCHIVED",
        ].map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason (required and audited)"
      />
      <button className="button button-primary" onClick={update} disabled={reason.length < 3}>
        Update
      </button>
      {state && <small>{state}</small>}
    </div>
  );
}
