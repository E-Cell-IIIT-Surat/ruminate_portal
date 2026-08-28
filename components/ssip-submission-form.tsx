"use client";

import { useState } from "react";

type SSIPDefaults = { name?: string | null; email?: string | null };

type FormValues = {
  name: string;
  email: string;
  phone: string;
  institution: string;
  degree: string;
  studyYear: string;
  teamName: string;
  title: string;
  problemStatement: string;
  solution: string;
  technology: string;
  estimatedBudget: string;
  impact: string;
};

const fields: Array<{
  name: keyof FormValues;
  label: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  placeholder: string;
}> = [
  { name: "name", label: "Full name", required: true, placeholder: "Your full name" },
  { name: "email", label: "Email address", type: "email", required: true, placeholder: "you@example.com" },
  { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "+91 98765 43210" },
  { name: "institution", label: "Institution", placeholder: "IIIT Surat" },
  { name: "degree", label: "Degree / programme", placeholder: "B.Tech / M.Tech / PhD" },
  { name: "studyYear", label: "Academic year", placeholder: "2026" },
  { name: "teamName", label: "Team name", placeholder: "Optional team name" },
  { name: "title", label: "Idea title", required: true, placeholder: "Give your idea a clear title" },
  {
    name: "problemStatement",
    label: "Problem statement",
    required: true,
    wide: true,
    placeholder: "What problem are you solving, and who experiences it?",
  },
  {
    name: "solution",
    label: "Proposed solution",
    required: true,
    wide: true,
    placeholder: "Explain how your idea solves the problem.",
  },
  {
    name: "technology",
    label: "Technology / approach",
    required: true,
    wide: true,
    placeholder: "Tools, methods, or research approach you will use",
  },
  { name: "estimatedBudget", label: "Estimated budget (₹)", type: "number", placeholder: "0" },
  {
    name: "impact",
    label: "Expected impact",
    required: true,
    wide: true,
    placeholder: "Who benefits and what measurable change do you expect?",
  },
];

export function SSIPSubmissionForm({ defaults }: { defaults?: SSIPDefaults }) {
  const [values, setValues] = useState<FormValues>({
    name: defaults?.name ?? "",
    email: defaults?.email ?? "",
    phone: "",
    institution: "IIIT Surat",
    degree: "",
    studyYear: "",
    teamName: "",
    title: "",
    problemStatement: "",
    solution: "",
    technology: "",
    estimatedBudget: "",
    impact: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  function update(name: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("Submitting your SSIP idea…");
    setErrors({});
    setReference("");
    try {
      const response = await fetch("/api/ssip/submissions", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          ...values,
          estimatedBudget: values.estimatedBudget ? Number(values.estimatedBudget) : undefined,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
        submission?: { referenceId?: string };
      };
      if (!response.ok) {
        setErrors(result.fields ?? {});
        throw new Error(result.error ?? "We could not submit your idea. Check the highlighted fields.");
      }
      setReference(result.submission?.referenceId ?? "");
      setStatus("Your SSIP idea has been submitted successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "We could not submit your idea. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (reference) {
    return (
      <div className="ssip-success" role="status">
        <span className="ssip-success-mark">✓</span>
        <h3>Idea received</h3>
        <p>{status}</p>
        <strong>Reference: {reference}</strong>
        <p className="muted">We have emailed a confirmation and you can follow status updates from your portal.</p>
      </div>
    );
  }

  return (
    <form className="ssip-form" onSubmit={submit} noValidate>
      <div className="ssip-form-grid">
        {fields.map((field) => (
          <label className={field.wide ? "ssip-field ssip-field-wide" : "ssip-field"} key={field.name}>
            <span>
              {field.label}
              {field.required ? " *" : ""}
            </span>
            {field.wide ? (
              <textarea
                required={field.required}
                rows={5}
                value={values[field.name]}
                placeholder={field.placeholder}
                onChange={(event) => update(field.name, event.target.value)}
                aria-invalid={Boolean(errors[field.name])}
              />
            ) : (
              <input
                required={field.required}
                type={field.type ?? "text"}
                inputMode={field.type === "number" ? "decimal" : field.type === "tel" ? "tel" : undefined}
                min={field.type === "number" ? 0 : undefined}
                value={values[field.name]}
                placeholder={field.placeholder}
                onChange={(event) => update(field.name, event.target.value)}
                aria-invalid={Boolean(errors[field.name])}
              />
            )}
            {errors[field.name] && <small className="field-error">{errors[field.name]}</small>}
          </label>
        ))}
      </div>
      {status && (
        <p className={`form-status ${Object.keys(errors).length ? "error" : ""}`} role="status">
          {status}
        </p>
      )}
      <button className="button button-primary" type="submit" disabled={busy}>
        {busy ? "Submitting…" : "Submit SSIP idea"}
      </button>
    </form>
  );
}
