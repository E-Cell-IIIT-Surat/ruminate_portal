"use client";
import { useState } from "react";

const roles = [
  "PARTICIPANT",
  "REVIEWER",
  "PROGRAM_MANAGER",
  "CONTENT_MANAGER",
  "FACULTY_REVIEWER",
  "SUPER_ADMIN",
] as const;
export function RoleEditor({ userId, initial }: { userId: string; initial: string[] }) {
  const [selected, setSelected] = useState(new Set(initial));
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("");
  function toggle(role: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }
  async function save() {
    if (busy) return;
    const rolesToSave = [...selected];
    if (!rolesToSave.length) {
      setState("Select at least one role before saving.");
      return;
    }
    setBusy(true);
    setState("Saving…");
    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ roles: rolesToSave }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; roles?: string[] };
      if (!response.ok) throw new Error(result.error ?? `Unable to save roles (${response.status}).`);
      if (result.roles) setSelected(new Set(result.roles));
      setState("Roles saved");
    } catch (error) {
      setState(error instanceof Error ? error.message : "Unable to save roles.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="role-editor">
      {roles.map((role) => (
        <label key={role}>
          <input type="checkbox" checked={selected.has(role)} onChange={() => toggle(role)} />{" "}
          {role.replaceAll("_", " ")}
        </label>
      ))}
      <button type="button" className="button button-secondary" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save roles"}
      </button>
      {state && <small role={state.includes("Unable") || state.includes("Select") ? "alert" : "status"}>{state}</small>}
    </div>
  );
}
