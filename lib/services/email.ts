import { db } from "@/lib/db";
import { emailEnv } from "@/lib/env";
import nodemailer from "nodemailer";

export async function queueEmail(input: {
  recipientEmail: string;
  templateKey: string;
  subject: string;
  textBody: string;
  programId?: string | null;
}) {
  return db.emailDelivery.create({ data: input });
}

export async function deliverEmail(id: string) {
  const delivery = await db.emailDelivery.findFirst({
    where: { id, status: { in: ["QUEUED", "FAILED"] }, attempts: { lt: 5 } },
  });
  if (!delivery) return null;
  const config = emailEnv();
  await db.emailDelivery.update({
    where: { id },
    data: { attempts: { increment: 1 }, lastAttemptAt: new Date(), errorCode: null },
  });

  if (config.EMAIL_PROVIDER === "console") {
    console.info(`[email suppressed] ${delivery.templateKey} -> ${delivery.recipientEmail}`);
    return db.emailDelivery.update({ where: { id }, data: { status: "SUPPRESSED" } });
  }

  try {
    if (config.EMAIL_PROVIDER === "smtp") {
      const fromAddress = config.EMAIL_FROM.match(/<([^>]+)>/)?.[1]?.trim() ?? config.EMAIL_FROM.trim();
      const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
      });
      const result = await transporter.sendMail({
        from: { name: "Ruminate · E-Cell IIIT Surat", address: fromAddress },
        to: delivery.recipientEmail,
        subject: delivery.subject,
        text: delivery.textBody,
      });
      return db.emailDelivery.update({
        where: { id },
        data: { status: "SENT", providerId: result.messageId, sentAt: new Date() },
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.EMAIL_FROM,
        to: [delivery.recipientEmail],
        subject: delivery.subject,
        text: delivery.textBody,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!response.ok) throw new Error(result.name ?? result.message ?? `HTTP_${response.status}`);
    return db.emailDelivery.update({
      where: { id },
      data: { status: "SENT", providerId: result.id, sentAt: new Date() },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 120) : "EMAIL_PROVIDER_ERROR";
    console.error(`[email ${config.EMAIL_PROVIDER} delivery failed]`, {
      deliveryId: id,
      recipientEmail: delivery.recipientEmail,
      templateKey: delivery.templateKey,
      error,
    });
    await db.emailDelivery.update({ where: { id }, data: { status: "FAILED", errorCode: code } });
    return null;
  }
}

export async function processEmailQueue(limit = 20) {
  const pending = await db.emailDelivery.findMany({
    where: { status: { in: ["QUEUED", "FAILED"] }, attempts: { lt: 5 } },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 50),
    select: { id: true },
  });
  const results = [];
  for (const item of pending) results.push(await deliverEmail(item.id));
  return { processed: pending.length, delivered: results.filter(Boolean).length };
}
