import { requireApplicationAccess } from "@/lib/authz";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { saveDraft } from "@/lib/services/applications";
import { answersInput } from "@/lib/validation/api";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireApplicationAccess(id, "edit");
    await enforceRateLimit(`draft:${access.current.id}:${id}`, 30, 60);
    const answers = answersInput.parse(await request.json());
    const result = await saveDraft(id, access.current.id, answers);
    return Response.json(result);
  } catch (error) {
    return safeError(error);
  }
}
