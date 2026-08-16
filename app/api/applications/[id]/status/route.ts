import { requireApplicationAccess, requirePermission } from "@/lib/authz";
import { safeError } from "@/lib/errors";
import { transitionApplication } from "@/lib/services/status";
import { statusInput } from "@/lib/validation/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireApplicationAccess(id);
    const actor = await requirePermission("application:update-status", access.application.programId);
    const input = statusInput.parse(await request.json());
    const application = await transitionApplication(
      id,
      input.status,
      actor.id,
      input.reason,
      actor.isSuperAdmin,
      input.stageId,
    );
    return Response.json({ application });
  } catch (error) {
    return safeError(error);
  }
}
