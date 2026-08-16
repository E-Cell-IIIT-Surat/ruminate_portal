"use client";

import { useState } from "react";
export function StatusControl({
  applicationId,
  current,
  currentStageId,
  stages,
}: {
  applicationId: string;
  current: string;
  currentStageId: string | null;
  stages: { id: string; name: string }[];
}) {
  const [status, setStatus] = useState(current);
  const [reason, setReason] = useState("");
  const [stageId, setStageId] = useState(currentStageId ?? "");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  async function update() {
    if (busy) return;
    setBusy(true);
    setState("Updating…");
    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, reason, stageId: stageId || null }),
      });
      const result = await response.json();
      setState(response.ok ? "Status updated" : (result.error ?? "Update failed"));
      if (response.ok) location.reload();
    } catch {
      setState("Update failed");
    } finally {
      setBusy(false);
    }
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
      <select value={stageId} onChange={(event) => setStageId(event.target.value)} aria-label="Application stage">
        <option value="">No stage change</option>
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name}
          </option>
        ))}
      </select>
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason (required and audited)"
      />
      <button className="button button-primary" onClick={update} disabled={busy || reason.length < 3}>
        {busy ? "Updating…" : "Update"}
      </button>
      {state && <small>{state}</small>}
    </div>
  );
}
