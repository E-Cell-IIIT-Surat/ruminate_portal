import { requireUser } from "@/lib/authz";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { startApplication } from "@/lib/services/applications";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await enforceRateLimit(`application:start:${user.id}`, 10, 60);
    const application = await startApplication(id, user.id);
    return Response.json({ application }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
