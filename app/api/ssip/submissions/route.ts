import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppError, safeError, unauthorized } from "@/lib/errors";
import { hasDatabaseConfig } from "@/lib/env";
import { queueAndDeliverEmail } from "@/lib/services/email";

const submissionSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(200),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9()\-\s]{7,20}$/, "Enter a valid phone number"),
  institution: z.string().trim().max(200).optional().or(z.literal("")),
  degree: z.string().trim().max(120).optional().or(z.literal("")),
  studyYear: z.string().trim().max(40).optional().or(z.literal("")),
  teamName: z.string().trim().max(120).optional().or(z.literal("")),
  title: z.string().trim().min(5, "Add a clear idea title").max(200),
  problemStatement: z.string().trim().min(20, "Describe the problem in more detail").max(6000),
  solution: z.string().trim().min(20, "Describe your proposed solution").max(10000),
  technology: z.string().trim().min(3, "Mention the technology or approach").max(4000),
  estimatedBudget: z.coerce.number().finite().min(0).max(999999999).optional(),
  impact: z.string().trim().min(10, "Describe the expected impact").max(6000),
});

function isSubmissionWindowOpen(settings: { isOpen: boolean; opensAt: Date | null; closesAt: Date | null } | null) {
  if (!settings?.isOpen) return false;
  const now = Date.now();
  if (settings.opensAt && now < settings.opensAt.getTime()) return false;
  if (settings.closesAt && now > settings.closesAt.getTime()) return false;
  return true;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw unauthorized();
    const submissions = hasDatabaseConfig()
      ? await db.sSIPSubmission.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, referenceId: true, title: true, status: true, createdAt: true, updatedAt: true },
        })
      : [];
    return Response.json({ submissions });
  } catch (error) {
    return safeError(error, { route: "/api/ssip/submissions", method: "GET" });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw unauthorized();
    const settings = await db.sSIPSettings.findUnique({ where: { id: "default" } });
    if (!isSubmissionWindowOpen(settings))
      throw new AppError("SSIP submissions are currently closed", 409, "SSIP_CLOSED");

    const input = submissionSchema.parse(await request.json());
    const referenceId = `SSIP-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const submission = await db.sSIPSubmission.create({
      data: {
        referenceId,
        userId: session.user.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        institution: input.institution || null,
        degree: input.degree || null,
        studyYear: input.studyYear || null,
        teamName: input.teamName || null,
        title: input.title,
        problemStatement: input.problemStatement,
        solution: input.solution,
        technology: input.technology,
        estimatedBudget: input.estimatedBudget ?? null,
        impact: input.impact,
      },
    });

    await Promise.allSettled([
      db.notification.create({
        data: {
          userId: session.user.id,
          type: "APPLICATION",
          title: "SSIP idea submitted",
          body: `Your idea “${input.title}” was received. Reference ${referenceId}.`,
          href: "/ssip",
        },
      }),
      queueAndDeliverEmail({
        recipientEmail: input.email,
        templateKey: "ssip-submission-confirmation",
        subject: `SSIP submission received · ${referenceId}`,
        textBody: `Hi ${input.name},\n\nWe received your SSIP idea “${input.title}”.\n\nReference: ${referenceId}\nStatus: Submitted\n\nYou can follow updates from the Ruminate portal. Our reviewers may contact you if more information is needed.\n\nWarm regards,\nRuminate · E-Cell IIIT Surat`,
      }),
    ]);
    return Response.json({ submission }, { status: 201 });
  } catch (error) {
    return safeError(error, { route: "/api/ssip/submissions", method: "POST" });
  }
}
