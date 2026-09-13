import { requireApplicationAccess } from "@/lib/authz";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { submitApplication } from "@/lib/services/applications";
import { after } from "next/server";
import { deliverEmail } from "@/lib/services/email";
import { answersInput } from "@/lib/validation/api";
import { z } from "zod";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireApplicationAccess(id, "edit");
    await enforceRateLimit(`submit:${access.current.id}:${id}`, 5, 300);
    const body = await request.text();
    const input = body ? z.object({ answers: answersInput }).parse(JSON.parse(body)) : undefined;
    const result = await submitApplication(id, access.current.id, input?.answers);
    if (result.emailDeliveryId)
      after(async () => {
        try {
          await deliverEmail(result.emailDeliveryId!);
        } catch (error) {
          console.error("[application receipt delivery failed]", { deliveryId: result.emailDeliveryId, error });
        }
      });
    return Response.json({ application: result.application });
  } catch (error) {
    return safeError(error, { route: "/api/applications/[id]/submit", method: "POST" });
  }
}
