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

export function safeError(error: unknown, context: { route?: string; method?: string } = {}) {
  const requestId = crypto.randomUUID();
  const details = {
    timestamp: new Date().toISOString(),
    level: "error",
    requestId,
    route: context.route,
    method: context.method,
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  // Keep full diagnostics in server logs while returning only safe, minimal
  // responses to callers. JSON makes this easy to search in Vercel logs.
  console.error(JSON.stringify(details));
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
  return Response.json(
    { error: "Something went wrong", code: "INTERNAL_ERROR", requestId },
    { status: 500, headers: { "cache-control": "no-store" } },
  );
}
