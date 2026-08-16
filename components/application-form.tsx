"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Save } from "lucide-react";

type Field = {
  id: string;
  key: string;
  type: string;
  label: string;
  description: string | null;
  helpText: string | null;
  placeholder: string | null;
  required: boolean;
  options: unknown;
  conditionFieldKey: string | null;
  conditionOperator: string | null;
  conditionValue: unknown;
  allowedFileTypes: string[];
  maxFileSizeBytes: number | null;
};
type Section = { id: string; title: string; description: string | null; fields: Field[] };

function visible(field: Field, answers: Record<string, unknown>) {
  if (!field.conditionFieldKey) return true;
  return field.conditionOperator === "!="
    ? answers[field.conditionFieldKey] !== field.conditionValue
    : answers[field.conditionFieldKey] === field.conditionValue;
}

export function ApplicationForm({
  applicationId,
  sections,
  initialAnswers,
  locked,
  initialFiles,
}: {
  applicationId: string;
  sections: Section[];
  initialAnswers: Record<string, unknown>;
  locked: boolean;
  initialFiles: { id: string; fieldId: string; originalFilename: string }[];
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [saveState, setSaveState] = useState("Saved");
  const [review, setReview] = useState(false);
  const [files, setFiles] = useState(initialFiles);
  const [error, setError] = useState("");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (locked) return;
    const timer = setTimeout(async () => {
      setSaveState("Saving…");
      const response = await fetch(`/api/applications/${applicationId}/draft`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(answers),
      });
      setSaveState(response.ok ? "Saved just now" : "Save failed");
    }, 900);
    return () => clearTimeout(timer);
  }, [answers, applicationId, locked]);
  const visibleSections = useMemo(
    () =>
      sections.map((section) => ({ ...section, fields: section.fields.filter((field) => visible(field, answers)) })),
    [answers, sections],
  );
  function set(key: string, value: unknown) {
    setSaveState("Unsaved");
    setAnswers((current) => ({ ...current, [key]: value }));
  }
  async function manualSave() {
    setSaveState("Saving…");
    const response = await fetch(`/api/applications/${applicationId}/draft`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(answers),
    });
    setSaveState(response.ok ? "Saved just now" : "Save failed");
  }
  async function upload(field: Field, file?: File) {
    if (!file) return;
    setSaveState("Uploading…");
    const request = await fetch("/api/files/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId,
        fieldId: field.id,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      }),
    });
    const signed = await request.json();
    if (!request.ok) {
      setError(signed.error);
      setSaveState("Upload failed");
      return;
    }
    const sent = await fetch(signed.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
    if (!sent.ok) {
      setError("Upload failed");
      setSaveState("Upload failed");
      return;
    }
    const finalized = await fetch("/api/files/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicationId,
        fieldId: field.id,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        objectKey: signed.objectKey,
      }),
    });
    const result = await finalized.json();
    if (finalized.ok) {
      setFiles((current) => [...current, result.file]);
      setSaveState("File uploaded");
    } else {
      setError(result.error);
      setSaveState("Upload failed");
    }
  }
  async function submit() {
    setError("");
    const response = await fetch(`/api/applications/${applicationId}/submit`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.code === "VALIDATION_ERROR" ? "Complete every required field before submitting." : result.error);
      return;
    }
    location.reload();
  }
  if (review)
    return (
      <div className="application-editor">
        <div className="save-bar">
          <button className="button button-secondary" onClick={() => setReview(false)}>
            Back to edit
          </button>
          <span>Review application</span>
        </div>
        {visibleSections.map((section) => (
          <section className="application-section review-section" key={section.id}>
            <h2>{section.title}</h2>
            {section.fields.map((field) => (
              <div key={field.id}>
                <small>{field.label}</small>
                <p>
                  {field.type === "FILE"
                    ? files
                        .filter((file) => file.fieldId === field.id)
                        .map((file) => file.originalFilename)
                        .join(", ") || "Not uploaded"
                    : Array.isArray(answers[field.key])
                      ? (answers[field.key] as unknown[]).join(", ")
                      : String(answers[field.key] ?? "Not answered")}
                </p>
              </div>
            ))}
          </section>
        ))}
        {error && <div className="form-error">{error}</div>}
        <div className="submit-panel">
          <div>
            <strong>Ready to submit?</strong>
            <small>Your responses will be captured as an immutable revision.</small>
          </div>
          <button className="button button-primary" onClick={submit}>
            Submit application
          </button>
        </div>
      </div>
    );
  return (
    <div className="application-editor">
      <div className="save-bar">
        <span className={saveState.includes("failed") ? "error" : ""}>{saveState}</span>
        <button className="button button-secondary" onClick={manualSave} disabled={locked}>
          <Save size={14} /> Save draft
        </button>
      </div>
      {visibleSections.map((section) => (
        <section className="application-section" key={section.id}>
          <header>
            <h2>{section.title}</h2>
            {section.description && <p>{section.description}</p>}
          </header>
          <div className="application-fields">
            {section.fields.map((field) => (
              <DynamicInput
                key={field.id}
                field={field}
                value={answers[field.key]}
                onChange={(value) => set(field.key, value)}
                onFile={(file) => upload(field, file)}
                files={files.filter((file) => file.fieldId === field.id)}
                locked={locked}
              />
            ))}
          </div>
        </section>
      ))}
      {error && <div className="form-error">{error}</div>}
      <div className="submit-panel">
        <div>
          <strong>{locked ? "Application submitted" : "Review before submitting"}</strong>
          <small>
            {locked
              ? "Editing is currently disabled for this program."
              : "Check every section and confirm your final responses."}
          </small>
        </div>
        {!locked && (
          <button className="button button-primary" onClick={() => setReview(true)}>
            Review application
          </button>
        )}
      </div>
    </div>
  );
}

function DynamicInput({
  field,
  value,
  onChange,
  onFile,
  files,
  locked,
}: {
  field: Field;
  value: unknown;
  onChange(value: unknown): void;
  onFile(file?: File): void;
  files: { originalFilename: string }[];
  locked: boolean;
}) {
  if (field.type === "HEADING") return <h3 className="content-heading">{field.label}</h3>;
  if (field.type === "HELP_TEXT") return <p className="content-help">{field.description ?? field.label}</p>;
  const options = Array.isArray(field.options) ? field.options.map(String) : [];
  return (
    <div className="field dynamic-field">
      <label htmlFor={field.id}>
        {field.label}
        {field.required && <b> *</b>}
      </label>
      {field.description && <small>{field.description}</small>}
      {field.type === "LONG_TEXT" ? (
        <textarea
          className="textarea"
          id={field.id}
          disabled={locked}
          value={String(value ?? "")}
          placeholder={field.placeholder ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : ["DROPDOWN", "RADIO"].includes(field.type) ? (
        <select
          className="select"
          id={field.id}
          disabled={locked}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : field.type === "MULTI_SELECT" ? (
        <div className="choice-list">
          {options.map((option) => (
            <label key={option}>
              <input
                type="checkbox"
                disabled={locked}
                checked={Array.isArray(value) && value.includes(option)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...(Array.isArray(value) ? value : []), option]
                      : Array.isArray(value)
                        ? value.filter((item) => item !== option)
                        : [],
                  )
                }
              />{" "}
              {option}
            </label>
          ))}
        </div>
      ) : ["CHECKBOX", "CONSENT"].includes(field.type) ? (
        <label className="consent">
          <input
            type="checkbox"
            disabled={locked}
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{field.helpText ?? "I agree"}</span>
        </label>
      ) : field.type === "FILE" ? (
        <div className="upload-box">
          <FileUp />
          <div>
            <strong>{files[0]?.originalFilename ?? "Choose a private file"}</strong>
            <small>{field.allowedFileTypes.join(", ") || "Allowed file types configured by the program"}</small>
          </div>
          <input
            aria-label={field.label}
            type="file"
            disabled={locked}
            accept={field.allowedFileTypes.join(",")}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </div>
      ) : (
        <input
          className="input"
          id={field.id}
          disabled={locked}
          type={
            field.type === "EMAIL"
              ? "email"
              : field.type === "PHONE"
                ? "tel"
                : field.type === "NUMBER"
                  ? "number"
                  : field.type === "URL"
                    ? "url"
                    : field.type === "DATE"
                      ? "date"
                      : "text"
          }
          value={String(value ?? "")}
          placeholder={field.placeholder ?? ""}
          onChange={(event) => onChange(field.type === "NUMBER" ? Number(event.target.value) : event.target.value)}
        />
      )}
      {field.helpText && !["CONSENT", "CHECKBOX"].includes(field.type) && <small>{field.helpText}</small>}
    </div>
  );
}
