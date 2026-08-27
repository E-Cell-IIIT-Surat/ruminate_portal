"use client";

import { useState } from "react";

type Profile = {
  name: string | null;
  email: string;
  phone: string | null;
  institution: string | null;
  degree: string | null;
  studyYear: string | null;
  city: string | null;
  studentId: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setState("Saving…");
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim() || null;
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: value("name"),
        phone: value("phone"),
        institution: value("institution"),
        degree: value("degree"),
        studyYear: value("studyYear"),
        city: value("city"),
        studentId: value("studentId"),
      }),
    });
    const result = await response.json();
    setBusy(false);
    setState(response.ok ? "Profile saved" : (result.error ?? "Save failed"));
  }
  return (
    <form className="panel form-panel" onSubmit={save}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input className="input" id="name" name="name" defaultValue={profile.name ?? ""} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" value={profile.email} disabled />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input
            className="input"
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            pattern="^[+\d][\d\s().-]{7,24}$"
            maxLength={25}
            defaultValue={profile.phone ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="institution">College / institution</label>
          <input className="input" id="institution" name="institution" defaultValue={profile.institution ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="degree">Degree / program</label>
          <input className="input" id="degree" name="degree" defaultValue={profile.degree ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="studyYear">Year of study</label>
          <input
            className="input"
            id="studyYear"
            name="studyYear"
            type="number"
            inputMode="numeric"
            min={2000}
            max={2100}
            step={1}
            defaultValue={profile.studyYear ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="city">City</label>
          <input className="input" id="city" name="city" defaultValue={profile.city ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="studentId">Student ID</label>
          <input className="input" id="studentId" name="studentId" defaultValue={profile.studentId ?? ""} />
        </div>
        <div className="form-actions">
          <span role="status">{state}</span>
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </form>
  );
}
