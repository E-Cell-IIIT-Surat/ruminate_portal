import { z } from "zod";

const field = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum([
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
  ]),
  label: z.string().min(1).max(180),
  description: z.string().max(1000).optional(),
  helpText: z.string().max(1000).optional(),
  placeholder: z.string().max(300).optional(),
  required: z.boolean().default(false),
  hideFromReviewers: z.boolean().default(false),
  minLength: z.number().int().min(0).nullable().optional(),
  maxLength: z.number().int().positive().nullable().optional(),
  minNumber: z.number().nullable().optional(),
  maxNumber: z.number().nullable().optional(),
  options: z.array(z.string().min(1)).optional(),
  allowedFileTypes: z.array(z.string()).default([]),
  maxFileSizeBytes: z.number().int().positive().max(25 * 1024 * 1024).nullable().optional(),
  conditionFieldKey: z.string().nullable().optional(),
  conditionOperator: z.enum(["==", "!="]).nullable().optional(),
  conditionValue: z.unknown().optional(),
});

export const formBuilderInput = z
  .object({
    sections: z
      .array(
        z.object({
          title: z.string().min(1).max(180),
          description: z.string().max(1000).optional(),
          fields: z.array(field).max(100),
        }),
      )
      .min(1)
      .max(30),
  })
  .superRefine((value, context) => {
    const keys = new Set<string>();
    value.sections.forEach((section, sectionIndex) => {
      section.fields.forEach((item, fieldIndex) => {
        if (keys.has(item.key))
          context.addIssue({
            code: "custom",
            path: ["sections", sectionIndex, "fields", fieldIndex, "key"],
            message: "Field keys must be unique across the entire form",
          });
        keys.add(item.key);
        if (item.minLength != null && item.maxLength != null && item.minLength > item.maxLength)
          context.addIssue({
            code: "custom",
            path: ["sections", sectionIndex, "fields", fieldIndex, "maxLength"],
            message: "Maximum length must be at least the minimum length",
          });
        if (item.minNumber != null && item.maxNumber != null && item.minNumber > item.maxNumber)
          context.addIssue({
            code: "custom",
            path: ["sections", sectionIndex, "fields", fieldIndex, "maxNumber"],
            message: "Maximum number must be at least the minimum number",
          });
        if (["DROPDOWN", "MULTI_SELECT", "RADIO"].includes(item.type) && !(item.options?.length))
          context.addIssue({
            code: "custom",
            path: ["sections", sectionIndex, "fields", fieldIndex, "options"],
            message: "Choice fields need at least one option",
          });
        if (item.type === "FILE" && item.allowedFileTypes.length === 0)
          context.addIssue({
            code: "custom",
            path: ["sections", sectionIndex, "fields", fieldIndex, "allowedFileTypes"],
            message: "File fields need at least one allowed MIME type",
          });
      });
    });
    value.sections.forEach((section, sectionIndex) => {
      section.fields.forEach((item, fieldIndex) => {
        if (item.conditionFieldKey && (!keys.has(item.conditionFieldKey) || item.conditionFieldKey === item.key))
          context.addIssue({
            code: "custom",
            path: ["sections", sectionIndex, "fields", fieldIndex, "conditionFieldKey"],
            message: "Condition must reference a different field in this form",
          });
      });
    });
  });
