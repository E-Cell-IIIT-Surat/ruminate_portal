"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";

type BuilderField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  helpText?: string;
  placeholder?: string;
  options?: string[];
  allowedFileTypes: string[];
  maxFileSizeBytes?: number | null;
};
type BuilderSection = { title: string; description?: string; fields: BuilderField[] };

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
];
const blankField = (): BuilderField => ({
  key: `field_${Date.now()}`,
  label: "New field",
  type: "SHORT_TEXT",
  required: false,
  allowedFileTypes: [],
});

const templates: Record<string, BuilderSection[]> = {
  "Basic registration": [
    {
      title: "Personal details",
      fields: ["Name", "Email", "Phone", "College", "Year"].map((label) => ({
        key: label.toLowerCase().replace(" ", "_"),
        label,
        type: label === "Email" ? "EMAIL" : label === "Phone" ? "PHONE" : "SHORT_TEXT",
        required: true,
        allowedFileTypes: [],
      })),
    },
  ],
  Workshop: [
    {
      title: "Personal information",
      fields: ["Name", "Email", "College"].map((label) => ({
        key: label.toLowerCase(),
        label,
        type: label === "Email" ? "EMAIL" : "SHORT_TEXT",
        required: true,
        allowedFileTypes: [],
      })),
    },
    {
      title: "Background",
      fields: [
        { key: "experience", label: "Relevant experience", type: "LONG_TEXT", required: false, allowedFileTypes: [] },
        {
          key: "motivation",
          label: "Why do you want to attend?",
          type: "LONG_TEXT",
          required: true,
          allowedFileTypes: [],
        },
      ],
    },
  ],
  "Startup competition": [
    {
      title: "Startup",
      fields: [
        { key: "startup_name", label: "Startup name", type: "SHORT_TEXT", required: true, allowedFileTypes: [] },
        { key: "problem", label: "Problem", type: "LONG_TEXT", required: true, allowedFileTypes: [] },
        { key: "solution", label: "Solution", type: "LONG_TEXT", required: true, allowedFileTypes: [] },
        { key: "target_market", label: "Target market", type: "LONG_TEXT", required: true, allowedFileTypes: [] },
        {
          key: "pitch_deck",
          label: "Pitch deck",
          type: "FILE",
          required: true,
          allowedFileTypes: ["application/pdf"],
          maxFileSizeBytes: 10485760,
        },
      ],
    },
  ],
  "SSIP application": [
    {
      title: "Proposal",
      fields: [
        {
          key: "problem_statement",
          label: "Problem statement",
          type: "LONG_TEXT",
          required: true,
          allowedFileTypes: [],
        },
        { key: "innovation", label: "Innovation", type: "LONG_TEXT", required: true, allowedFileTypes: [] },
        {
          key: "technical_approach",
          label: "Technical approach",
          type: "LONG_TEXT",
          required: true,
          allowedFileTypes: [],
        },
        {
          key: "implementation_plan",
          label: "Implementation plan",
          type: "LONG_TEXT",
          required: true,
          allowedFileTypes: [],
        },
        { key: "budget", label: "Budget", type: "NUMBER", required: true, allowedFileTypes: [] },
        {
          key: "proposal_document",
          label: "Proposal document",
          type: "FILE",
          required: true,
          allowedFileTypes: ["application/pdf"],
          maxFileSizeBytes: 10485760,
        },
      ],
    },
  ],
};

export function FormBuilder({ programId, initial }: { programId: string; initial: BuilderSection[] }) {
  const [sections, setSections] = useState<BuilderSection[]>(
    initial.length ? initial : [{ title: "Personal details", fields: [blankField()] }],
  );
  const [state, setState] = useState("Unsaved changes");
  const totalFields = useMemo(() => sections.reduce((total, section) => total + section.fields.length, 0), [sections]);
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
  async function save(publish = false) {
    setState(publish ? "Publishing…" : "Saving…");
    if (!publish) {
      const response = await fetch(`/api/admin/programs/${programId}/form`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      const result = await response.json();
      setState(response.ok ? `Draft v${result.version.version} saved` : (result.error ?? "Could not save"));
      return;
    }
    const response = await fetch(`/api/admin/programs/${programId}/form`, { method: "POST" });
    const result = await response.json();
    setState(response.ok ? `Version ${result.version.version} published` : (result.error ?? "Could not publish"));
  }
  return (
    <div className="builder-layout">
      <section>
        <div className="template-row">
          <span>Start from a template</span>
          {Object.keys(templates).map((name) => (
            <button
              key={name}
              onClick={() => {
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
            <small>{state}</small>
          </div>
          <button className="button button-secondary" onClick={() => save(false)}>
            <Save size={15} /> Save draft
          </button>
          <button className="button button-primary" onClick={() => save(true)}>
            Publish form
          </button>
        </div>
        {sections.map((section, sectionIndex) => (
          <article className="builder-section" key={`${section.title}-${sectionIndex}`}>
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
                <div className="builder-field" key={`${field.key}-${fieldIndex}`}>
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
                        onChange={(event) => patchField(sectionIndex, fieldIndex, { type: event.target.value })}
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
                    </div>
                  </div>
                  <button
                    aria-label="Delete field"
                    onClick={() =>
                      patchSection(sectionIndex, { fields: section.fields.filter((_, i) => i !== fieldIndex) })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
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
      </section>
      <aside className="builder-preview">
        <span>Live preview</span>
        <h2>Application form</h2>
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
