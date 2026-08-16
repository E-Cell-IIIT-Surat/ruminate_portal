import type { ApplicationStatus } from "@prisma/client";

const privateDecisionStatuses = new Set<ApplicationStatus>(["SELECTED", "REJECTED", "APPROVED", "CONFIRMED"]);

export function participantVisibleStatus(
  status: ApplicationStatus,
  resultsPublishedAt: Date | null,
): ApplicationStatus {
  if (!resultsPublishedAt && privateDecisionStatuses.has(status)) return "UNDER_REVIEW";
  return status;
}

export function isPrivateDecision(status: ApplicationStatus) {
  return privateDecisionStatuses.has(status);
}

export const applicationStatusTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN", "ARCHIVED"],
  SUBMITTED: ["UNDER_REVIEW", "CHANGES_REQUESTED", "SHORTLISTED", "REJECTED", "WAITLISTED", "WITHDRAWN", "ARCHIVED"],
  UNDER_REVIEW: ["CHANGES_REQUESTED", "SHORTLISTED", "SELECTED", "REJECTED", "APPROVED", "WAITLISTED", "ARCHIVED"],
  CHANGES_REQUESTED: ["SUBMITTED", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  SHORTLISTED: ["UNDER_REVIEW", "SELECTED", "REJECTED", "WAITLISTED", "ARCHIVED"],
  SELECTED: ["CONFIRMED", "REJECTED", "ARCHIVED"],
  REJECTED: ["UNDER_REVIEW", "ARCHIVED"],
  APPROVED: ["CONFIRMED", "ARCHIVED"],
  WAITLISTED: ["CONFIRMED", "REJECTED", "WITHDRAWN", "ARCHIVED"],
  CONFIRMED: ["WITHDRAWN", "ARCHIVED"],
  WITHDRAWN: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus) {
  return applicationStatusTransitions[from].includes(to);
}
