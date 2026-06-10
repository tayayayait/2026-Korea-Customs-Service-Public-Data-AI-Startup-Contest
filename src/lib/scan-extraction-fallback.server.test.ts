import { describe, expect, it } from "vitest";

import { buildFallbackExtraction } from "./scan-extraction-fallback.server";

describe("scan-extraction-fallback.server", () => {
  it("builds a conservative health supplement extraction from product text", () => {
    const extracted = buildFallbackExtraction({
      inputType: "text",
      productText:
        "iHerb 판매 California Gold Nutrition Vitamin C 비타민C 250mg, 젤라틴, 글루코스 시럽, 천연 오렌지향",
      purchaseCountry: "US",
    });

    expect(extracted).toMatchObject({
      brand: "California Gold Nutrition",
      category: "health_supplement",
      intendedUse: "섭취",
      originCountry: "미국",
      confidence: 0.35,
    });
    expect(extracted.ingredients).toEqual(["비타민 C", "젤라틴", "글루코스 시럽", "천연 오렌지향"]);
    expect(extracted.hsCandidates[0]).toEqual(
      expect.objectContaining({
        hsCode: "2106909099",
        hsNameKo: "기타 조제식료품",
      }),
    );
  });

  it("builds an electronics fallback for wireless audio products", () => {
    const extracted = buildFallbackExtraction({
      inputType: "text",
      productText: "Amazon 판매 Bluetooth 5.3 무선 이어폰 노이즈 캔슬링, 충전 케이스 포함",
      purchaseCountry: "US",
    });

    expect(extracted.category).toBe("electronics");
    expect(extracted.riskKeywords).toContain("KC 인증 확인 필요");
    expect(extracted.hsCandidates[0].hsCode).toBe("8518309000");
  });
});
