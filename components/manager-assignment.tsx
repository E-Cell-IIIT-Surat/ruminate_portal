"use client";
import { useState } from "react";
export function ManagerAssignment({
  programId,
  users,
}: {
  programId: string;
  users: { id: string; name: string | null; email: string }[];
}) {
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [state, setState] = useState("");
  async function assign() {
    const response = await fetch(`/api/admin/programs/${programId}/managers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const result = await response.json();
    setState(response.ok ? "Manager assigned" : (result.error ?? "Failed"));
    if (response.ok) location.reload();
  }
  if (!users.length) return <p>No eligible users found.</p>;
  return (
    <div className="status-control">
      <select value={userId} onChange={(event) => setUserId(event.target.value)}>
        {users.map((user) => (
          <option value={user.id} key={user.id}>
            {user.name ?? user.email}
          </option>
        ))}
      </select>
      <button className="button button-primary" onClick={assign}>
        Assign program manager
      </button>
      {state && <small>{state}</small>}
    </div>
  );
}
