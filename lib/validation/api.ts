import { z } from "zod";

export const answersInput = z.record(z.string(), z.unknown());

export const uploadInput = z.object({
  applicationId: z.string().cuid(),
  fieldId: z.string().cuid(),
  filename: z.string().min(1).max(180),
  mimeType: z.string().min(3).max(120),
  size: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});

export const evaluationInput = z.object({
  scores: z
    .array(
      z.object({ criterionId: z.string().cuid(), score: z.number().min(0), comment: z.string().max(2000).optional() }),
    )
    .min(1),
  internalNotes: z.string().max(10000).optional(),
  feedback: z.string().max(10000).optional(),
});

export const statusInput = z.object({
  status: z.enum([
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "CHANGES_REQUESTED",
    "SHORTLISTED",
    "SELECTED",
    "REJECTED",
    "APPROVED",
    "WAITLISTED",
    "CONFIRMED",
    "WITHDRAWN",
    "ARCHIVED",
  ]),
  reason: z.string().min(3).max(2000),
});
