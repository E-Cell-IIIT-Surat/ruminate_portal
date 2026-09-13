import assert from "node:assert/strict";
import test from "node:test";
import { formBuilderInput, formBuilderIssues } from "../lib/validation/form-builder";

const input = (fields: Record<string, unknown>[]) => ({ sections: [{ title: "Registration", fields }] });
const text = { key: "name", type: "SHORT_TEXT", label: "Full name" };

test("custom form accepts text, numbers, choices and PDF/DOCX uploads", () => {
  const result = formBuilderInput.parse(
    input([
      text,
      { key: "year", type: "NUMBER", label: "Year", minNumber: 1, maxNumber: 4 },
      { key: "batch", type: "DROPDOWN", label: "Batch", options: [" A", " B ", ""] },
      {
        key: "proposal",
        type: "FILE",
        label: "Proposal",
        allowedFileTypes: [
          "application/pdf",
          " application/vnd.openxmlformats-officedocument.wordprocessingml.document ",
          "",
        ],
        maxFileSizeBytes: 10485760,
      },
    ]),
  );
  assert.deepEqual(result.sections[0].fields[2].options, ["A", "B"]);
  assert.equal(result.sections[0].fields[3].allowedFileTypes.length, 2);
});

test("missing upload configuration identifies the exact field", () => {
  const result = formBuilderInput.safeParse(
    input([text, { key: "upload", type: "FILE", label: "Document", allowedFileTypes: [] }]),
  );
  assert.equal(result.success, false);
  if (!result.success) {
    const [issue] = formBuilderIssues(result.error);
    assert.equal(issue.path, "sections.0.fields.1.allowedFileTypes");
    assert.match(issue.message, /Section 1, field 2/);
  }
});

test("blank comma-separated choices cannot bypass publication validation", () => {
  assert.equal(
    formBuilderInput.safeParse(input([{ key: "choice", type: "RADIO", label: "Choose", options: ["", " "] }])).success,
    false,
  );
});

test("invalid and duplicate keys remain rejected with useful messages", () => {
  const invalid = formBuilderInput.safeParse(input([{ ...text, key: "123" }]));
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.match(formBuilderIssues(invalid.error)[0].message, /Start the field key with a letter/);
  assert.equal(formBuilderInput.safeParse(input([text, text])).success, false);
});

test("invalid limits and deleted conditional references are rejected", () => {
  assert.equal(formBuilderInput.safeParse(input([{ ...text, minLength: 20, maxLength: 2 }])).success, false);
  assert.equal(
    formBuilderInput.safeParse(input([{ ...text, conditionFieldKey: "deleted", conditionOperator: "==" }])).success,
    false,
  );
});

test("a large custom form validates without losing fields", () => {
  const fields = Array.from({ length: 100 }, (_, index) => ({ ...text, key: `field_${index}` }));
  assert.equal(formBuilderInput.parse(input(fields)).sections[0].fields.length, 100);
});
