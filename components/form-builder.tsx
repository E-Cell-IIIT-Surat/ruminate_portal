"use client";
import { AdminHelp } from "@/components/admin-help";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { formBuilderInput, formBuilderIssues } from "@/lib/validation/form-builder";

import { templates, type BuilderField, type BuilderSection } from "@/lib/forms/templates";

const types = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "URL",
  "DATE",
  "DROPDOWN",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
  "FILE",
  "CONSENT",
  "HEADING",
  "HELP_TEXT",
];
const blankField = (key = `field_${crypto.randomUUID().replaceAll("-", "")}`): BuilderField => ({
  key,
  label: "New field",
  type: "SHORT_TEXT",
  required: false,
  hideFromReviewers: false,
  allowedFileTypes: [],
});

export function FormBuilder({ programId, initial }: { programId: string; initial: BuilderSection[] }) {
  const router = useRouter();
  const [sections, setSections] = useState<BuilderSection[]>(
    initial.length ? initial : [{ title: "Personal details", fields: [blankField("field_1")] }],
  );
  const [state, setState] = useState("Unsaved changes");
  const [busy, setBusy] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(initial));
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);
  const dirty = JSON.stringify(sections) !== savedSnapshot;
  const totalFields = useMemo(() => sections.reduce((total, section) => total + section.fields.length, 0), [sections]);
  const fieldKeys = useMemo(() => sections.flatMap((section) => section.fields.map((field) => field.key)), [sections]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty && !busy) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  function patchSection(index: number, patch: Partial<BuilderSection>) {
    setSections((current) => current.map((section, i) => (i === index ? { ...section, ...patch } : section)));
    setState("Unsaved changes");
  }
  function patchField(sectionIndex: number, fieldIndex: number, patch: Partial<BuilderField>) {
    patchSection(sectionIndex, {
      fields: sections[sectionIndex].fields.map((field, i) => (i === fieldIndex ? { ...field, ...patch } : field)),
    });
  }
  function moveSection(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    setState("Unsaved changes");
  }
  function moveField(sectionIndex: number, fieldIndex: number, offset: number) {
    const target = fieldIndex + offset;
    const fields = sections[sectionIndex].fields;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[fieldIndex], next[target]] = [next[target], next[fieldIndex]];
    patchSection(sectionIndex, { fields: next });
  }
  async function save(publish = false) {
    if (busy) return;
    const parsed = formBuilderInput.safeParse({ sections });
    if (!parsed.success) {
      setIssues(formBuilderIssues(parsed.error));
      setState("Please fix the listed fields. Your edits are still here.");
      return;
    }
    setIssues([]);
    const snapshot = JSON.stringify(sections);
    setBusy(true);
    setState(publish ? "Publishing…" : "Saving…");
    try {
      const draftResponse = await fetch(`/api/admin/programs/${programId}/form`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed.data, publish }),
      });
      const draftResult = await draftResponse.json();
      if (!draftResponse.ok) {
        setIssues(draftResult.issues ?? []);
        setState(
          `${draftResult.error ?? "Could not save"}${draftResult.requestId ? ` · Support reference: ${draftResult.requestId}` : ""}. Your edits are still here.`,
        );
        return;
      }
      setSavedSnapshot(snapshot);
      setState(
        publish
          ? `Version ${draftResult.version.version} published. Open registration from the launch panel.`
          : `Draft v${draftResult.version.version} saved`,
      );
      router.refresh();
    } catch {
      setState("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="builder-layout">
      <fieldset disabled={busy} style={{ minWidth: 0, border: 0, padding: 0, margin: 0 }}>
        <p>
          Publishing saves the form for applicants. Next, return to the launch panel to open or schedule registration.
        </p>
        <Link className="button button-secondary" href={`/admin/programs/${programId}`}>
          Launch / schedule registration
        </Link>
        <div className="template-row">
          <span>Start from a template</span>
          {Object.keys(templates).map((name) => (
            <button
              key={name}
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(
                    "Replace the current editor contents with this template? Saved and published versions stay unchanged until you save or publish.",
                  )
                )
                  return;
                setSections(structuredClone(templates[name]));
                setState("Template applied · Unsaved");
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="builder-toolbar">
          <div>
            <strong>
              {sections.length} sections · {totalFields} fields
            </strong>
            <small role="status">
              {state}
              {dirty && !state.includes("Unsaved") ? " · Unsaved edits" : ""}
            </small>
          </div>
          <button className="button button-secondary" onClick={() => save(false)} disabled={busy}>
            <Save size={15} /> Save draft
          </button>
          <button className="button button-primary" onClick={() => save(true)} disabled={busy}>
            Publish form
          </button>
        </div>
        {issues.length > 0 && (
          <div role="alert" className="form-error">
            <strong>The form was not saved. Check these fields:</strong>
            <ul>
              {issues.map((issue, index) => (
                <li key={`${issue.path}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}
        {sections.map((section, sectionIndex) => (
          <article className="builder-section" key={sectionIndex}>
            <header>
              <div>
                <input
                  aria-label="Section title"
                  value={section.title}
                  onChange={(event) => patchSection(sectionIndex, { title: event.target.value })}
                />
                <span>Section {sectionIndex + 1}</span>
              </div>
              <div>
                <button aria-label="Move section up" onClick={() => moveSection(sectionIndex, -1)}>
                  <ArrowUp size={15} />
                </button>
                <button aria-label="Move section down" onClick={() => moveSection(sectionIndex, 1)}>
                  <ArrowDown size={15} />
                </button>
                <button
                  aria-label="Delete section"
                  onClick={() => setSections((current) => current.filter((_, i) => i !== sectionIndex))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </header>
            <div className="builder-fields">
              {section.fields.map((field, fieldIndex) => (
                <div className="builder-field" key={fieldIndex}>
                  <span className="drag-index">{fieldIndex + 1}</span>
                  <div className="builder-field-main">
                    <input
                      aria-label="Field label"
                      value={field.label}
                      onChange={(event) => patchField(sectionIndex, fieldIndex, { label: event.target.value })}
                    />
                    <div>
                      <input
                        aria-label="Field key"
                        value={field.key}
                        onChange={(event) =>
                          patchField(sectionIndex, fieldIndex, {
                            key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                          })
                        }
                      />
                      <select
                        aria-label="Field type"
                        value={field.type}
                        onChange={(event) =>
                          patchField(sectionIndex, fieldIndex, {
                            type: event.target.value,
                            minLength: null,
                            maxLength: null,
                            minNumber: null,
                            maxNumber: null,
                            ...(event.target.value === "FILE"
                              ? {
                                  allowedFileTypes: field.allowedFileTypes.length
                                    ? field.allowedFileTypes
                                    : [
                                        "application/pdf",
                                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                      ],
                                  maxFileSizeBytes: field.maxFileSizeBytes ?? 10485760,
                                }
                              : {}),
                          })
                        }
                      >
                        {types.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                      <label>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) => patchField(sectionIndex, fieldIndex, { required: event.target.checked })}
                        />{" "}
                        Required
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={field.hideFromReviewers ?? false}
                          onChange={(event) =>
                            patchField(sectionIndex, fieldIndex, { hideFromReviewers: event.target.checked })
                          }
                        />{" "}
                        Hide in blind review
                      </label>
                    </div>
                    <div className="builder-field-options">
                      <input
                        aria-label="Field description"
                        value={field.description ?? ""}
                        placeholder="Description"
                        onChange={(event) => patchField(sectionIndex, fieldIndex, { description: event.target.value })}
                      />
                      <input
                        aria-label="Help text"
                        value={field.helpText ?? ""}
                        placeholder="Help text"
                        onChange={(event) => patchField(sectionIndex, fieldIndex, { helpText: event.target.value })}
                      />
                      <input
                        aria-label="Placeholder"
                        value={field.placeholder ?? ""}
                        placeholder="Placeholder"
                        onChange={(event) => patchField(sectionIndex, fieldIndex, { placeholder: event.target.value })}
                      />
                      {["DROPDOWN", "MULTI_SELECT", "RADIO"].includes(field.type) && (
                        <input
                          aria-label="Options"
                          value={(field.options ?? []).join(",")}
                          placeholder="Options, separated by commas"
                          onChange={(event) =>
                            patchField(sectionIndex, fieldIndex, {
                              options: event.target.value.split(","),
                            })
                          }
                        />
                      )}
                      {["SHORT_TEXT", "LONG_TEXT", "PHONE"].includes(field.type) && (
                        <>
                          <input
                            aria-label="Minimum length"
                            type="number"
                            min="0"
                            value={field.minLength ?? ""}
                            placeholder="Minimum length"
                            onChange={(event) =>
                              patchField(sectionIndex, fieldIndex, {
                                minLength: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                          />
                          <input
                            aria-label="Maximum length"
                            type="number"
                            min="1"
                            value={field.maxLength ?? ""}
                            placeholder="Maximum length"
                            onChange={(event) =>
                              patchField(sectionIndex, fieldIndex, {
                                maxLength: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                          />
                        </>
                      )}
                      {field.type === "NUMBER" && (
                        <>
                          <input
                            aria-label="Minimum number"
                            type="number"
                            value={field.minNumber ?? ""}
                            placeholder="Minimum"
                            onChange={(event) =>
                              patchField(sectionIndex, fieldIndex, {
                                minNumber: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                          />
                          <input
                            aria-label="Maximum number"
                            type="number"
                            value={field.maxNumber ?? ""}
                            placeholder="Maximum"
                            onChange={(event) =>
                              patchField(sectionIndex, fieldIndex, {
                                maxNumber: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                          />
                        </>
                      )}
                      {field.type === "FILE" && (
                        <>
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() =>
                              patchField(sectionIndex, fieldIndex, {
                                allowedFileTypes: [
                                  "application/pdf",
                                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                ],
                                maxFileSizeBytes: field.maxFileSizeBytes ?? 10485760,
                              })
                            }
                          >
                            Allow PDF & DOCX
                          </button>
                          <input
                            aria-label="Allowed MIME types"
                            value={field.allowedFileTypes.join(",")}
                            placeholder="application/pdf, image/png"
                            onChange={(event) =>
                              patchField(sectionIndex, fieldIndex, {
                                allowedFileTypes: event.target.value.split(","),
                              })
                            }
                          />
                          <input
                            aria-label="Maximum file size in megabytes"
                            type="number"
                            min="1"
                            max="25"
                            value={field.maxFileSizeBytes ? field.maxFileSizeBytes / 1024 / 1024 : ""}
                            placeholder="Maximum MB"
                            onChange={(event) =>
                              patchField(sectionIndex, fieldIndex, {
                                maxFileSizeBytes: event.target.value ? Number(event.target.value) * 1024 * 1024 : null,
                              })
                            }
                          />
                        </>
                      )}
                      <select
                        aria-label="Conditional field"
                        value={field.conditionFieldKey ?? ""}
                        onChange={(event) =>
                          patchField(sectionIndex, fieldIndex, {
                            conditionFieldKey: event.target.value || null,
                            conditionOperator: event.target.value ? (field.conditionOperator ?? "==") : null,
                          })
                        }
                      >
                        <option value="">Always visible</option>
                        {fieldKeys
                          .filter((key) => key !== field.key)
                          .map((key) => (
                            <option key={key} value={key}>
                              {key}
                            </option>
                          ))}
                      </select>
                      {field.conditionFieldKey && (
                        <>
                          <select
                            aria-label="Condition operator"
                            value={field.conditionOperator ?? "=="}
                            onChange={(event) =>
                              patchField(sectionIndex, fieldIndex, {
                                conditionOperator: event.target.value as "==" | "!=",
                              })
                            }
                          >
                            <option value="==">equals</option>
                            <option value="!=">does not equal</option>
                          </select>
                          <input
                            aria-label="Condition value"
                            value={String(field.conditionValue ?? "")}
                            placeholder="Condition value"
                            onChange={(event) =>
                              patchField(sectionIndex, fieldIndex, { conditionValue: event.target.value })
                            }
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="builder-field-actions">
                    <button aria-label="Move field up" onClick={() => moveField(sectionIndex, fieldIndex, -1)}>
                      <ArrowUp size={15} />
                    </button>
                    <button aria-label="Move field down" onClick={() => moveField(sectionIndex, fieldIndex, 1)}>
                      <ArrowDown size={15} />
                    </button>
                    <button
                      aria-label="Delete field"
                      onClick={() =>
                        patchSection(sectionIndex, { fields: section.fields.filter((_, i) => i !== fieldIndex) })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="add-field"
              onClick={() => patchSection(sectionIndex, { fields: [...section.fields, blankField()] })}
            >
              <Plus size={15} /> Add field
            </button>
          </article>
        ))}
        <button
          className="add-section"
          onClick={() => setSections((current) => [...current, { title: "New section", fields: [] }])}
        >
          <Plus size={16} /> Add section
        </button>
      </fieldset>
      <aside className="builder-preview">
        <span>Live preview</span>
        <h2>
          Application form <AdminHelp title="Application form" />
        </h2>
        {sections.map((section, index) => (
          <div key={index}>
            <h3>{section.title}</h3>
            {section.fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.required && <b> *</b>}
                <span>
                  {["LONG_TEXT"].includes(field.type) ? (
                    <textarea disabled />
                  ) : field.type === "CONSENT" || field.type === "CHECKBOX" ? (
                    <input type="checkbox" disabled />
                  ) : (
                    <input disabled placeholder={field.placeholder} />
                  )}
                </span>
              </label>
            ))}
          </div>
        ))}
      </aside>
    </div>
  );
}
