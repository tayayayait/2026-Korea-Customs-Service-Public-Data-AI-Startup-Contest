import type { RiskLevel } from "./scan-logic";

export type ComparisonInput = {
  id: string;
  title: string;
  riskLevel: RiskLevel;
  riskScore: number;
  totalTaxKrw: number;
  selectedHsCode: string;
  priceFormatted: string;
  origin: string;
};

export type ComparisonRow = ComparisonInput & {
  riskLabel: string;
  totalCostRank: number;
};

const RISK_LABELS: Record<RiskLevel, string> = {
  safe: "안전",
  caution: "주의",
  high_risk: "고위험",
  blocked_unknown: "확인 필요",
};

export const buildComparisonRows = (items: ComparisonInput[]): ComparisonRow[] => {
  const taxRanks = new Map(
    [...items]
      .sort((a, b) => a.totalTaxKrw - b.totalTaxKrw)
      .map((item, index) => [item.id, index + 1]),
  );

  return [...items]
    .sort((a, b) => a.riskScore - b.riskScore || a.totalTaxKrw - b.totalTaxKrw)
    .map((item) => ({
      ...item,
      riskLabel: RISK_LABELS[item.riskLevel],
      totalCostRank: taxRanks.get(item.id) ?? items.length,
    }));
};

export const pickRecommendedComparison = (
  rows: ComparisonRow[],
): (ComparisonRow & { reason: string }) | undefined => {
  const recommended = rows[0];
  if (!recommended) return undefined;

  return {
    ...recommended,
    reason: "위험 점수와 예상 세액이 가장 낮습니다.",
  };
};
