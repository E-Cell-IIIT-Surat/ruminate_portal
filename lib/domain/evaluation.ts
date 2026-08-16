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
      throw new Error("Invalid rubric score");
    }
    weighted += (criterion.score / criterion.maxScore) * criterion.weight;
    totalWeight += criterion.weight;
  }
  return totalWeight === 0 ? 0 : Number(((weighted / totalWeight) * 100).toFixed(2));
}
