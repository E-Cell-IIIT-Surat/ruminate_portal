"use client";

import { useState } from "react";

export function WithdrawApplication({ applicationId }: { applicationId: string }) {
  const [state, setState] = useState("");
  async function withdraw() {
    if (!window.confirm("Withdraw this application? This action will be recorded.")) return;
    const response = await fetch(`/api/applications/${applicationId}/withdraw`, { method: "POST" });
    const result = await response.json();
    setState(response.ok ? "Application withdrawn" : (result.error ?? "Withdrawal failed"));
    if (response.ok) location.reload();
  }
  return (
    <div>
      <button type="button" className="button button-secondary" onClick={withdraw}>
        Withdraw application
      </button>
      {state && <small role="status">{state}</small>}
    </div>
  );
}
