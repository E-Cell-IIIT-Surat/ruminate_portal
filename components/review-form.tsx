"use client";

import { useEffect, useMemo, useState } from "react";

type Criterion = { id: string; name: string; description: string | null; maxScore: number; weight: number };
export function ReviewForm({
  assignmentId,
  criteria,
  submitted,
  initialScores,
  initialInternalNotes,
  initialFeedback,
}: {
  assignmentId: string;
  criteria: Criterion[];
  submitted: boolean;
  initialScores: Record<string, number>;
  initialInternalNotes: string;
  initialFeedback: string;
}) {
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [internalNotes, setInternalNotes] = useState(initialInternalNotes);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [state, setState] = useState(
    submitted ? "Review submitted" : Object.keys(initialScores).length ? "Draft saved" : "Draft not saved",
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty || submitted) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, submitted]);
  const total = useMemo(() => {
    const weight = criteria.reduce((sum, item) => sum + item.weight, 0);
    if (!weight) return 0;
    return (
      (criteria.reduce((sum, item) => sum + ((scores[item.id] ?? 0) / item.maxScore) * item.weight, 0) / weight) * 100
    );
  }, [criteria, scores]);
  function payload() {
    return {
      scores: criteria
        .filter((criterion) => scores[criterion.id] !== undefined)
        .map((criterion) => ({ criterionId: criterion.id, score: scores[criterion.id] })),
      internalNotes,
      feedback,
    };
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setState("Saving draft…");
    try {
      const response = await fetch(`/api/reviews/${assignmentId}/submit`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const result = await response.json();
      setState(response.ok ? "Draft saved" : (result.error ?? "Save failed"));
      if (response.ok) setDirty(false);
    } catch {
      setState("Save failed");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (busy) return;
    setBusy(true);
    setState("Submitting…");
    try {
      const response = await fetch(`/api/reviews/${assignmentId}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const result = await response.json();
      setState(response.ok ? "Review submitted" : (result.error ?? "Submission failed"));
      if (response.ok) {
        setDirty(false);
        location.reload();
      }
    } catch {
      setState("Submission failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="review-form panel">
      <div className="panel-header">
        <h2>Evaluation rubric</h2>
        <span>{total.toFixed(1)} / 100</span>
      </div>
      <div className="criteria-list">
        {criteria.map((criterion) => (
          <div key={criterion.id}>
            <div>
              <strong>{criterion.name}</strong>
              <small>{criterion.description ?? `Weight ${criterion.weight}`}</small>
            </div>
            <label>
              <input
                disabled={submitted}
                type="number"
                min="0"
                max={criterion.maxScore}
                step="0.5"
                value={scores[criterion.id] ?? ""}
                onChange={(event) => {
                  setDirty(true);
                  setScores((current) => ({ ...current, [criterion.id]: Number(event.target.value) }));
                }}
              />
              <span>/ {criterion.maxScore}</span>
            </label>
          </div>
        ))}
      </div>
      <div className="review-notes">
        <label>
          Internal comments
          <textarea
            disabled={submitted}
            value={internalNotes}
            onChange={(event) => {
              setDirty(true);
              setInternalNotes(event.target.value);
            }}
            placeholder="Visible to the program team only"
          />
        </label>
        <label>
          Applicant-visible feedback
          <textarea
            disabled={submitted}
            value={feedback}
            onChange={(event) => {
              setDirty(true);
              setFeedback(event.target.value);
            }}
            placeholder="Constructive feedback, if enabled by the program"
          />
        </label>
      </div>
      <div className="review-submit">
        <span>{state}</span>
        {!submitted && (
          <div className="form-actions">
            <button className="button button-secondary" onClick={save} disabled={busy}>
              {busy ? "Working…" : "Save draft"}
            </button>
            <button className="button button-primary" onClick={submit} disabled={busy}>
              Submit review
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
