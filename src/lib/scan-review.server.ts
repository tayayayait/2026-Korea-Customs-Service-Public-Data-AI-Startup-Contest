import type { ExtractedProduct } from "./scan-logic";

type ReviewExtractedProductInput = {
  rawTitle: string;
  translatedTitleKo: string;
  brand: string;
  category: string;
  intendedUse: string;
  originCountry: string;
  materialsText: string;
  ingredientsText: string;
  riskKeywordsText: string;
  confidence: number;
};

const splitCsv = (value: string): string[] => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const normalizeReviewExtractedProduct = (
  input: ReviewExtractedProductInput,
): ExtractedProduct => {
  return {
    rawTitle: input.rawTitle.trim(),
    translatedTitleKo: input.translatedTitleKo.trim(),
    brand: input.brand.trim(),
    category: input.category.trim() || "other",
    intendedUse: input.intendedUse.trim(),
    materials: splitCsv(input.materialsText),
    ingredients: splitCsv(input.ingredientsText),
    originCountry: input.originCountry.trim(),
    riskKeywords: splitCsv(input.riskKeywordsText),
    confidence: input.confidence,
  };
};
