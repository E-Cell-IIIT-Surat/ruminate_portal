import { AppError } from "@/lib/errors";

export type RegistrationState = "UPCOMING" | "OPEN" | "CLOSED" | "UNAVAILABLE";

export function registrationState(
  program: { status: string; registrationOpenAt: Date | null; registrationCloseAt: Date | null },
  now = new Date(),
): RegistrationState {
  if (!["PUBLISHED", "REGISTRATION_OPEN"].includes(program.status)) return "UNAVAILABLE";
  if (program.registrationOpenAt && now < program.registrationOpenAt) return "UPCOMING";
  if (program.registrationCloseAt && now > program.registrationCloseAt) return "CLOSED";
  return "OPEN";
}

export function assertDeadline(
  program: { status: string; registrationOpenAt: Date | null; registrationCloseAt: Date | null },
  now = new Date(),
) {
  const state = registrationState(program, now);
  if (state !== "OPEN")
    throw new AppError(
      state === "CLOSED" ? "Registration has closed" : "Registration is not open",
      409,
      "REGISTRATION_UNAVAILABLE",
    );
}

export function assertTeamSize(mode: string, min: number, max: number, memberCount: number) {
  if (mode === "INDIVIDUAL" && memberCount > 1)
    throw new AppError("This program accepts individual applications only", 422, "INVALID_TEAM_SIZE");
  if (mode === "TEAM" && (memberCount < min || memberCount > max)) {
    throw new AppError(`Team size must be between ${min} and ${max}`, 422, "INVALID_TEAM_SIZE");
  }
  if (mode === "BOTH" && memberCount > 1 && (memberCount < min || memberCount > max)) {
    throw new AppError(`Team size must be between ${min} and ${max}`, 422, "INVALID_TEAM_SIZE");
  }
}

export function canEditSubmitted(
  program: { allowsEditAfterSubmit: boolean; editDeadline: Date | null },
  overrideUntil: Date | null,
  now = new Date(),
) {
  if (overrideUntil && now <= overrideUntil) return true;
  return program.allowsEditAfterSubmit && (!program.editDeadline || now <= program.editDeadline);
}

export function submissionStatus(input: {
  requiresReview: boolean;
  capacity: number | null;
  currentCount: number;
  waitlistEnabled: boolean;
}) {
  const atCapacity = input.capacity !== null && input.currentCount >= input.capacity;
  if (atCapacity && !input.waitlistEnabled)
    throw new AppError("This program has reached capacity", 409, "CAPACITY_REACHED");
  if (atCapacity) return "WAITLISTED" as const;
  return input.requiresReview ? ("SUBMITTED" as const) : ("CONFIRMED" as const);
}
