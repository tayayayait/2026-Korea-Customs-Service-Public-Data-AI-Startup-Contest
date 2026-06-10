import { describe, expect, it } from "vitest";

import { toScanHistoryItem, toScanHistoryItems } from "./scan-history.server";

describe("scan-history.server", () => {
  it("normalizes a scan row for the history screen", () => {
    const item = toScanHistoryItem({
      id: "11111111-1111-4111-8111-111111111111",
      created_at: "2026-06-08T07:00:00.000Z",
      input_type: "image",
      risk_level: "caution",
      risk_score: 45,
      selected_hs_code: "2106909099",
      summary_ko: "주의가 필요합니다.",
      action_recommendation: "구매 전 체크리스트 확인",
      currency: "USD",
      item_price: 24.9,
      purchase_country: "US",
      tax_estimate: { totalTaxKrw: 12000 },
      extracted: {
        translatedTitleKo: "비타민 C 구미",
        rawTitle: "Vitamin C Gummies",
        brand: "Sample",
      },
    });

    expect(item).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: "2026-06-08T07:00:00.000Z",
      inputType: "image",
      title: "비타민 C 구미",
      brand: "Sample",
      riskLevel: "caution",
      riskScore: 45,
      selectedHsCode: "2106909099",
      summary: "주의가 필요합니다.",
      action: "구매 전 체크리스트 확인",
      purchase: "US · 24.9 USD",
      totalTaxKrw: 12000,
      priceFormatted: "24.9 USD",
      origin: "US",
    });
  });

  it("falls back to an empty history list when the backing query fails", () => {
    expect(toScanHistoryItems(null, new Error("Could not find the table"))).toEqual([]);
  });
});
