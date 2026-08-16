import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { calculateWeightedScore } from "@/lib/domain/evaluation";

export async function submitEvaluation(
  assignmentId: string,
  reviewerId: string,
  input: {
    scores: { criterionId: string; score: number; comment?: string }[];
    internalNotes?: string;
    feedback?: string;
  },
) {
  const assignment = await db.reviewerAssignment.findUnique({
    where: { id: assignmentId, reviewerId },
    include: { rubric: { include: { criteria: true } } },
  });
  if (!assignment) throw notFound("Review assignment");
  if (assignment.status === "COMPLETED") throw new AppError("This review is already submitted", 409);
  const scoreMap = new Map(input.scores.map((item) => [item.criterionId, item]));
  if (assignment.rubric.criteria.some((criterion) => !scoreMap.has(criterion.id)))
    throw new AppError("Score every criterion", 422);
  const weighted = calculateWeightedScore(
    assignment.rubric.criteria.map((criterion) => ({
      score: scoreMap.get(criterion.id)!.score,
      maxScore: criterion.maxScore.toNumber(),
      weight: criterion.weight.toNumber(),
    })),
  );
  return db.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.upsert({
      where: { assignmentId },
      create: {
        assignmentId,
        applicationId: assignment.applicationId,
        reviewerId,
        rubricId: assignment.rubricId,
        status: "SUBMITTED",
        totalScore: weighted,
        internalNotes: input.internalNotes,
        feedback: input.feedback,
        submittedAt: new Date(),
      },
      update: {
        status: "SUBMITTED",
        totalScore: weighted,
        internalNotes: input.internalNotes,
        feedback: input.feedback,
        submittedAt: new Date(),
      },
    });
    for (const score of input.scores) {
      await tx.evaluationScore.upsert({
        where: { evaluationId_criterionId: { evaluationId: evaluation.id, criterionId: score.criterionId } },
        create: {
          evaluationId: evaluation.id,
          criterionId: score.criterionId,
          score: score.score,
          comment: score.comment,
        },
        update: { score: score.score, comment: score.comment },
      });
    }
    await tx.reviewerAssignment.update({ where: { id: assignmentId }, data: { status: "COMPLETED" } });
    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "review.submit",
        entityType: "ReviewerAssignment",
        entityId: assignmentId,
        metadata: { weightedScore: weighted },
      },
    });
    return evaluation;
  });
}
