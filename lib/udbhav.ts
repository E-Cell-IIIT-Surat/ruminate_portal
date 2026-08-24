import { db } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/errors";
import { requireUser, userAuthorization } from "@/lib/authz";

export const udbhavStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "ON_HOLD",
  "ACTION_NEEDED",
  "PITCH_SCHEDULED",
  "ACCEPTED",
  "REJECTED",
] as const;

export type UdbhavStatus = (typeof udbhavStatuses)[number];

export const udbhavScoreFields = [
  ["creativity", "Creativity"],
  ["problemUnderstanding", "Problem understanding"],
  ["innovation", "Innovation"],
  ["execution", "Execution"],
  ["feasibility", "Feasibility"],
  ["scalability", "Scalability"],
  ["impact", "Impact"],
  ["sustainability", "Sustainability"],
  ["presentation", "Presentation"],
  ["completeness", "Completeness"],
] as const;

export function defaultUdbhavWindow(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const opensAt = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const closesAt = new Date(Date.UTC(year, month - 1, 3, 23, 59, 59));
  return { year, month, opensAt, closesAt };
}

export async function requireUdbhavAdmin() {
  const current = await requireUser();
  const authorization = await userAuthorization(current.id);
  const special = (process.env.UDHBHAV_ADMIN_EMAILS ?? "nishad.deshpande@iiitsurat.ac.in")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!authorization.isSuperAdmin && !special.includes((current.email ?? "").toLowerCase())) throw forbidden();
  return { current, authorization };
}

export async function requireUdbhavViewer(submissionId: string) {
  const current = await requireUser();
  const authorization = await userAuthorization(current.id);
  const submission = await db.udbhavSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) throw unauthorized();
  const special = (process.env.UDHBHAV_ADMIN_EMAILS ?? "nishad.deshpande@iiitsurat.ac.in")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = authorization.isSuperAdmin || special.includes((current.email ?? "").toLowerCase());
  const isReviewer = authorization.roles.has("REVIEWER") || authorization.roles.has("FACULTY_REVIEWER");
  const assignment = isReviewer
    ? await db.udbhavReviewerAssignment.findUnique({
        where: { submissionId_reviewerId: { submissionId, reviewerId: current.id } },
      })
    : null;
  if (submission.leaderId !== current.id && !isAdmin && !assignment) throw forbidden();
  return { current, authorization, submission, isAdmin, isReviewer, assignment };
}

export function statusMessage(status: UdbhavStatus) {
  const messages: Record<UdbhavStatus, string> = {
    DRAFT: "Your UdbhAV idea is saved as a draft.",
    SUBMITTED: "Your UdbhAV idea has been submitted successfully.",
    UNDER_REVIEW: "Your UdbhAV idea is now under review by the evaluation panel.",
    IN_PROGRESS: "Your UdbhAV idea has moved into the implementation stage.",
    ON_HOLD: "Your UdbhAV idea is temporarily on hold. Check your private update for details.",
    ACTION_NEEDED: "Your UdbhAV idea needs an action from your team. Sign in to view the request.",
    PITCH_SCHEDULED: "Your UdbhAV pitch has been scheduled. Check the portal for the latest details.",
    ACCEPTED: "Congratulations — your UdbhAV idea has been accepted.",
    REJECTED: "Your UdbhAV idea has reached a decision. Thank you for sharing your work.",
  };
  return messages[status];
}
