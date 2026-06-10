// 직구 세이프패스 AI — 위험 점수 / 세액 / 체크리스트 / fallback 판단 규칙.
// Spec §16 (위험 점수), §17 (세액), §8.5 (근거 행), §6.5 (체크리스트)

export type RiskLevel = "safe" | "caution" | "high_risk" | "blocked_unknown" | "banned";

export interface HsCandidate {
  hsCode: string;
  hsNameKo: string;
  hsNameEn: string;
  matchReason: string;
  confidence: number;
}

export interface ExtractedProduct {
  rawTitle: string;
  translatedTitleKo: string;
  brand: string;
  category: string;
  intendedUse: string;
  materials: string[];
  ingredients: string[];
  originCountry: string;
  riskKeywords: string[];
  confidence: number;
}

export interface Finding {
  source: string;
  severity: "info" | "low" | "medium" | "high";
  summary: string;
  agency?: string;
  law?: string;
  hsCode?: string;
  evidence?: Record<string, unknown>;
}

export interface TaxEstimate {
  fxRate: number;
  fxAppliedAt: string;
  fxSource: string;
  itemPriceKrw: number;
  shippingFeeKrw: number;
  taxBaseKrw: number;
  tariffRate: number;
  tariffKrw: number;
  vatKrw: number;
  totalTaxKrw: number;
  exemptionThresholdUsd: number;
  exemptionExceeded: boolean;
  disclaimer: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  reason: string;
  materials: string[];
  doneCondition: string;
  status: "todo";
}

const FALLBACK_FX: Record<string, number> = {
  USD: 1385.4,
  JPY: 9.21,
  CNY: 191.2,
  EUR: 1490.3,
  KRW: 1,
};

// HS 카테고리별 fallback 관세율(%) — Spec §17.2: 참고용 관세율표
const FALLBACK_TARIFF_BY_CATEGORY: Record<string, number> = {
  food: 8.0,
  health_supplement: 8.0,
  cosmetic: 6.5,
  electronics: 0.0,
  apparel: 13.0,
  kitchenware: 8.0,
  toy: 0.0,
  medical: 8.0,
  other: 8.0,
};

const FOOD_LIKE = new Set(["food", "health_supplement", "medical"]);

export function calculateTaxEstimate(input: {
  itemPrice: number;
  shippingFee: number;
  currency: string;
  category: string;
  fxRate?: number;
  usdFxRate?: number;
  fxAppliedAt?: string;
  fxSource?: string;
}): TaxEstimate {
  const fxRate = input.fxRate ?? FALLBACK_FX[input.currency] ?? 1385;
  const usdFxRate = input.usdFxRate ?? (input.currency === "USD" ? fxRate : FALLBACK_FX.USD);
  const itemPriceKrw = Math.round(input.itemPrice * fxRate);
  const shippingFeeKrw = Math.round(input.shippingFee * fxRate);
  const taxBaseKrw = itemPriceKrw + shippingFeeKrw;
  const tariffRate = FALLBACK_TARIFF_BY_CATEGORY[input.category] ?? 8.0;
  const tariffKrw = Math.round((taxBaseKrw * tariffRate) / 100);
  const vatKrw = Math.round((taxBaseKrw + tariffKrw) * 0.1);
  const totalTaxKrw = tariffKrw + vatKrw;
  // 면세 기준: $150 (미국 $200, 그 외 $150). MVP 단순화 — Spec §16.3
  const exemptionThresholdUsd = 150;
  const usdEquivalent = itemPriceKrw / usdFxRate;
  return {
    fxRate,
    fxAppliedAt: input.fxAppliedAt ?? new Date().toISOString(),
    fxSource: input.fxSource ?? "fallback",
    itemPriceKrw,
    shippingFeeKrw,
    taxBaseKrw,
    tariffRate,
    tariffKrw,
    vatKrw,
    totalTaxKrw,
    exemptionThresholdUsd,
    exemptionExceeded: usdEquivalent > exemptionThresholdUsd,
    disclaimer:
      "참고용 예상세액입니다. 실제 세액은 통관 시점·신고가격·운임·보험료·세율에 따라 달라질 수 있습니다.",
  };
}

export function generateFallbackFindings(product: ExtractedProduct, hs: HsCandidate): Finding[] {
  const findings: Finding[] = [];

  // 카테고리 기반 fallback 세관장확인대상 결과
  if (FOOD_LIKE.has(product.category)) {
    findings.push({
      source: "관세청_세관장확인대상물품(GW)",
      severity: "high",
      summary: "수입식품안전관리 특별법 관련 요건 확인 가능성",
      agency: "식품의약품안전처",
      law: "수입식품안전관리 특별법",
      hsCode: hs.hsCode,
      evidence: { hsCode: hs.hsCode, importExportType: "import" },
    });
    findings.push({
      source: "식품의약품안전처_수입식품 제품DB",
      severity: "medium",
      summary: "식품 또는 건강기능식품으로 추정되어 목록통관 배제 가능성 있음",
      agency: "식품의약품안전처",
      evidence: {
        category: product.category,
        ingredients: product.ingredients,
      },
    });
  } else if (product.category === "cosmetic") {
    findings.push({
      source: "관세청_세관장확인대상물품(GW)",
      severity: "medium",
      summary: "화장품법 관련 요건 확인 가능성",
      agency: "식품의약품안전처",
      law: "화장품법",
      hsCode: hs.hsCode,
    });
  } else if (product.category === "electronics") {
    findings.push({
      source: "관세청_세관장확인대상물품(GW)",
      severity: "medium",
      summary: "전기용품 및 생활용품 안전관리법(KC 인증) 가능성",
      agency: "국가기술표준원",
      law: "전기용품 및 생활용품 안전관리법",
      hsCode: hs.hsCode,
    });
  } else if (product.category === "medical") {
    findings.push({
      source: "관세청_세관장확인대상물품(GW)",
      severity: "high",
      summary: "의료기기법 또는 약사법 요건 확인 가능성",
      agency: "식품의약품안전처",
      law: "의료기기법",
      hsCode: hs.hsCode,
    });
  } else {
    findings.push({
      source: "관세청_세관장확인대상물품(GW)",
      severity: "low",
      summary: "조회된 세관장확인대상 요건 신호가 낮습니다.",
      hsCode: hs.hsCode,
    });
  }

  if (product.riskKeywords.length > 0) {
    findings.push({
      source: "AI 위험 키워드 분석",
      severity: "medium",
      summary: `위험 키워드 감지: ${product.riskKeywords.join(", ")}`,
    });
  }

  return findings;
}

export function calculateRiskScore(input: {
  findings: Finding[];
  hsConfidence: number;
  hsCandidates: HsCandidate[];
  category: string;
  purpose: "personal" | "resale";
  taxKrw: number;
  itemPriceUsdEquivalent: number;
}): number {
  let score = 0;
  const hasHighReq = input.findings.some(
    (f) => f.severity === "high" && f.source.includes("세관장확인"),
  );
  if (hasHighReq) score += 40;

  if (FOOD_LIKE.has(input.category) || input.category === "cosmetic") score += 25;

  if (input.findings.some((f) => f.source.includes("성분") && f.severity !== "low")) score += 25;

  if (input.hsConfidence < 0.65) score += 20;

  const chapters = new Set(input.hsCandidates.map((c) => c.hsCode.slice(0, 4)));
  if (chapters.size >= 3) score += 10;

  if (input.itemPriceUsdEquivalent > 150) score += 15;

  if (input.purpose === "resale") score += 30;

  const hasBannedIngredient = input.findings.some(
    (f) => f.source.includes("AI 벡터 검색") && f.severity === "high"
  );
  if (hasBannedIngredient) score += 1000;

  return Math.min(2000, score);
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 1000) return "banned";
  if (score >= 80) return "blocked_unknown";
  if (score >= 60) return "high_risk";
  if (score >= 30) return "caution";
  return "safe";
}

export function generateChecklist(product: ExtractedProduct, findings: Finding[]): ChecklistItem[] {
  const items: ChecklistItem[] = [
    {
      id: "verify-name",
      title: "상품명·모델명이 상세페이지와 일치하는지 확인",
      reason: "AI 추출값과 실제 판매 페이지가 다르면 HS 분류가 어긋날 수 있습니다.",
      materials: ["상세페이지 스크린샷"],
      doneCondition: "상품명·모델명이 일치한다고 사용자 확정",
      status: "todo",
    },
    {
      id: "quantity-personal-use",
      title: "구매 수량이 자가사용 범위인지 확인",
      reason: "자가사용 범위를 초과하면 일반수입신고 대상이 됩니다.",
      materials: ["주문 수량 정보"],
      doneCondition: "자가사용 범위 내라고 확인",
      status: "todo",
    },
  ];

  if (
    FOOD_LIKE.has(product.category) ||
    product.category === "cosmetic" ||
    product.ingredients.length > 0
  ) {
    items.push({
      id: "ingredient-list",
      title: "성분표 원문 확보",
      reason: "식품·건기식·화장품으로 분류될 경우 목록통관 배제 가능성이 있습니다.",
      materials: ["영문 성분표", "제품 라벨 이미지"],
      doneCondition: "성분명·함량이 보이는 라벨 이미지 업로드",
      status: "todo",
    });
  }

  if (product.category === "electronics") {
    items.push({
      id: "kc-cert",
      title: "KC 인증 여부 확인",
      reason: "전기용품·무선기기는 KC 인증이 없으면 통관이 보류될 수 있습니다.",
      materials: ["KC 인증 번호 또는 인증서"],
      doneCondition: "판매자에게 KC 인증 정보 요청·수령",
      status: "todo",
    });
  }

  if (findings.some((f) => f.severity === "high")) {
    items.push({
      id: "agency-contact",
      title: "관계기관 사전 문의",
      reason: "세관장확인대상 요건이 있을 가능성이 있어 기관 안내가 가장 정확합니다.",
      materials: ["상품명", "HS 후보 코드", "성분표"],
      doneCondition: "기관 또는 관세사로부터 요건 답변 수령",
      status: "todo",
    });
  }

  items.push({
    id: "tax-budget",
    title: "예상 세액이 상품가격 대비 합리적인지 검토",
    reason: "관·부가세를 더한 총비용이 다른 옵션보다 비싸지 않은지 확인.",
    materials: ["결과 화면의 예상세액"],
    doneCondition: "총비용 수용 여부 결정",
    status: "todo",
  });

  return items;
}
