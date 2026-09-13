import { z } from "zod";

export type DynamicField = {
  id: string;
  key: string;
  type: string;
  label: string;
  required: boolean;
  minLength?: number | null;
  maxLength?: number | null;
  minNumber?: { toNumber(): number } | number | null;
  maxNumber?: { toNumber(): number } | number | null;
  options: unknown;
  conditionFieldKey: string | null;
  conditionOperator: string | null;
  conditionValue: unknown;
};

export type AnswerMap = Record<string, unknown>;

export function isFieldVisible(
  field: Pick<DynamicField, "conditionFieldKey" | "conditionOperator" | "conditionValue">,
  answers: AnswerMap,
) {
  if (!field.conditionFieldKey) return true;
  const current = answers[field.conditionFieldKey];
  // The builder's condition input is text, while number/checkbox answers are typed.
  const expected =
    typeof current === "number" && typeof field.conditionValue === "string" && field.conditionValue.trim() !== ""
      ? Number(field.conditionValue)
      : typeof current === "boolean" && ["true", "false"].includes(String(field.conditionValue))
        ? String(field.conditionValue) === "true"
        : field.conditionValue;
  const matches = Array.isArray(current) ? current.includes(expected) : current === expected;
  return field.conditionOperator === "!=" ? !matches : matches;
}

function numberValue(value: DynamicField["minNumber"]) {
  if (value == null) return undefined;
  return typeof value === "number" ? value : value.toNumber();
}

export function validateDynamicAnswers(
  fields: DynamicField[],
  answers: AnswerMap,
  files?: { fieldId: string; deletedAt?: Date | string | null }[],
) {
  const issues: Record<string, string> = {};
  for (const field of fields) {
    if (["HEADING", "HELP_TEXT"].includes(field.type) || !isFieldVisible(field, answers)) continue;
    if (field.type === "FILE") {
      if (files && field.required && !files.some((file) => file.fieldId === field.id && !file.deletedAt))
        issues[field.key] = `${field.label}: upload the required document`;
      continue;
    }
    const value = answers[field.key];
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0);
    if (field.required && empty) {
      issues[field.key] = `${field.label} is required`;
      continue;
    }
    if (empty) continue;
    let schema: z.ZodTypeAny = z.unknown();
    if (["SHORT_TEXT", "LONG_TEXT", "PHONE"].includes(field.type)) {
      let stringSchema = z.string();
      if (field.minLength != null) stringSchema = stringSchema.min(field.minLength);
      if (field.maxLength != null) stringSchema = stringSchema.max(field.maxLength);
      schema =
        field.type === "PHONE"
          ? stringSchema.regex(/^[+\d][\d\s().-]{7,24}$/, "Enter a valid phone number")
          : stringSchema;
    } else if (field.type === "EMAIL") schema = z.string().trim().email("Enter a valid email address");
    else if (field.type === "URL") schema = z.string().trim().url("Enter a complete URL, such as https://example.com");
    else if (field.type === "DATE") schema = z.string().date();
    else if (field.type === "NUMBER") {
      let numberSchema = z.number().finite();
      const min = numberValue(field.minNumber);
      const max = numberValue(field.maxNumber);
      if (min !== undefined) numberSchema = numberSchema.min(min);
      if (max !== undefined) numberSchema = numberSchema.max(max);
      schema = z.preprocess(
        (item) => (typeof item === "string" && item.trim() !== "" ? Number(item) : item),
        numberSchema,
      );
    } else if (["DROPDOWN", "RADIO"].includes(field.type)) schema = z.string();
    else if (field.type === "MULTI_SELECT") schema = z.array(z.string());
    else if (["CHECKBOX", "CONSENT"].includes(field.type))
      schema = field.required
        ? z.literal(true, { errorMap: () => ({ message: "Please tick this required checkbox" }) })
        : z.boolean();
    const parsed = schema.safeParse(value);
    if (!parsed.success) issues[field.key] = `${field.label}: ${parsed.error.issues[0]?.message ?? "Invalid value"}`;
    const options = Array.isArray(field.options) ? field.options.map(String) : [];
    if (
      ["DROPDOWN", "RADIO"].includes(field.type) &&
      options.length &&
      typeof value === "string" &&
      !options.includes(value)
    )
      issues[field.key] = `${field.label}: select a valid option`;
    if (
      field.type === "MULTI_SELECT" &&
      options.length &&
      Array.isArray(value) &&
      value.some((item) => !options.includes(String(item)))
    )
      issues[field.key] = `${field.label}: select valid options`;
  }
  return issues;
}
