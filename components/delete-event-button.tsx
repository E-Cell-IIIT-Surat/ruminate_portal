"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteEventButton({
  endpoint,
  name,
  redirectTo,
}: {
  endpoint: string;
  name: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (
      !window.confirm(
        `Delete ${name}? It will be removed from listings and registration will stop. Existing applications and bookings are retained for your records.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete event");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete event");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="button button-secondary" type="button" disabled={busy} onClick={remove}>
        <Trash2 size={16} /> {busy ? "Deleting…" : "Delete"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
