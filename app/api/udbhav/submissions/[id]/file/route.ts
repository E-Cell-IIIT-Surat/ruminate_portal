import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";
import { requireUdbhavViewer } from "@/lib/udbhav";
import { safeError, AppError } from "@/lib/errors";
import { udbhavStorage as storage, safeName, validateUdbhavDocument } from "@/lib/services/udbhav-files";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { submission } = await requireUdbhavViewer(id);
    if (!submission.supportingFileKey) return Response.json({ file: null });
    const { client, bucket } = storage();
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: submission.supportingFileKey }),
      { expiresIn: 120 },
    );
    return Response.json({ file: { url, key: submission.supportingFileKey } });
  } catch (error) {
    return safeError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { submission, isAdmin, current } = await requireUdbhavViewer(id);
    if (submission.leaderId !== current.id && !isAdmin)
      throw new AppError("Only the team leader can upload a document", 403);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Choose a supporting document", 422);
    try {
      validateUdbhavDocument(file);
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : "Only PDF or DOCX files are allowed", 422);
    }
    const { client, bucket } = storage();
    const key = `udbhav/${id}/${crypto.randomUUID()}-${safeName(file.name)}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: new Uint8Array(await file.arrayBuffer()),
        ContentType: file.type,
        ContentLength: file.size,
        Metadata: { submission: id, uploadedBy: current.id },
      }),
    );
    await db.udbhavSubmission.update({ where: { id }, data: { supportingFileKey: key } });
    return Response.json({ file: { key, name: file.name, size: file.size } }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}
