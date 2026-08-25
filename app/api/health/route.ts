import { db } from "@/lib/db";
import { hasDatabaseConfig, validateProductionEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabaseConfig()) {
    console.error("[health] DATABASE_URL is missing or is not a valid PostgreSQL URL");
    return Response.json(
      { status: "not_ready", database: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  try {
    validateProductionEnvironment();
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ready", database: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[health] readiness check failed", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json(
      { status: "not_ready", database: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
