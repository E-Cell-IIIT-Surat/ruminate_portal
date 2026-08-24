import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "BAD_REQUEST",
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const unauthorized = () => new AppError("Authentication required", 401, "UNAUTHORIZED");
export const forbidden = () => new AppError("You do not have permission for this action", 403, "FORBIDDEN");
export const notFound = (entity = "Resource") => new AppError(`${entity} not found`, 404, "NOT_FOUND");

export function safeError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, code: error.code, ...(error.fields ? { fields: error.fields } : {}) },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Please check the submitted information",
        code: "VALIDATION_ERROR",
        fields: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return Response.json({ error: "A record with this value already exists", code: "CONFLICT" }, { status: 409 });
    if (error.code === "P2025")
      return Response.json({ error: "The requested record was not found", code: "NOT_FOUND" }, { status: 404 });
  }
  const requestId = crypto.randomUUID();
  console.error(`[${requestId}]`, error);
  return Response.json(
    { error: "Something went wrong", code: "INTERNAL_ERROR", requestId },
    { status: 500, headers: { "cache-control": "no-store" } },
  );
}
