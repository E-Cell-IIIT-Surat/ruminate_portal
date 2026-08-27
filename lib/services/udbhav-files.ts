import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { r2Env } from "@/lib/env";

export const UDBHAV_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function safeName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(-120) || "supporting-document"
  );
}

function contentTypeFor(file: File) {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  return file.name.toLowerCase().endsWith(".docx")
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";
}

export function validateUdbhavDocument(file: unknown): asserts file is File {
  if (!(file instanceof File)) throw new Error("Choose a supporting document in PDF or DOCX format");
  const extensionAllowed = /\.(pdf|docx)$/i.test(file.name);
  const mimeAllowed = !file.type || allowedMimeTypes.has(file.type) || file.type === "application/octet-stream";
  if (!extensionAllowed || !mimeAllowed) throw new Error("Only PDF or DOCX supporting documents are allowed");
  if (file.size <= 0 || file.size > UDBHAV_DOCUMENT_MAX_BYTES)
    throw new Error("The supporting document must be smaller than 5 MB");
}

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

export async function uploadUdbhavDocument(file: File, uploadedBy: string) {
  const { client, bucket } = storage();
  const key = `udbhav/pending/${randomUUID()}-${safeName(file.name)}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: new Uint8Array(await file.arrayBuffer()),
      ContentType: contentTypeFor(file),
      ContentLength: file.size,
      Metadata: { uploadedBy },
    }),
  );
  return { key, client, bucket };
}

export async function removeUdbhavDocument(client: S3Client, bucket: string, key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export { storage as udbhavStorage, safeName };
