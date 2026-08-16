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
  minLength: z.number().int().min(0).nullable().optional(),
  maxLength: z.number().int().positive().nullable().optional(),
  minNumber: z.number().nullable().optional(),
  maxNumber: z.number().nullable().optional(),
  options: z.array(z.string().min(1)).optional(),
  allowedFileTypes: z.array(z.string()).default([]),
  maxFileSizeBytes: z.number().int().positive().nullable().optional(),
  conditionFieldKey: z.string().nullable().optional(),
  conditionOperator: z.enum(["==", "!="]).nullable().optional(),
  conditionValue: z.unknown().optional(),
});

export const formBuilderInput = z.object({
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
});
