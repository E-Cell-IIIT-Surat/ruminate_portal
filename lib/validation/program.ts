import { z } from "zod";

export const programInput = z
  .object({
    name: z.string().min(3).max(120),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    shortDescription: z.string().min(10).max(220),
    description: z.string().min(20).max(20000),
    type: z.enum([
      "EVENT",
      "WORKSHOP",
      "INDUSTRY_VISIT",
      "HACKATHON",
      "STARTUP_COMPETITION",
      "SSIP",
      "MENTORSHIP",
      "PITCH_EVENT",
      "OTHER",
    ]),
    visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PUBLIC"),
    participationMode: z.enum(["INDIVIDUAL", "TEAM", "BOTH"]).default("INDIVIDUAL"),
    registrationOpenAt: z.coerce.date().nullable().optional(),
    registrationCloseAt: z.coerce.date().nullable().optional(),
    startAt: z.coerce.date().nullable().optional(),
    endAt: z.coerce.date().nullable().optional(),
    capacity: z.coerce.number().int().positive().nullable().optional(),
    waitlistEnabled: z.boolean().default(false),
    teamMinSize: z.coerce.number().int().min(1).default(1),
    teamMaxSize: z.coerce.number().int().min(1).default(1),
    requiresReview: z.boolean().default(false),
    allowsDrafts: z.boolean().default(true),
    allowsEditAfterSubmit: z.boolean().default(false),
    allowsWithdrawal: z.boolean().default(true),
    editDeadline: z.coerce.date().nullable().optional(),
    requiresAuth: z.boolean().default(true),
    blindReview: z.boolean().default(false),
    allowedEmailDomains: z.array(z.string().min(3)).default([]),
  })
  .superRefine((value, context) => {
    if (
      value.registrationOpenAt &&
      value.registrationCloseAt &&
      value.registrationOpenAt >= value.registrationCloseAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["registrationCloseAt"],
        message: "Closing time must be after opening time",
      });
    }
    if (value.teamMinSize > value.teamMaxSize)
      context.addIssue({
        code: "custom",
        path: ["teamMaxSize"],
        message: "Maximum team size must be at least the minimum",
      });
    if (value.editDeadline && value.registrationCloseAt && value.editDeadline < value.registrationCloseAt)
      context.addIssue({
        code: "custom",
        path: ["editDeadline"],
        message: "The edit deadline cannot be before registration closes",
      });
  });
