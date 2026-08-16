"use client";

import { useMemo, useState } from "react";

type Criterion = { id: string; name: string; description: string | null; maxScore: number; weight: number };
export function ReviewForm({
  assignmentId,
  criteria,
  submitted,
}: {
  assignmentId: string;
  criteria: Criterion[];
  submitted: boolean;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [internalNotes, setInternalNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [state, setState] = useState(submitted ? "Review submitted" : "Draft not saved");
  const total = useMemo(() => {
    const weight = criteria.reduce((sum, item) => sum + item.weight, 0);
    if (!weight) return 0;
    return (
      (criteria.reduce((sum, item) => sum + ((scores[item.id] ?? 0) / item.maxScore) * item.weight, 0) / weight) * 100
    );
  }, [criteria, scores]);
  async function submit() {
    setState("Submitting…");
    const response = await fetch(`/api/reviews/${assignmentId}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scores: criteria.map((criterion) => ({ criterionId: criterion.id, score: scores[criterion.id] ?? -1 })),
        internalNotes,
        feedback,
      }),
    });
    const result = await response.json();
    setState(response.ok ? "Review submitted" : (result.error ?? "Submission failed"));
    if (response.ok) location.reload();
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
                onChange={(event) =>
                  setScores((current) => ({ ...current, [criterion.id]: Number(event.target.value) }))
                }
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
            onChange={(event) => setInternalNotes(event.target.value)}
            placeholder="Visible to the program team only"
          />
        </label>
        <label>
          Applicant-visible feedback
          <textarea
            disabled={submitted}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Constructive feedback, if enabled by the program"
          />
        </label>
      </div>
      <div className="review-submit">
        <span>{state}</span>
        {!submitted && (
          <button className="button button-primary" onClick={submit}>
            Submit review
          </button>
        )}
      </div>
    </section>
  );
}
