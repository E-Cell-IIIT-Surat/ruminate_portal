"use client";

import { useState } from "react";

export function AccountAccessControl({ userId, active }: { userId: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("");
  async function update() {
    if (busy) return;
    setBusy(true);
    setState("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Update failed");
      location.reload();
    } catch (error) {
      setState(error instanceof Error ? error.message : "Update failed");
      setBusy(false);
    }
  }
  return (
    <div>
      <button type="button" className="button button-secondary" disabled={busy} onClick={update}>
        {busy ? "Updating…" : active ? "Disable access" : "Restore access"}
      </button>
      {state && <small role="alert">{state}</small>}
    </div>
  );
}
