import { db } from "@/lib/db";
import { superAdminEmails } from "@/lib/env";
import { queueAndDeliverEmail } from "@/lib/services/email";

async function notifyUser(input: {
  userId: string;
  email: string;
  title: string;
  body: string;
  href?: string;
  templateKey: string;
  subject: string;
}) {
  await db.notification.create({
    data: {
      userId: input.userId,
      type: "SYSTEM",
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
  await queueAndDeliverEmail({
    recipientEmail: input.email,
    templateKey: input.templateKey,
    subject: input.subject,
    textBody: `${input.title}\n\n${input.body}${input.href ? `\n\nOpen: ${input.href}` : ""}`,
  });
}

export async function notifyAdminsAboutTeamRequest(teamId: string, teamName: string, leaderLabel: string) {
  const admins = await db.user.findMany({
    where: { email: { in: [...superAdminEmails()] }, archivedAt: null },
    select: { id: true, email: true },
  });
  await Promise.all(
    admins.map((admin) =>
      notifyUser({
        userId: admin.id,
        email: admin.email,
        title: "New team approval request",
        body: `${leaderLabel} requested to publish the team “${teamName}”. Review it before it appears publicly.`,
        href: `/admin/teams#team-${teamId}`,
        templateKey: "team.request.admin",
        subject: "New Ruminate team approval request",
      }),
    ),
  );
}

export async function notifyTeamLeaderAboutJoinRequest(input: {
  teamId: string;
  teamName: string;
  leaderId: string;
  leaderEmail: string;
  requesterLabel: string;
}) {
  await notifyUser({
    userId: input.leaderId,
    email: input.leaderEmail,
    title: "New team join request",
    body: `${input.requesterLabel} wants to join “${input.teamName}”. Accept or reject the request from your Teams page.`,
    href: `/teams#team-${input.teamId}-requests`,
    templateKey: "team.join.request",
    subject: "New Ruminate team join request",
  });
}

export async function notifyTeamApprovalDecision(input: {
  teamId: string;
  teamName: string;
  leaderId: string;
  leaderEmail: string;
  approved: boolean;
}) {
  await notifyUser({
    userId: input.leaderId,
    email: input.leaderEmail,
    title: input.approved ? "Your team is live" : "Your team request was not approved",
    body: input.approved
      ? `“${input.teamName}” is now visible in the team directory. Students can request to join it.`
      : `“${input.teamName}” is not public right now. You can refine the details and request again later.`,
    href: input.approved ? `/teams#team-${input.teamId}` : "/teams",
    templateKey: input.approved ? "team.request.approved" : "team.request.rejected",
    subject: input.approved ? "Your Ruminate team is live" : "Ruminate team request update",
  });
}

export async function notifyJoinRequestDecision(input: {
  teamId: string;
  teamName: string;
  requesterId: string;
  requesterEmail: string;
  accepted: boolean;
}) {
  await notifyUser({
    userId: input.requesterId,
    email: input.requesterEmail,
    title: input.accepted ? "Team join request accepted" : "Team join request update",
    body: input.accepted
      ? `You are now a member of “${input.teamName}”.`
      : `Your request to join “${input.teamName}” was not accepted this time.`,
    href: `/teams#team-${input.teamId}`,
    templateKey: input.accepted ? "team.join.accepted" : "team.join.rejected",
    subject: input.accepted ? "You joined a Ruminate team" : "Ruminate team join request update",
  });
}
