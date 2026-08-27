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
type ApiResponse = Record<string, unknown>;
type UploadedFile = { id: string; fieldId: string; originalFilename: string };

function visible(field: Field, answers: Record<string, unknown>) {
  if (!field.conditionFieldKey) return true;
  return field.conditionOperator === "!="
    ? answers[field.conditionFieldKey] !== field.conditionValue
    : answers[field.conditionFieldKey] === field.conditionValue;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function readJson(response: Response): Promise<ApiResponse> {
  const body = await response.text();
  if (!body) return {};
  try {
    return JSON.parse(body) as ApiResponse;
  } catch {
    return { error: `The server returned an unexpected response (${response.status}).` };
  }
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
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState("");
  const [files, setFiles] = useState(initialFiles);
  const [error, setError] = useState("");
  const first = useRef(true);
  async function persistAnswers() {
    setSaveState("Saving…");
    try {
      const response = await fetch(`/api/applications/${applicationId}/draft`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(answers),
      });
      setSaveState(response.ok ? "Saved just now" : "Save failed");
      return response.ok;
    } catch {
      setSaveState("Save failed");
      return false;
    }
  }
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (locked) return;
    const timer = setTimeout(async () => {
      await persistAnswers();
    }, 900);
    return () => clearTimeout(timer);
    // persistAnswers intentionally follows the latest answer state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, applicationId, locked]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (locked || (!saveState.startsWith("Unsaved") && !saveState.startsWith("Saving"))) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [locked, saveState]);
  const visibleSections = useMemo(
    () =>
      sections.map((section) => ({ ...section, fields: section.fields.filter((field) => visible(field, answers)) })),
    [answers, sections],
  );
  const currentStep = Math.min(step, Math.max(0, visibleSections.length - 1));
  function set(key: string, value: unknown) {
    setSaveState("Unsaved");
    setAnswers((current) => ({ ...current, [key]: value }));
  }
  async function manualSave() {
    await persistAnswers();
  }
  async function upload(field: Field, file?: File) {
    if (!file) return;
    setUploadingField(field.id);
    setUploadStage("Preparing upload…");
    setError("");
    setSaveState("Uploading…");
    try {
      const request = await fetchWithTimeout(
        "/api/files/upload-url",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            applicationId,
            fieldId: field.id,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
          }),
        },
        15_000,
      );
      const signed = await readJson(request);
      if (!request.ok) throw new Error(String(signed.error ?? "Could not prepare the file upload."));
      if (typeof signed.uploadUrl !== "string" || typeof signed.objectKey !== "string")
        throw new Error("The storage service returned an invalid upload URL.");

      setUploadStage("Uploading file…");
      const sent = await fetchWithTimeout(
        signed.uploadUrl,
        { method: "PUT", headers: (signed.requiredHeaders ?? {}) as Record<string, string>, body: file },
        90_000,
      );
      if (!sent.ok) {
        if (sent.status === 403)
          throw new Error("The private storage upload was rejected. Check the R2 bucket CORS policy.");
        throw new Error(`File upload failed (${sent.status}).`);
      }

      setUploadStage("Verifying upload…");
      const finalized = await fetchWithTimeout(
        "/api/files/finalize",
        {
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
        },
        30_000,
      );
      const result = await readJson(finalized);
      if (!finalized.ok) throw new Error(String(result.error ?? "The uploaded file could not be verified."));
      const uploadedFile = result.file;
      if (
        !uploadedFile ||
        typeof uploadedFile !== "object" ||
        typeof (uploadedFile as { id?: unknown }).id !== "string" ||
        typeof (uploadedFile as { fieldId?: unknown }).fieldId !== "string" ||
        typeof (uploadedFile as { originalFilename?: unknown }).originalFilename !== "string"
      )
        throw new Error("The uploaded file was not saved.");
      setFiles((current) => [...current.filter((item) => item.fieldId !== field.id), uploadedFile as UploadedFile]);
      setSaveState("File uploaded");
    } catch (uploadError) {
      setError(
        uploadError instanceof DOMException && uploadError.name === "AbortError"
          ? "Upload timed out. Check your connection and the R2 bucket CORS settings, then try again."
          : uploadError instanceof Error
            ? uploadError.message
            : "Upload failed",
      );
      setSaveState("Upload failed");
    } finally {
      setUploadingField(null);
      setUploadStage("");
    }
  }
  async function submit() {
    if (submitting) return;
    if (uploadingField) {
      setError("Wait for the file upload to finish before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (!(await persistAnswers())) throw new Error("Save the application before submitting.");
      const response = await fetchWithTimeout(`/api/applications/${applicationId}/submit`, { method: "POST" }, 30_000);
      const result = await readJson(response);
      if (!response.ok) {
        if (result.code === "VALIDATION_ERROR" && result.fields && typeof result.fields === "object") {
          const missing = Object.values(result.fields as Record<string, unknown>)
            .map(String)
            .filter(Boolean)
            .join(" ");
          throw new Error(
            missing
              ? `Complete every required field before submitting. ${missing}`
              : "Complete every required field, including uploaded documents, before submitting.",
          );
        }
        throw new Error(String(result.error ?? "Submission failed"));
      }
      location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Submission failed");
      setSubmitting(false);
    }
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
          <button className="button button-primary" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit application"}
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
      {visibleSections.length > 1 && (
        <nav className="application-steps" aria-label="Application sections">
          {visibleSections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              className={index === currentStep ? "active" : ""}
              aria-current={index === currentStep ? "step" : undefined}
              onClick={() => setStep(index)}
            >
              <span>{index + 1}</span> {section.title}
            </button>
          ))}
        </nav>
      )}
      {visibleSections.slice(currentStep, currentStep + 1).map((section) => (
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
                uploading={uploadingField === field.id}
                uploadStage={uploadingField === field.id ? uploadStage : ""}
                locked={locked}
              />
            ))}
          </div>
        </section>
      ))}
      {visibleSections.length > 1 && (
        <div className="step-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={currentStep === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Previous
          </button>
          {currentStep < visibleSections.length - 1 && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => setStep((current) => Math.min(visibleSections.length - 1, current + 1))}
            >
              Save and continue
            </button>
          )}
        </div>
      )}
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
        {!locked && currentStep === visibleSections.length - 1 && (
          <button className="button button-primary" onClick={() => setReview(true)} disabled={Boolean(uploadingField)}>
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
  uploading,
  uploadStage,
  locked,
}: {
  field: Field;
  value: unknown;
  onChange(value: unknown): void;
  onFile(file?: File): void;
  files: { originalFilename: string }[];
  uploading: boolean;
  uploadStage: string;
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
            <strong>
              {uploading ? uploadStage || "Uploading…" : (files[0]?.originalFilename ?? "Choose a private file")}
            </strong>
            <small>{field.allowedFileTypes.join(", ") || "Allowed file types configured by the program"}</small>
          </div>
          <input
            aria-label={field.label}
            type="file"
            disabled={locked || uploading}
            accept={field.allowedFileTypes.join(",")}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </div>
      ) : (
        <input
          className="input"
          id={field.id}
          disabled={locked}
          required={field.required}
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
          inputMode={field.type === "NUMBER" ? "decimal" : field.type === "PHONE" ? "tel" : undefined}
          pattern={field.type === "PHONE" ? "^[+\\d][\\d\\s().-]{7,24}$" : undefined}
          value={String(value ?? "")}
          placeholder={field.placeholder ?? ""}
          onChange={(event) =>
            onChange(
              field.type === "NUMBER"
                ? event.target.value === ""
                  ? ""
                  : Number(event.target.value)
                : event.target.value,
            )
          }
        />
      )}
      {field.helpText && !["CONSENT", "CHECKBOX"].includes(field.type) && <small>{field.helpText}</small>}
    </div>
  );
}
