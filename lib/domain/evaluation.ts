import { AppError } from "@/lib/errors";

export type ScoredCriterion = { score: number; maxScore: number; weight: number };

export function calculateWeightedScore(criteria: ScoredCriterion[]) {
  if (!criteria.length) return 0;
  let weighted = 0;
  let totalWeight = 0;
  for (const criterion of criteria) {
    if (
      criterion.maxScore <= 0 ||
      criterion.weight < 0 ||
      criterion.score < 0 ||
      criterion.score > criterion.maxScore
    ) {
      throw new AppError("A rubric score is outside its allowed range", 422, "INVALID_SCORE");
    }
    weighted += (criterion.score / criterion.maxScore) * criterion.weight;
    totalWeight += criterion.weight;
  }
  return totalWeight === 0 ? 0 : Number(((weighted / totalWeight) * 100).toFixed(2));
}
