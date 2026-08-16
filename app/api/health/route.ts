import { db } from "@/lib/db";
import { hasDatabaseConfig, validateProductionEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabaseConfig())
    return Response.json(
      { status: "not_ready", database: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  try {
    validateProductionEnvironment();
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ready", database: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json(
      { status: "not_ready", database: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
