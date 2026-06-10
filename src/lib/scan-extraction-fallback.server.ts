import type { ExtractedProduct, HsCandidate } from "./scan-logic";

type ExtractionFallbackInput = {
  inputType: "url" | "text" | "image";
  productUrl?: string;
  productText?: string;
  purchaseCountry: string;
};

type ExtractionFallbackCategory =
  | "food"
  | "health_supplement"
  | "cosmetic"
  | "electronics"
  | "apparel"
  | "kitchenware"
  | "toy"
  | "medical"
  | "other";

const COUNTRY_LABELS: Record<string, string> = {
  US: "미국",
  CN: "중국",
  JP: "일본",
  EU: "EU",
  KR: "한국",
  UNKNOWN: "확인 필요",
};

const CATEGORY_KEYWORDS: Array<{
  category: ExtractionFallbackCategory;
  keywords: string[];
}> = [
  {
    category: "health_supplement",
    keywords: [
      "vitamin",
      "비타민",
      "supplement",
      "보충제",
      "gummies",
      "구미",
      "omega",
      "오메가",
      "probiotic",
      "유산균",
      "capsule",
      "캡슐",
      "tablet",
      "정",
    ],
  },
  {
    category: "electronics",
    keywords: [
      "bluetooth",
      "wireless",
      "earphone",
      "headphone",
      "charger",
      "battery",
      "usb",
      "무선",
      "이어폰",
      "헤드폰",
      "충전",
      "배터리",
    ],
  },
  {
    category: "cosmetic",
    keywords: [
      "cosmetic",
      "serum",
      "cream",
      "lotion",
      "sunscreen",
      "화장품",
      "세럼",
      "크림",
      "로션",
      "선크림",
    ],
  },
  {
    category: "apparel",
    keywords: [
      "shirt",
      "t-shirt",
      "pants",
      "dress",
      "cotton",
      "apparel",
      "의류",
      "티셔츠",
      "면",
      "바지",
    ],
  },
  {
    category: "kitchenware",
    keywords: ["cup", "pan", "pot", "knife", "kitchen", "컵", "팬", "냄비", "칼", "주방"],
  },
  {
    category: "toy",
    keywords: ["toy", "figure", "lego", "doll", "장난감", "피규어", "인형"],
  },
  {
    category: "medical",
    keywords: ["medical", "medicine", "drug", "의료", "의약품", "약"],
  },
  {
    category: "food",
    keywords: [
      "food",
      "snack",
      "chocolate",
      "coffee",
      "tea",
      "식품",
      "간식",
      "초콜릿",
      "커피",
      "차",
    ],
  },
];

const HS_CANDIDATES_BY_CATEGORY: Record<ExtractionFallbackCategory, HsCandidate[]> = {
  health_supplement: [
    {
      hsCode: "2106909099",
      hsNameKo: "기타 조제식료품",
      hsNameEn: "Food preparations n.e.s.",
      matchReason: "건강보조식품 또는 구미형 섭취 제품 설명 기반 fallback 후보",
      confidence: 0.45,
    },
    {
      hsCode: "1704909000",
      hsNameKo: "그 밖의 설탕과자",
      hsNameEn: "Other sugar confectionery",
      matchReason: "구미·젤라틴·시럽 표현이 있는 경우의 보조 후보",
      confidence: 0.35,
    },
    {
      hsCode: "3004500000",
      hsNameKo: "비타민을 함유한 의약품",
      hsNameEn: "Medicaments containing vitamins",
      matchReason: "비타민 성분 표기가 있는 경우의 보수적 확인 후보",
      confidence: 0.28,
    },
  ],
  food: [
    {
      hsCode: "2106909099",
      hsNameKo: "기타 조제식료품",
      hsNameEn: "Food preparations n.e.s.",
      matchReason: "식품류 설명 기반 fallback 후보",
      confidence: 0.42,
    },
    {
      hsCode: "1905909090",
      hsNameKo: "그 밖의 베이커리 제품",
      hsNameEn: "Other bakers' wares",
      matchReason: "가공식품류 보조 후보",
      confidence: 0.3,
    },
    {
      hsCode: "1806909090",
      hsNameKo: "그 밖의 초콜릿 조제품",
      hsNameEn: "Other chocolate preparations",
      matchReason: "초콜릿·과자류 표현이 있는 경우의 보조 후보",
      confidence: 0.3,
    },
  ],
  electronics: [
    {
      hsCode: "8518309000",
      hsNameKo: "그 밖의 헤드폰과 이어폰",
      hsNameEn: "Other headphones and earphones",
      matchReason: "이어폰·헤드폰·오디오 액세서리 설명 기반 fallback 후보",
      confidence: 0.5,
    },
    {
      hsCode: "8517629090",
      hsNameKo: "그 밖의 통신기기",
      hsNameEn: "Other communication apparatus",
      matchReason: "Bluetooth·무선 통신 표현이 있는 경우의 보조 후보",
      confidence: 0.38,
    },
    {
      hsCode: "8504409090",
      hsNameKo: "그 밖의 정지형 변환기",
      hsNameEn: "Other static converters",
      matchReason: "충전기·전원장치 표현이 있는 경우의 보조 후보",
      confidence: 0.28,
    },
  ],
  cosmetic: [
    {
      hsCode: "3304999000",
      hsNameKo: "그 밖의 미용 또는 화장용 제품류",
      hsNameEn: "Other beauty or make-up preparations",
      matchReason: "화장품 설명 기반 fallback 후보",
      confidence: 0.45,
    },
    {
      hsCode: "3304991000",
      hsNameKo: "기초화장용 제품류",
      hsNameEn: "Skin care preparations",
      matchReason: "크림·세럼·로션 표현이 있는 경우의 보조 후보",
      confidence: 0.35,
    },
    {
      hsCode: "3401300000",
      hsNameKo: "피부세척용 유기계면활성제품",
      hsNameEn: "Organic surface-active products for washing the skin",
      matchReason: "클렌저·세정 제품 표현이 있는 경우의 보조 후보",
      confidence: 0.25,
    },
  ],
  apparel: [
    {
      hsCode: "6109100000",
      hsNameKo: "면으로 만든 티셔츠",
      hsNameEn: "T-shirts of cotton",
      matchReason: "의류·면 티셔츠 설명 기반 fallback 후보",
      confidence: 0.42,
    },
    {
      hsCode: "6205200000",
      hsNameKo: "면으로 만든 남성용 셔츠",
      hsNameEn: "Men's shirts of cotton",
      matchReason: "셔츠류 표현이 있는 경우의 보조 후보",
      confidence: 0.3,
    },
    {
      hsCode: "6110200000",
      hsNameKo: "면으로 만든 저지·풀오버",
      hsNameEn: "Jerseys and pullovers of cotton",
      matchReason: "니트·상의류 표현이 있는 경우의 보조 후보",
      confidence: 0.28,
    },
  ],
  kitchenware: [
    {
      hsCode: "7323930000",
      hsNameKo: "스테인리스강제 식탁·주방용품",
      hsNameEn: "Table, kitchen articles of stainless steel",
      matchReason: "주방용품 설명 기반 fallback 후보",
      confidence: 0.38,
    },
    {
      hsCode: "3924100000",
      hsNameKo: "플라스틱제 식탁·주방용품",
      hsNameEn: "Tableware and kitchenware of plastics",
      matchReason: "플라스틱 주방용품 표현이 있는 경우의 보조 후보",
      confidence: 0.32,
    },
    {
      hsCode: "8215990000",
      hsNameKo: "그 밖의 스푼·포크 등 주방용품",
      hsNameEn: "Other kitchen or tableware tools",
      matchReason: "도구형 주방용품 표현이 있는 경우의 보조 후보",
      confidence: 0.25,
    },
  ],
  toy: [
    {
      hsCode: "9503003990",
      hsNameKo: "그 밖의 완구",
      hsNameEn: "Other toys",
      matchReason: "완구 설명 기반 fallback 후보",
      confidence: 0.42,
    },
    {
      hsCode: "9503003910",
      hsNameKo: "조립식 완구",
      hsNameEn: "Construction sets and constructional toys",
      matchReason: "조립·블록 표현이 있는 경우의 보조 후보",
      confidence: 0.32,
    },
    {
      hsCode: "9503002100",
      hsNameKo: "인형",
      hsNameEn: "Dolls",
      matchReason: "인형 표현이 있는 경우의 보조 후보",
      confidence: 0.26,
    },
  ],
  medical: [
    {
      hsCode: "9018909000",
      hsNameKo: "그 밖의 의료용 기기",
      hsNameEn: "Other medical instruments and appliances",
      matchReason: "의료기기 설명 기반 fallback 후보",
      confidence: 0.38,
    },
    {
      hsCode: "3004909900",
      hsNameKo: "그 밖의 의약품",
      hsNameEn: "Other medicaments",
      matchReason: "의약품 표현이 있는 경우의 보수적 확인 후보",
      confidence: 0.28,
    },
    {
      hsCode: "9021100000",
      hsNameKo: "정형외과용 기기",
      hsNameEn: "Orthopaedic appliances",
      matchReason: "보조기·착용형 의료기기 표현이 있는 경우의 보조 후보",
      confidence: 0.24,
    },
  ],
  other: [
    {
      hsCode: "3926909000",
      hsNameKo: "그 밖의 플라스틱 제품",
      hsNameEn: "Other articles of plastics",
      matchReason: "상품군 확인이 어려운 경우의 범용 fallback 후보",
      confidence: 0.22,
    },
    {
      hsCode: "6307909000",
      hsNameKo: "그 밖의 섬유제품",
      hsNameEn: "Other made up textile articles",
      matchReason: "소재·용도 확인이 필요한 범용 보조 후보",
      confidence: 0.2,
    },
    {
      hsCode: "7326909000",
      hsNameKo: "그 밖의 철강 제품",
      hsNameEn: "Other articles of iron or steel",
      matchReason: "재질 확인이 필요한 범용 보조 후보",
      confidence: 0.18,
    },
  ],
};

const clip = (value: string, maxLength: number) => {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
};

const normalizeText = (input: ExtractionFallbackInput): string => {
  const text = input.productText?.trim();
  if (text) return text;
  if (input.productUrl?.trim()) return input.productUrl.trim();
  if (input.inputType === "image") return "이미지 기반 상품";
  return "상품명 확인 필요";
};

const detectCategory = (text: string): ExtractionFallbackCategory => {
  const normalized = text.toLowerCase();
  return (
    CATEGORY_KEYWORDS.find(({ keywords }) =>
      keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
    )?.category ?? "other"
  );
};

const detectBrand = (text: string): string => {
  const knownBrands = ["California Gold Nutrition", "iHerb", "Amazon", "AliExpress"];
  return knownBrands.find((brand) => text.toLowerCase().includes(brand.toLowerCase())) ?? "";
};

const detectIngredients = (text: string): string[] => {
  const candidates: Array<{ label: string; keywords: string[] }> = [
    { label: "비타민 C", keywords: ["비타민 C", "비타민C", "vitamin c"] },
    { label: "젤라틴", keywords: ["젤라틴", "gelatin"] },
    { label: "글루코스 시럽", keywords: ["글루코스 시럽", "glucose syrup"] },
    { label: "천연 오렌지향", keywords: ["천연 오렌지향"] },
  ];
  const normalized = text.toLowerCase();
  return candidates
    .filter(({ keywords }) =>
      keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
    )
    .map(({ label }) => label);
};

const buildRiskKeywords = (
  category: ExtractionFallbackCategory,
  ingredients: string[],
): string[] => {
  if (category === "health_supplement" || category === "food") {
    return [
      "식품·건강기능식품 요건 확인 필요",
      ...(ingredients.length > 0 ? ["성분표 확인 필요"] : []),
    ];
  }

  if (category === "cosmetic") return ["화장품 성분 확인 필요"];
  if (category === "electronics") return ["KC 인증 확인 필요"];
  if (category === "medical") return ["의료기기·의약품 여부 확인 필요"];
  return ["AI 추출 실패로 사용자 검토 필요"];
};

export const buildFallbackExtraction = (
  input: ExtractionFallbackInput,
): ExtractedProduct & { hsCandidates: HsCandidate[] } => {
  const text = normalizeText(input);
  const category = detectCategory(text);
  const ingredients = detectIngredients(text);
  const hsCandidates = HS_CANDIDATES_BY_CATEGORY[category];

  return {
    rawTitle: clip(text, 120),
    translatedTitleKo: clip(text, 80),
    brand: detectBrand(text),
    category,
    intendedUse: category === "health_supplement" || category === "food" ? "섭취" : "확인 필요",
    materials: [],
    ingredients,
    originCountry: COUNTRY_LABELS[input.purchaseCountry] ?? input.purchaseCountry,
    riskKeywords: buildRiskKeywords(category, ingredients),
    confidence: 0.35,
    hsCandidates,
  };
};
