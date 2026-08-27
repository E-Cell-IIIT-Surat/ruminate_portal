"use client";

import { useState } from "react";

type Member = { name: string; email: string; phone?: string; institution?: string; role?: string; isLeader: boolean };
export function TeamEditor({
  applicationId,
  initialName,
  initialMembers,
  min,
  max,
  locked,
}: {
  applicationId: string;
  initialName: string;
  initialMembers: Member[];
  min: number;
  max: number;
  locked: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [members, setMembers] = useState(initialMembers);
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  function update(index: number, key: keyof Member, value: string | boolean) {
    setMembers((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setState("Saving team…");
    try {
      const response = await fetch(`/api/applications/${applicationId}/team`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, members }),
      });
      const result = await response.json();
      setState(response.ok ? "Team saved" : (result.error ?? "Save failed"));
    } catch {
      setState("Save failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel form-panel">
      <div className="panel-header">
        <div>
          <h2>Team details</h2>
          <p>
            {min}–{max} members, including the team leader.
          </p>
        </div>
      </div>
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="team-name">Team name</label>
          <input
            className="input"
            id="team-name"
            value={name}
            disabled={locked}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        {members.map((member, index) => (
          <div className="panel field-full" key={`${index}-${member.email}`}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor={`member-${index}-name`}>Name</label>
                <input
                  id={`member-${index}-name`}
                  className="input"
                  value={member.name}
                  disabled={locked}
                  onChange={(event) => update(index, "name", event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor={`member-${index}-email`}>Email</label>
                <input
                  id={`member-${index}-email`}
                  className="input"
                  type="email"
                  value={member.email}
                  disabled={locked || member.isLeader}
                  onChange={(event) => update(index, "email", event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor={`member-${index}-phone`}>Phone</label>
                <input
                  id={`member-${index}-phone`}
                  className="input"
                  type="tel"
                  inputMode="tel"
                  pattern="^[+\d][\d\s().-]{7,24}$"
                  maxLength={25}
                  value={member.phone ?? ""}
                  disabled={locked}
                  onChange={(event) => update(index, "phone", event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor={`member-${index}-institution`}>Institution</label>
                <input
                  id={`member-${index}-institution`}
                  className="input"
                  value={member.institution ?? ""}
                  disabled={locked}
                  onChange={(event) => update(index, "institution", event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor={`member-${index}-role`}>Team role</label>
                <input
                  id={`member-${index}-role`}
                  className="input"
                  value={member.role ?? ""}
                  disabled={locked}
                  placeholder={member.isLeader ? "Team leader" : "Design, technology, business..."}
                  onChange={(event) => update(index, "role", event.target.value)}
                />
              </div>
              {!locked && !member.isLeader && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setMembers((current) => current.filter((_, i) => i !== index))}
                >
                  Remove member
                </button>
              )}
            </div>
          </div>
        ))}
        {!locked && members.length < max && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              setMembers((current) => [
                ...current,
                { name: "", email: "", phone: "", institution: "", role: "", isLeader: false },
              ])
            }
          >
            Add member
          </button>
        )}
        <div className="form-actions">
          <span role="status">{state}</span>
          {!locked && (
            <button
              type="button"
              className="button button-primary"
              onClick={save}
              disabled={busy || members.length < min || members.length > max || !name.trim()}
            >
              {busy ? "Saving…" : "Save team"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
