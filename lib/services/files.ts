import { randomUUID } from "node:crypto";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";
import { r2Env } from "@/lib/env";
import { AppError, notFound } from "@/lib/errors";

let r2Client: S3Client | undefined;

function client() {
  if (r2Client) return r2Client;
  const config = r2Env();
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.R2_ACCESS_KEY_ID, secretAccessKey: config.R2_SECRET_ACCESS_KEY },
  });
  return r2Client;
}

function safeName(filename: string) {
  return (
    filename
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(-120) || "upload"
  );
}

async function fileField(applicationId: string, fieldId: string) {
  const field = await db.formField.findFirst({
    where: {
      id: fieldId,
      type: "FILE",
      archivedAt: null,
      section: { formVersion: { applications: { some: { id: applicationId } } } },
    },
  });
  if (!field) throw notFound("File field");
  return field;
}

function matchesSignature(mimeType: string, bytes: Uint8Array) {
  const hex = [...bytes.slice(0, 12)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const text = new TextDecoder().decode(bytes.slice(0, 12));
  if (mimeType === "application/pdf") return text.startsWith("%PDF-");
  if (mimeType === "image/png") return hex.startsWith("89504e470d0a1a0a");
  if (["image/jpeg", "image/jpg"].includes(mimeType)) return hex.startsWith("ffd8ff");
  if (mimeType === "image/gif") return text.startsWith("GIF87a") || text.startsWith("GIF89a");
  if (mimeType === "image/webp") return text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
  if (
    [
      "application/zip",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ].includes(mimeType)
  )
    return hex.startsWith("504b0304") || hex.startsWith("504b0506") || hex.startsWith("504b0708");
  return ["text/plain", "text/csv"].includes(mimeType);
}

export async function createUploadUrl(
  applicationId: string,
  fieldId: string,
  filename: string,
  mimeType: string,
  size: number,
) {
  const field = await fileField(applicationId, fieldId);
  if (field.maxFileSizeBytes && size > field.maxFileSizeBytes) throw new AppError("File is too large", 422);
  if (field.allowedFileTypes.length && !field.allowedFileTypes.includes(mimeType))
    throw new AppError("File type is not allowed", 422);
  const objectKey = `applications/${applicationId}/${fieldId}/${randomUUID()}-${safeName(filename)}`;
  const command = new PutObjectCommand({
    Bucket: r2Env().R2_PRIVATE_BUCKET,
    Key: objectKey,
    ContentType: mimeType,
    ContentLength: size,
    Metadata: { application: applicationId, field: fieldId },
  });
  return {
    objectKey,
    uploadUrl: await getSignedUrl(client(), command, { expiresIn: 300 }),
    requiredHeaders: {
      "content-type": mimeType,
      "x-amz-meta-application": applicationId,
      "x-amz-meta-field": fieldId,
    },
    expiresIn: 300,
  };
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
  const field = await fileField(input.applicationId, input.fieldId);
  if (field.maxFileSizeBytes && input.size > field.maxFileSizeBytes) throw new AppError("File is too large", 422);
  if (field.allowedFileTypes.length && !field.allowedFileTypes.includes(input.mimeType))
    throw new AppError("File type is not allowed", 422);
  const prefix = `applications/${input.applicationId}/${input.fieldId}/`;
  if (!input.objectKey.startsWith(prefix) || input.objectKey.includes(".."))
    throw new AppError("Invalid object key", 422);
  const head = await client().send(new HeadObjectCommand({ Bucket: r2Env().R2_PRIVATE_BUCKET, Key: input.objectKey }));
  if (
    head.ContentLength !== input.size ||
    head.ContentType !== input.mimeType ||
    head.Metadata?.application !== input.applicationId ||
    head.Metadata?.field !== input.fieldId
  )
    throw new AppError("Uploaded file metadata does not match", 422);
  const object = await client().send(
    new GetObjectCommand({ Bucket: r2Env().R2_PRIVATE_BUCKET, Key: input.objectKey, Range: "bytes=0-31" }),
  );
  const bytes = object.Body ? await object.Body.transformToByteArray() : new Uint8Array();
  if (!matchesSignature(input.mimeType, bytes))
    throw new AppError("The uploaded file content does not match its declared type", 422, "INVALID_FILE_CONTENT");
  const existing = await db.applicationFile.findUnique({ where: { objectKey: input.objectKey } });
  if (existing) return existing;
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
    Bucket: r2Env().R2_PRIVATE_BUCKET,
    Key: file.objectKey,
    ResponseContentDisposition: `attachment; filename="${safeName(file.originalFilename)}"`,
  });
  return { url: await getSignedUrl(client(), command, { expiresIn: 120 }), expiresIn: 120 };
}
