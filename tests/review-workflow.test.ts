import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { saveEvaluationDraft, submitEvaluation } from "../lib/services/evaluations";

test("review drafts clear removed scores and submitted reviews reject later saves", async () => {
  let status = "ASSIGNED";
  let locked = false;
  const scores = new Map<string, number>();
  const tx = {
    $executeRaw: async () => {
      locked = true;
    },
    reviewerAssignment: {
      findUnique: async ({ where }: { where: { reviewerId: string } }) => {
        assert.equal(locked, true);
        if (where.reviewerId !== "reviewer") return null;
        return {
          status,
          applicationId: "app",
          rubricId: "rubric",
          rubric: { criteria: [{ id: "score", maxScore: { toNumber: () => 10 }, weight: { toNumber: () => 1 } }] },
        };
      },
      update: async ({ data }: { data: { status: string } }) => {
        status = data.status;
      },
    },
    evaluation: { upsert: async () => ({ id: "evaluation" }) },
    evaluationScore: {
      deleteMany: async ({ where }: { where: { criterionId: { notIn: string[] } } }) => {
        for (const key of scores.keys()) if (!where.criterionId.notIn.includes(key)) scores.delete(key);
      },
      upsert: async ({ create }: { create: { criterionId: string; score: number } }) => {
        scores.set(create.criterionId, create.score);
      },
    },
    auditLog: { create: async () => ({}) },
  };
  const client = {
    $transaction: async (callback: (client: unknown) => Promise<unknown>) => {
      locked = false;
      return callback(tx);
    },
  } as unknown as Pick<PrismaClient, "$transaction">;
  await assert.rejects(saveEvaluationDraft("assignment", "other", { scores: [] }, client), /not found/i);
  await saveEvaluationDraft("assignment", "reviewer", { scores: [{ criterionId: "score", score: 8 }] }, client);
  assert.equal(status, "IN_PROGRESS");
  assert.equal(scores.get("score"), 8);
  await saveEvaluationDraft("assignment", "reviewer", { scores: [] }, client);
  assert.equal(scores.size, 0);
  await assert.rejects(submitEvaluation("assignment", "reviewer", { scores: [] }, client), /Score every criterion/);
  await submitEvaluation("assignment", "reviewer", { scores: [{ criterionId: "score", score: 9 }] }, client);
  assert.equal(status, "COMPLETED");
  await assert.rejects(saveEvaluationDraft("assignment", "reviewer", { scores: [] }, client), /already submitted/);
  await assert.rejects(submitEvaluation("assignment", "reviewer", { scores: [] }, client), /already submitted/);
  assert.equal(scores.get("score"), 9);
});
