export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "BAD_REQUEST",
  ) {
    super(message);
  }
}

export const unauthorized = () => new AppError("Authentication required", 401, "UNAUTHORIZED");
export const forbidden = () => new AppError("You do not have permission for this action", 403, "FORBIDDEN");
export const notFound = (entity = "Resource") => new AppError(`${entity} not found`, 404, "NOT_FOUND");

export function safeError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong", code: "INTERNAL_ERROR" }, { status: 500 });
}
