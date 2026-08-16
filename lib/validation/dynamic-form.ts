import { z } from "zod";

export type DynamicField = {
  id: string;
  key: string;
  type: string;
  label: string;
  required: boolean;
  minLength: number | null;
  maxLength: number | null;
  minNumber: { toNumber(): number } | number | null;
  maxNumber: { toNumber(): number } | number | null;
  options: unknown;
  conditionFieldKey: string | null;
  conditionOperator: string | null;
  conditionValue: unknown;
};

export type AnswerMap = Record<string, unknown>;

function isVisible(field: DynamicField, answers: AnswerMap) {
  if (!field.conditionFieldKey) return true;
  const current = answers[field.conditionFieldKey];
  return field.conditionOperator === "!=" ? current !== field.conditionValue : current === field.conditionValue;
}

function numberValue(value: DynamicField["minNumber"]) {
  if (value === null) return undefined;
  return typeof value === "number" ? value : value.toNumber();
}

export function validateDynamicAnswers(fields: DynamicField[], answers: AnswerMap) {
  const issues: Record<string, string> = {};
  for (const field of fields) {
    if (["HEADING", "HELP_TEXT", "FILE"].includes(field.type) || !isVisible(field, answers)) continue;
    const value = answers[field.key];
    const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    if (field.required && empty) {
      issues[field.key] = `${field.label} is required`;
      continue;
    }
    if (empty) continue;
    let schema: z.ZodTypeAny = z.unknown();
    if (["SHORT_TEXT", "LONG_TEXT", "PHONE"].includes(field.type)) {
      let stringSchema = z.string();
      if (field.minLength !== null) stringSchema = stringSchema.min(field.minLength);
      if (field.maxLength !== null) stringSchema = stringSchema.max(field.maxLength);
      schema = stringSchema;
    } else if (field.type === "EMAIL") schema = z.string().email();
    else if (field.type === "URL") schema = z.string().url();
    else if (field.type === "DATE") schema = z.string().date();
    else if (field.type === "NUMBER") {
      let numberSchema = z.coerce.number();
      const min = numberValue(field.minNumber);
      const max = numberValue(field.maxNumber);
      if (min !== undefined) numberSchema = numberSchema.min(min);
      if (max !== undefined) numberSchema = numberSchema.max(max);
      schema = numberSchema;
    } else if (["DROPDOWN", "RADIO"].includes(field.type)) schema = z.string();
    else if (field.type === "MULTI_SELECT") schema = z.array(z.string());
    else if (["CHECKBOX", "CONSENT"].includes(field.type)) schema = z.literal(true);
    const parsed = schema.safeParse(value);
    if (!parsed.success) issues[field.key] = parsed.error.issues[0]?.message ?? "Invalid value";
    const options = Array.isArray(field.options) ? field.options.map(String) : [];
    if (options.length && typeof value === "string" && !options.includes(value))
      issues[field.key] = "Select a valid option";
    if (options.length && Array.isArray(value) && value.some((item) => !options.includes(String(item))))
      issues[field.key] = "Select valid options";
  }
  return issues;
}
