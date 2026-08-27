import { z } from "zod";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { requireUdbhavViewer, udbhavScoreFields } from "@/lib/udbhav";

const scoreSchema = z
  .object(
    Object.fromEntries(udbhavScoreFields.map(([key]) => [key, z.coerce.number().min(0).max(10)])) as Record<
      string,
      z.ZodNumber
    >,
  )
  .extend({ feedback: z.string().trim().max(4000).optional().or(z.literal("")) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { current, isAdmin, isReviewer, submission } = await requireUdbhavViewer(id);
    if (!isAdmin && !isReviewer)
      return Response.json({ error: "Only assigned reviewers can score an idea" }, { status: 403 });
    const input = scoreSchema.parse(await request.json());
    const feedback = typeof input.feedback === "string" ? input.feedback : "";
    const scores = {
      creativity: Number(input.creativity),
      problemUnderstanding: Number(input.problemUnderstanding),
      innovation: Number(input.innovation),
      execution: Number(input.execution),
      feasibility: Number(input.feasibility),
      scalability: Number(input.scalability),
      impact: Number(input.impact),
      sustainability: Number(input.sustainability),
      presentation: Number(input.presentation),
      completeness: Number(input.completeness),
    };
    const totalScore = Object.values(scores).reduce((total, score) => total + score, 0);
    const review = await db.udbhavReview.upsert({
      where: { submissionId_reviewerId: { submissionId: id, reviewerId: current.id } },
      create: { submissionId: id, reviewerId: current.id, ...scores, totalScore, feedback: feedback || null },
      update: { ...scores, totalScore, feedback: feedback || null },
    });
    await db.auditLog.create({
      data: {
        actorId: current.id,
        action: "udbhav.review.submitted",
        entityType: "UdbhavSubmission",
        entityId: id,
        metadata: { reviewId: review.id, totalScore },
      },
    });
    const aggregate = await db.udbhavReview.aggregate({ where: { submissionId: id }, _avg: { totalScore: true } });
    await db.udbhavSubmission.update({
      where: { id },
      data: {
        totalScore: aggregate._avg.totalScore ?? totalScore,
        ...(submission.status === "DRAFT" || submission.status === "SUBMITTED" ? { status: "UNDER_REVIEW" } : {}),
      },
    });
    return Response.json({ review });
  } catch (error) {
    return safeError(error, { route: "/api/udbhav/submissions/[id]/review", method: "POST" });
  }
}
