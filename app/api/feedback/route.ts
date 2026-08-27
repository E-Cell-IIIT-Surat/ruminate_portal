import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { queueEmail } from "@/lib/services/email";
import { superAdminEmails } from "@/lib/env";

const feedbackSchema = z.object({
  type: z.enum(["BUG", "SUGGESTION", "OTHER"]),
  message: z.string().trim().min(10, "Please add at least 10 characters").max(4000),
  pagePath: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const input = feedbackSchema.parse(await request.json());
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const email = session?.user?.email ?? null;
    const feedback = await db.feedback.create({
      data: { ...input, userId, email },
      select: { id: true, type: true, createdAt: true },
    });

    const admins = [...superAdminEmails()];
    const adminUsers = await db.user.findMany({ where: { email: { in: admins } }, select: { id: true, email: true } });
    await Promise.allSettled([
      db.notification.createMany({
        data: adminUsers.map((admin) => ({
          userId: admin.id,
          type: "SYSTEM" as const,
          title: `New ${input.type.toLowerCase()} feedback`,
          body: `${email ?? "An anonymous visitor"} sent feedback${input.pagePath ? ` from ${input.pagePath}` : ""}.`,
          href: "/admin/feedback",
        })),
      }),
      ...admins.map((recipientEmail) =>
        queueEmail({
          recipientEmail,
          templateKey: "feedback-received",
          subject: `[Ruminate feedback] ${input.type}`,
          textBody: `${email ?? "Anonymous visitor"} submitted ${input.type.toLowerCase()} feedback${input.pagePath ? ` from ${input.pagePath}` : ""}.\n\n${input.message}`,
        }),
      ),
    ]);

    return Response.json({ feedback }, { status: 201 });
  } catch (error) {
    return safeError(error, { route: "/api/feedback", method: "POST" });
  }
}
