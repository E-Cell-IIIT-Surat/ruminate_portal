import { requireApplicationAccess } from "@/lib/authz";
import { safeError } from "@/lib/errors";
import { finalizeUpload } from "@/lib/services/files";
import { uploadInput } from "@/lib/validation/api";
import { z } from "zod";

const inputSchema = uploadInput.extend({ objectKey: z.string().min(20).max(500) });

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const access = await requireApplicationAccess(input.applicationId, "edit");
    const file = await finalizeUpload({ ...input, uploadedById: access.current.id });
    return Response.json({ file }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
