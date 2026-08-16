import { requireApplicationAccess } from "@/lib/authz";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { submitApplication } from "@/lib/services/applications";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireApplicationAccess(id, "edit");
    await enforceRateLimit(`submit:${access.current.id}:${id}`, 5, 300);
    const application = await submitApplication(id, access.current.id);
    return Response.json({ application });
  } catch (error) {
    return safeError(error);
  }
}
