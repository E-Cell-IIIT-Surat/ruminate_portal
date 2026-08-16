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
    setState("Saving…");
    const response = await fetch(`/api/admin/users/${userId}/roles`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roles: [...selected] }),
    });
    const result = await response.json();
    setState(response.ok ? "Saved" : (result.error ?? "Failed"));
  }
  return (
    <div className="role-editor">
      {roles.map((role) => (
        <label key={role}>
          <input type="checkbox" checked={selected.has(role)} onChange={() => toggle(role)} />{" "}
          {role.replaceAll("_", " ")}
        </label>
      ))}
      <button className="button button-secondary" onClick={save}>
        Save roles
      </button>
      {state && <small role="status">{state}</small>}
    </div>
  );
}
