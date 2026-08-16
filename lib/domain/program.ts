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
  if (state !== "OPEN") throw new Error(state === "CLOSED" ? "Registration has closed" : "Registration is not open");
}

export function assertTeamSize(mode: string, min: number, max: number, memberCount: number) {
  if (mode === "INDIVIDUAL" && memberCount > 1) throw new Error("This program accepts individual applications only");
  if (mode === "TEAM" && (memberCount < min || memberCount > max)) {
    throw new Error(`Team size must be between ${min} and ${max}`);
  }
  if (mode === "BOTH" && memberCount > 1 && (memberCount < min || memberCount > max)) {
    throw new Error(`Team size must be between ${min} and ${max}`);
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
