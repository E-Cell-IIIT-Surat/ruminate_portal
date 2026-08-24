import { randomUUID } from "node:crypto";
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";
import { r2Env } from "@/lib/env";
import { requireUdbhavViewer } from "@/lib/udbhav";
import { safeError, AppError } from "@/lib/errors";

const allowedTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const maxBytes = 5 * 1024 * 1024;

function storage() {
  const config = r2Env();
  return {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.R2_ACCESS_KEY_ID, secretAccessKey: config.R2_SECRET_ACCESS_KEY },
    }),
    bucket: config.R2_PRIVATE_BUCKET,
  };
}

function safeName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(-120) || "supporting-document"
  );
}

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
    if (file.size <= 0 || file.size > maxBytes) throw new AppError("The document must be smaller than 5 MB", 422);
    if (!allowedTypes.has(file.type)) throw new AppError("Only PDF, Word, PowerPoint, or Excel files are allowed", 422);
    const { client, bucket } = storage();
    const key = `udbhav/${id}/${randomUUID()}-${safeName(file.name)}`;
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
