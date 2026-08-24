"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export function StageEditor({
  programId,
  initial,
}: {
  programId: string;
  initial: { name: string; description: string | null }[];
}) {
  const [stages, setStages] = useState(initial.length ? initial : [{ name: "Application", description: null }]);
  const [state, setState] = useState("");
  async function save() {
    setState("Saving…");
    const response = await fetch(`/api/admin/programs/${programId}/stages`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stages }),
    });
    const result = await response.json();
    setState(response.ok ? "Stages saved" : result.error);
  }
  return (
    <div className="panel config-editor">
      <div className="panel-header">
        <h2>Ordered stages</h2>
        <button className="button button-primary" onClick={save}>
          Save stages
        </button>
      </div>
      {stages.map((stage, index) => (
        <div className="config-row" key={index}>
          <b>{index + 1}</b>
          <input
            value={stage.name}
            onChange={(event) =>
              setStages((current) =>
                current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
              )
            }
          />
          <input
            value={stage.description ?? ""}
            placeholder="Description (optional)"
            onChange={(event) =>
              setStages((current) =>
                current.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)),
              )
            }
          />
          <button
            aria-label="Delete stage"
            onClick={() => setStages((current) => current.filter((_, i) => i !== index))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        className="config-add"
        onClick={() => setStages((current) => [...current, { name: "New stage", description: null }])}
      >
        <Plus size={15} /> Add stage
      </button>
      {state && <p className="config-state">{state}</p>}
    </div>
  );
}

export function RubricEditor({ programId, stages }: { programId: string; stages: { id: string; name: string }[] }) {
  const [name, setName] = useState("Round 1 rubric");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [criteria, setCriteria] = useState([{ name: "Problem relevance", maxScore: 10, weight: 1, description: "" }]);
  const [state, setState] = useState("");
  async function save() {
    setState("Saving…");
    const response = await fetch(`/api/admin/programs/${programId}/rubrics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, stageId: stageId || null, criteria }),
    });
    const result = await response.json();
    setState(response.ok ? "Rubric created" : result.error);
    if (response.ok) location.reload();
  }
  return (
    <div className="panel config-editor">
      <div className="config-meta">
        <label>
          Rubric name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Stage
          <select value={stageId} onChange={(event) => setStageId(event.target.value)}>
            {stages.map((stage) => (
              <option value={stage.id} key={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {criteria.map((criterion, index) => (
        <div className="config-row rubric-row" key={index}>
          <b>{index + 1}</b>
          <input
            value={criterion.name}
            onChange={(event) =>
              setCriteria((current) =>
                current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
              )
            }
          />
          <input
            type="number"
            min="1"
            value={criterion.maxScore}
            aria-label="Maximum score"
            onChange={(event) =>
              setCriteria((current) =>
                current.map((item, i) => (i === index ? { ...item, maxScore: Number(event.target.value) } : item)),
              )
            }
          />
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={criterion.weight}
            aria-label="Weight"
            onChange={(event) =>
              setCriteria((current) =>
                current.map((item, i) => (i === index ? { ...item, weight: Number(event.target.value) } : item)),
              )
            }
          />
          <button
            aria-label="Delete criterion"
            onClick={() => setCriteria((current) => current.filter((_, i) => i !== index))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <div className="config-actions">
        <button
          className="config-add"
          onClick={() =>
            setCriteria((current) => [...current, { name: "New criterion", maxScore: 10, weight: 1, description: "" }])
          }
        >
          <Plus size={15} /> Add criterion
        </button>
        <button className="button button-primary" onClick={save}>
          Create rubric
        </button>
      </div>
      {state && <p className="config-state">{state}</p>}
    </div>
  );
}

export function AnnouncementEditor({
  programId,
  stages,
}: {
  programId: string;
  stages: { id: string; name: string }[];
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState("ALL_APPLICANTS");
  const [targetStatus, setTargetStatus] = useState("SHORTLISTED");
  const [targetStageId, setTargetStageId] = useState(stages[0]?.id ?? "");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  async function publish() {
    if (busy) return;
    setBusy(true);
    setState("Publishing…");
    try {
      const response = await fetch(`/api/admin/programs/${programId}/announcements`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body, targetType, targetStatus, targetStageId }),
      });
      const result = await response.json();
      setState(response.ok ? `Announcement published to ${result.recipients} participant(s)` : result.error);
      if (response.ok) {
        setTitle("");
        setBody("");
        location.reload();
      }
    } catch {
      setState("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel form-panel">
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="announcement-title">Title</label>
          <input
            id="announcement-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="announcement-audience">Audience</label>
          <select
            id="announcement-audience"
            className="select"
            value={targetType}
            onChange={(event) => setTargetType(event.target.value)}
          >
            <option value="ALL_APPLICANTS">All active applicants</option>
            <option value="SUBMITTED_APPLICANTS">Submitted applicants</option>
            <option value="STATUS">Specific status</option>
            <option value="STAGE">Specific stage</option>
          </select>
        </div>
        {targetType === "STATUS" && (
          <div className="field">
            <label htmlFor="announcement-status">Application status</label>
            <select
              id="announcement-status"
              className="select"
              value={targetStatus}
              onChange={(event) => setTargetStatus(event.target.value)}
            >
              {[
                "SUBMITTED",
                "UNDER_REVIEW",
                "CHANGES_REQUESTED",
                "SHORTLISTED",
                "SELECTED",
                "REJECTED",
                "APPROVED",
                "WAITLISTED",
                "CONFIRMED",
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        )}
        {targetType === "STAGE" && (
          <div className="field">
            <label htmlFor="announcement-stage">Program stage</label>
            <select
              id="announcement-stage"
              className="select"
              value={targetStageId}
              onChange={(event) => setTargetStageId(event.target.value)}
            >
              {stages.map((stage) => (
                <option value={stage.id} key={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field field-full">
          <label htmlFor="announcement-message">Message</label>
          <textarea
            id="announcement-message"
            className="textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <div className="form-actions">
          <span className="config-state">{state}</span>
          <button
            className="button button-primary"
            onClick={publish}
            disabled={busy || title.length < 3 || body.length < 5 || (targetType === "STAGE" && !targetStageId)}
          >
            {busy ? "Publishing…" : "Publish announcement"}
          </button>
        </div>
      </div>
    </div>
  );
}
