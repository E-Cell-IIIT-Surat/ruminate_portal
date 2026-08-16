import { requireApplicationAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError, safeError } from "@/lib/errors";
import { transitionApplication } from "@/lib/services/status";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireApplicationAccess(id, "read");
    if (!access.owns) throw new AppError("Only the application owner can withdraw", 403, "FORBIDDEN");
    const application = await db.application.findUniqueOrThrow({ where: { id }, include: { program: true } });
    if (!application.program.allowsWithdrawal)
      throw new AppError("Withdrawal is disabled for this program", 409, "WITHDRAWAL_DISABLED");
    const updated = await transitionApplication(id, "WITHDRAWN", access.current.id, "Withdrawn by participant");
    return Response.json({ application: updated });
  } catch (error) {
    return safeError(error);
  }
}
