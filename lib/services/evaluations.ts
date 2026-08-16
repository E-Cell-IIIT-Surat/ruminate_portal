import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { calculateWeightedScore } from "@/lib/domain/evaluation";

type EvaluationInput = {
  scores: { criterionId: string; score: number; comment?: string }[];
  internalNotes?: string;
  feedback?: string;
};

async function assignmentForReview(assignmentId: string, reviewerId: string) {
  const assignment = await db.reviewerAssignment.findUnique({
    where: { id: assignmentId, reviewerId },
    include: { rubric: { include: { criteria: true } }, application: { select: { programId: true } } },
  });
  if (!assignment) throw notFound("Review assignment");
  return assignment;
}

function validatedScores(
  criteria: { id: string; maxScore: { toNumber(): number } }[],
  input: EvaluationInput,
  complete: boolean,
) {
  const allowed = new Map(criteria.map((criterion) => [criterion.id, criterion.maxScore.toNumber()]));
  const seen = new Set<string>();
  for (const score of input.scores) {
    const max = allowed.get(score.criterionId);
    if (max === undefined || seen.has(score.criterionId))
      throw new AppError("The review contains an invalid criterion", 422, "INVALID_CRITERION");
    if (score.score < 0 || score.score > max)
      throw new AppError("A rubric score is outside its allowed range", 422, "INVALID_SCORE");
    seen.add(score.criterionId);
  }
  if (complete && seen.size !== criteria.length) throw new AppError("Score every criterion", 422);
}

export async function saveEvaluationDraft(assignmentId: string, reviewerId: string, input: EvaluationInput) {
  const assignment = await assignmentForReview(assignmentId, reviewerId);
  if (assignment.status === "COMPLETED") throw new AppError("This review is already submitted", 409);
  validatedScores(assignment.rubric.criteria, input, false);
  return db.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.upsert({
      where: { assignmentId },
      create: {
        assignmentId,
        applicationId: assignment.applicationId,
        reviewerId,
        rubricId: assignment.rubricId,
        status: "DRAFT",
        internalNotes: input.internalNotes,
        feedback: input.feedback,
      },
      update: { internalNotes: input.internalNotes, feedback: input.feedback },
    });
    for (const score of input.scores)
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
    await tx.reviewerAssignment.update({ where: { id: assignmentId }, data: { status: "IN_PROGRESS" } });
    return evaluation;
  });
}

export async function submitEvaluation(assignmentId: string, reviewerId: string, input: EvaluationInput) {
  const assignment = await assignmentForReview(assignmentId, reviewerId);
  if (assignment.status === "COMPLETED") throw new AppError("This review is already submitted", 409);
  validatedScores(assignment.rubric.criteria, input, true);
  const scoreMap = new Map(input.scores.map((item) => [item.criterionId, item]));
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
