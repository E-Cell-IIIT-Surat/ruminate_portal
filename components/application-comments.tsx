"use client";
import { useState } from "react";

export function ApplicationComments({
  applicationId,
  allowApplicant,
}: {
  applicationId: string;
  allowApplicant: boolean;
}) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"INTERNAL" | "APPLICANT">("INTERNAL");
  const [state, setState] = useState("");
  async function send() {
    setState("Saving…");
    const response = await fetch(`/api/applications/${applicationId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, visibility }),
    });
    const result = await response.json();
    setState(response.ok ? "Comment added" : (result.error ?? "Failed"));
    if (response.ok) location.reload();
  }
  return (
    <div className="form-grid">
      <div className="field field-full">
        <label htmlFor="comment-body">Add comment</label>
        <textarea
          id="comment-body"
          className="textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      {allowApplicant && (
        <div className="field">
          <label htmlFor="comment-visibility">Visibility</label>
          <select
            id="comment-visibility"
            className="select"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "INTERNAL" | "APPLICANT")}
          >
            <option value="INTERNAL">Internal only</option>
            <option value="APPLICANT">Visible to applicant</option>
          </select>
        </div>
      )}
      <div className="form-actions">
        <span>{state}</span>
        <button className="button button-secondary" onClick={send} disabled={body.trim().length < 2}>
          Add comment
        </button>
      </div>
    </div>
  );
}
