import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

const inputSchema = z.object({ ids: z.array(z.string().cuid()).max(100).optional(), all: z.boolean().optional() });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = inputSchema.parse(await request.json());
    const result = await db.notification.updateMany({
      where: { userId: user.id, readAt: null, ...(input.all ? {} : { id: { in: input.ids ?? [] } }) },
      data: { readAt: new Date() },
    });
    return Response.json({ updated: result.count });
  } catch (error) {
    return safeError(error);
  }
}
