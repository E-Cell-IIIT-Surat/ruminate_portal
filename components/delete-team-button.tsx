"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteTeamButton({
  teamId,
  teamName,
  disabled = false,
}: {
  teamId: string;
  teamName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (
      busy ||
      !window.confirm(
        `Delete “${teamName}”? This permanently removes the team, its membership records and join requests. Linked applications remain, but their team roster is removed. This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete team.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete team.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        className="button button-secondary delete-team-button"
        disabled={disabled || busy}
        onClick={remove}
        aria-label={`Delete team ${teamName}`}
      >
        <Trash2 size={16} /> {busy ? "Deleting…" : "Delete team"}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
