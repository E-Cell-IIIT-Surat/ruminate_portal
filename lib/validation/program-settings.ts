import { z } from "zod";

export const programSettingsInput = z.object({
  name: z.string().min(3).max(120).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  shortDescription: z.string().min(10).max(220).optional(),
  description: z.string().min(20).max(20000).optional(),
  eligibility: z.string().max(10000).nullable().optional(),
  instructions: z.string().max(10000).nullable().optional(),
  type: z
    .enum(["EVENT", "WORKSHOP", "INDUSTRY_VISIT", "HACKATHON", "STARTUP_COMPETITION", "SSIP", "MENTORSHIP", "PITCH_EVENT", "OTHER"])
    .optional(),
  status: z
    .enum(["DRAFT", "PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"])
    .optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
  registrationOpenAt: z.coerce.date().nullable().optional(),
  registrationCloseAt: z.coerce.date().nullable().optional(),
  startAt: z.coerce.date().nullable().optional(),
  endAt: z.coerce.date().nullable().optional(),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  waitlistEnabled: z.boolean().optional(),
  participationMode: z.enum(["INDIVIDUAL", "TEAM", "BOTH"]).optional(),
  teamMinSize: z.coerce.number().int().min(1).max(20).optional(),
  teamMaxSize: z.coerce.number().int().min(1).max(20).optional(),
  requiresReview: z.boolean().optional(),
  allowsDrafts: z.boolean().optional(),
  allowsEditAfterSubmit: z.boolean().optional(),
  allowsWithdrawal: z.boolean().optional(),
  editDeadline: z.coerce.date().nullable().optional(),
  allowedEmailDomains: z.array(z.string().min(3).max(120)).max(50).optional(),
  blindReview: z.boolean().optional(),
  requiresAuth: z.boolean().optional(),
});

export const programActionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish_results") }),
  z.object({
    action: z.literal("duplicate"),
    name: z.string().min(3).max(120),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }),
]);
