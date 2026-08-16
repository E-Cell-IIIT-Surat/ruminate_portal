import { timingSafeEqual } from "node:crypto";
import { emailEnv } from "@/lib/env";
import { safeError, unauthorized } from "@/lib/errors";
import { processEmailQueue } from "@/lib/services/email";

function validSecret(request: Request) {
  const expected = emailEnv().CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export async function POST(request: Request) {
  try {
    if (!validSecret(request)) throw unauthorized();
    return Response.json(await processEmailQueue());
  } catch (error) {
    return safeError(error);
  }
}
