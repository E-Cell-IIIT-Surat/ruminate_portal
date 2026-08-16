import { requireApplicationAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createDownloadUrl } from "@/lib/services/files";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const file = await db.applicationFile.findUnique({ where: { id }, select: { applicationId: true } });
    if (!file) return Response.json({ error: "File not found" }, { status: 404 });
    const access = await requireApplicationAccess(file.applicationId, "read");
    await enforceRateLimit(`file-download:${access.current.id}`, 30, 60);
    return Response.json(await createDownloadUrl(id));
  } catch (error) {
    return safeError(error);
  }
}
