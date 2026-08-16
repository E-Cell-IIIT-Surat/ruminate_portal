import { requireApplicationAccess } from "@/lib/authz";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createUploadUrl } from "@/lib/services/files";
import { uploadInput } from "@/lib/validation/api";

export async function POST(request: Request) {
  try {
    const input = uploadInput.parse(await request.json());
    const access = await requireApplicationAccess(input.applicationId, "edit");
    await enforceRateLimit(`file-url:${access.current.id}`, 20, 60);
    return Response.json(
      await createUploadUrl(input.applicationId, input.fieldId, input.filename, input.mimeType, input.size),
    );
  } catch (error) {
    return safeError(error);
  }
}
