import { requireUser } from "@/lib/authz";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { submitEvaluation } from "@/lib/services/evaluations";
import { evaluationInput } from "@/lib/validation/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await enforceRateLimit(`review-submit:${user.id}:${id}`, 10, 300);
    const evaluation = await submitEvaluation(id, user.id, evaluationInput.parse(await request.json()));
    return Response.json({ evaluation });
  } catch (error) {
    return safeError(error);
  }
}
