import { describe, expect, it } from "vitest";

import { normalizeReviewExtractedProduct } from "./scan-review.server";

describe("scan-review.server", () => {
  it("normalizes comma separated review fields into extracted product arrays", () => {
    const product = normalizeReviewExtractedProduct({
      rawTitle: "raw",
      translatedTitleKo: "비타민",
      brand: "Brand",
      category: "food",
      intendedUse: "섭취",
      originCountry: "US",
      materialsText: "플라스틱, , 종이",
      ingredientsText: "비타민 C, 젤라틴",
      riskKeywordsText: "식품, 성분표",
      confidence: 0.8,
    });

    expect(product.materials).toEqual(["플라스틱", "종이"]);
    expect(product.ingredients).toEqual(["비타민 C", "젤라틴"]);
    expect(product.riskKeywords).toEqual(["식품", "성분표"]);
  });
});
