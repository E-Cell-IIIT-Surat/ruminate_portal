"use client";

import { useState } from "react";

type Status = "PENDING" | "CONFIRMED" | "CANCELLED";

export function WorkshopBookingStatusControl({
  id,
  initial,
  endpoint,
}: {
  id: string;
  initial: Status;
  endpoint?: string;
}) {
  const [status, setStatus] = useState<Status>(initial);
  const [state, setState] = useState("");
  async function update(next: Status) {
    setStatus(next);
    setState("Saving…");
    const response = await fetch(endpoint ?? `/api/admin/workshops/financial-literacy/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setState(response.ok ? "Saved" : (result.error ?? "Failed"));
    if (!response.ok) setStatus(initial);
  }
  return (
    <div className="status-control">
      <select value={status} onChange={(event) => update(event.target.value as Status)} aria-label="Booking status">
        <option value="PENDING">Pending</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      {state && <small>{state}</small>}
    </div>
  );
}
