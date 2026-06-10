import { describe, expect, it } from "vitest";

import { buildComparisonRows, pickRecommendedComparison } from "./scan-compare";

describe("scan-compare", () => {
  const rows = buildComparisonRows([
    {
      id: "a",
      title: "비타민 구미",
      riskLevel: "high_risk",
      riskScore: 72,
      totalTaxKrw: 12_000,
      selectedHsCode: "2106909099",
    },
    {
      id: "b",
      title: "면 티셔츠",
      riskLevel: "safe",
      riskScore: 18,
      totalTaxKrw: 2_500,
      selectedHsCode: "6109101000",
    },
  ]);

  it("adds comparison labels and total cost rank", () => {
    expect(rows).toEqual([
      expect.objectContaining({
        id: "b",
        riskLabel: "안전",
        totalCostRank: 1,
      }),
      expect.objectContaining({
        id: "a",
        riskLabel: "고위험",
        totalCostRank: 2,
      }),
    ]);
  });

  it("recommends the lowest risk and lowest tax candidate", () => {
    expect(pickRecommendedComparison(rows)).toEqual(
      expect.objectContaining({
        id: "b",
        reason: "위험 점수와 예상 세액이 가장 낮습니다.",
      }),
    );
  });
});
