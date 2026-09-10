import { db } from "@/lib/db";
import { emailEnv } from "@/lib/env";
import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";

export async function queueEmail(input: {
  recipientEmail: string;
  templateKey: string;
  subject: string;
  textBody: string;
  programId?: string | null;
}) {
  return db.emailDelivery.create({ data: input });
}

/** Queue a message and make a best-effort delivery immediately.
 *
 * Queueing remains the source of truth (and is still processed by the cron
 * endpoint), while the immediate attempt gives users timely feedback during
 * interactive actions. Provider failures are intentionally non-fatal.
 */
export async function queueAndDeliverEmail(input: {
  recipientEmail: string;
  templateKey: string;
  subject: string;
  textBody: string;
  programId?: string | null;
}) {
  let queued;
  try {
    queued = await queueEmail(input);
  } catch (error) {
    // Email is an auxiliary notification. A database/provider outage must not
    // make the user-facing action (approval, signup, status update, etc.) fail.
    console.error("[email queue failed]", {
      recipientEmail: input.recipientEmail,
      templateKey: input.templateKey,
      error,
    });
    return null;
  }
  try {
    await deliverEmail(queued.id);
  } catch (error) {
    console.error("[email immediate delivery failed]", { deliveryId: queued.id, error });
  }
  return queued;
}

/**
 * Send the onboarding message once for each account. The conditional update
 * is the idempotency guard used by both Auth.js createUser and signIn events,
 * so repeated logins never create duplicate welcome messages.
 */
export async function sendWelcomeEmail(user: { id?: string | null; email?: string | null; name?: string | null }) {
  if (!user.id || !user.email) return false;
  const userId = user.id;
  const userEmail = user.email;
  try {
    const firstName = user.name?.trim().split(/\s+/)[0] || "there";
    const queued = await db.$transaction(async (tx) => {
      const claimed = await tx.user.updateMany({
        where: { id: userId, welcomeEmailSentAt: null },
        data: { welcomeEmailSentAt: new Date() },
      });
      if (claimed.count !== 1) return null;

      const queued = await tx.emailDelivery.create({
        data: {
          recipientEmail: userEmail,
          templateKey: "welcome",
          subject: "Welcome to Ruminate · E-Cell IIIT Surat",
          textBody: `Hi ${firstName},\n\nWelcome to Ruminate, the digital home for entrepreneurship at E-Cell IIIT Surat.\n\nYou can now discover programmes, build teams, submit applications, follow reviews, and receive important updates in one secure portal. Start by visiting your dashboard and exploring the currently open opportunities.\n\nIf you need help, reply to this email or use the Feedback button in the portal.\n\nWarm regards,\nRuminate · E-Cell IIIT Surat`,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "Welcome to Ruminate",
          body: "Your workspace is ready. Explore programmes, teams, and upcoming workshops.",
          href: "/dashboard",
        },
      });
      return queued;
    });
    if (!queued) return false;
    await deliverEmail(queued.id).catch((error) => {
      console.error("[email welcome delivery failed]", { deliveryId: queued.id, error });
    });
    return true;
  } catch (error) {
    console.error("[email welcome failed]", { userId: user.id, recipientEmail: user.email, error });
    return false;
  }
}

export async function deliverEmail(id: string) {
  const claimId = randomUUID();
  const now = new Date();
  const claimed = await db.emailDelivery.updateMany({
    where: {
      id,
      attempts: { lt: 5 },
      OR: [
        { status: "QUEUED", OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        { status: "FAILED", OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        // Recover a worker that was interrupted after claiming.
        { status: "PROCESSING", claimedAt: { lt: new Date(now.getTime() - 2 * 60 * 1000) } },
      ],
    },
    data: {
      status: "PROCESSING",
      claimedAt: now,
      claimedBy: claimId,
      attempts: { increment: 1 },
      lastAttemptAt: now,
      errorCode: null,
    },
  });
  if (claimed.count !== 1) return null;
  const delivery = await db.emailDelivery.findFirst({ where: { id, status: "PROCESSING", claimedBy: claimId } });
  if (!delivery) return null;
  let config;
  try {
    config = emailEnv();
  } catch (error) {
    await db.emailDelivery.update({
      where: { id, claimedBy: claimId },
      data: {
        status: "FAILED",
        errorCode: "INVALID_EMAIL_CONFIGURATION",
        nextAttemptAt: null,
        claimedAt: null,
        claimedBy: null,
      },
    });
    throw error;
  }

  if (config.EMAIL_PROVIDER === "console") {
    console.info(`[email suppressed] ${delivery.templateKey} -> ${delivery.recipientEmail}`);
    return db.emailDelivery.update({
      where: { id, claimedBy: claimId },
      data: { status: "SUPPRESSED", claimedAt: null, claimedBy: null },
    });
  }

  try {
    if (config.EMAIL_PROVIDER === "smtp") {
      const fromAddress = config.EMAIL_FROM.match(/<([^>]+)>/)?.[1]?.trim() ?? config.EMAIL_FROM.trim();
      const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
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
        data: {
          status: "SENT",
          providerId: result.messageId,
          sentAt: new Date(),
          claimedAt: null,
          claimedBy: null,
          nextAttemptAt: null,
        },
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      signal: AbortSignal.timeout(20_000),
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
      data: {
        status: "SENT",
        providerId: result.id,
        sentAt: new Date(),
        claimedAt: null,
        claimedBy: null,
        nextAttemptAt: null,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 120) : "EMAIL_PROVIDER_ERROR";
    console.error(`[email ${config.EMAIL_PROVIDER} delivery failed]`, {
      deliveryId: id,
      recipientEmail: delivery.recipientEmail,
      templateKey: delivery.templateKey,
      error,
    });
    const retryAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 2 ** delivery.attempts * 60 * 1000));
    await db.emailDelivery.update({
      where: { id, claimedBy: claimId },
      data: { status: "FAILED", errorCode: code, nextAttemptAt: retryAt, claimedAt: null, claimedBy: null },
    });
    return null;
  }
}

export async function processEmailQueue(limit = 20) {
  const pending = await db.emailDelivery.findMany({
    where: {
      status: { in: ["QUEUED", "FAILED"] },
      attempts: { lt: 5 },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 50),
    select: { id: true },
  });
  const results = [];
  for (const item of pending) results.push(await deliverEmail(item.id));
  return { processed: pending.length, delivered: results.filter(Boolean).length };
}
