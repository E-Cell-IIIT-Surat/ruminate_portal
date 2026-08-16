import { randomUUID } from "node:crypto";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError, notFound } from "@/lib/errors";

function client() {
  const config = env();
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.R2_ACCESS_KEY_ID, secretAccessKey: config.R2_SECRET_ACCESS_KEY },
  });
}

function safeName(filename: string) {
  return filename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
}

export async function createUploadUrl(
  applicationId: string,
  fieldId: string,
  filename: string,
  mimeType: string,
  size: number,
) {
  const field = await db.formField.findUnique({ where: { id: fieldId } });
  if (!field || field.type !== "FILE") throw notFound("File field");
  if (field.maxFileSizeBytes && size > field.maxFileSizeBytes) throw new AppError("File is too large", 422);
  if (field.allowedFileTypes.length && !field.allowedFileTypes.includes(mimeType))
    throw new AppError("File type is not allowed", 422);
  const objectKey = `applications/${applicationId}/${fieldId}/${randomUUID()}-${safeName(filename)}`;
  const command = new PutObjectCommand({
    Bucket: env().R2_PRIVATE_BUCKET,
    Key: objectKey,
    ContentType: mimeType,
    ContentLength: size,
    Metadata: { application: applicationId, field: fieldId },
  });
  return { objectKey, uploadUrl: await getSignedUrl(client(), command, { expiresIn: 300 }), expiresIn: 300 };
}

export async function finalizeUpload(input: {
  applicationId: string;
  fieldId: string;
  objectKey: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedById: string;
}) {
  const prefix = `applications/${input.applicationId}/${input.fieldId}/`;
  if (!input.objectKey.startsWith(prefix) || input.objectKey.includes(".."))
    throw new AppError("Invalid object key", 422);
  const head = await client().send(new HeadObjectCommand({ Bucket: env().R2_PRIVATE_BUCKET, Key: input.objectKey }));
  if (head.ContentLength !== input.size || head.ContentType !== input.mimeType)
    throw new AppError("Uploaded file metadata does not match", 422);
  return db.applicationFile.create({
    data: {
      applicationId: input.applicationId,
      fieldId: input.fieldId,
      objectKey: input.objectKey,
      originalFilename: safeName(input.filename),
      mimeType: input.mimeType,
      size: input.size,
      uploadedById: input.uploadedById,
    },
  });
}

export async function createDownloadUrl(fileId: string) {
  const file = await db.applicationFile.findUnique({ where: { id: fileId, deletedAt: null } });
  if (!file) throw notFound("File");
  const command = new GetObjectCommand({
    Bucket: env().R2_PRIVATE_BUCKET,
    Key: file.objectKey,
    ResponseContentDisposition: `attachment; filename="${safeName(file.originalFilename)}"`,
  });
  return { url: await getSignedUrl(client(), command, { expiresIn: 120 }), expiresIn: 120 };
}
