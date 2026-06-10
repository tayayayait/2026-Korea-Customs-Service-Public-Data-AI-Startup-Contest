import { describe, expect, it, vi } from "vitest";

import { buildPublicDataAssessment } from "./scan-public-data.server";
import type { ExtractedProduct, HsCandidate } from "./scan-logic";

const product: ExtractedProduct = {
  rawTitle: "Vitamin C Gummies",
  translatedTitleKo: "Vitamin C Gummies",
  brand: "Sample",
  category: "health_supplement",
  intendedUse: "supplement",
  materials: [],
  ingredients: ["Vitamin C", "gelatin"],
  originCountry: "United States",
  riskKeywords: [],
  confidence: 0.9,
};

const selectedHs: HsCandidate = {
  hsCode: "2106909099",
  hsNameKo: "Other food preparations",
  hsNameEn: "Other food preparations",
  matchReason: "supplement",
  confidence: 0.8,
};

describe("scan-public-data.server MFDS Korean labeling integration", () => {
  it("adds Korean labeling findings for imported food matches", async () => {
    const assessment = await buildPublicDataAssessment(
      {
        product,
        selectedHs,
        itemPrice: 25,
        shippingFee: 0,
        currency: "USD",
      },
      {
        dataGoKrApiKey: "service-key",
        now: () => new Date("2026-06-09T00:00:00.000Z"),
        fetchCustomsRequirementItems: vi.fn().mockResolvedValue([]),
        fetchCustomsFxRates: vi.fn().mockResolvedValue([
          {
            currSgn: "USD",
            fxrt: "1350.00",
            aplyBgnDt: "20260609",
          },
        ]),
        fetchImportedFoodProducts: vi.fn().mockResolvedValue([]),
        fetchImportedFoodIngredientCodes: vi.fn().mockResolvedValue([]),
        fetchFoodRawMaterials: vi.fn().mockResolvedValue([]),
        checkIngredientVector: vi.fn().mockResolvedValue([]),
        fetchImportedFoodKoreanLabelingItems: vi.fn().mockResolvedValue([
          {
            PRDUCT_NM: "Vitamin C Gummies",
            PRDUCT_KOREAN_NM: "Vitamin C Gummies",
            MNF_NTNCD_NM: "United States",
            KORLABEL: "label text",
            IRDNT_NM: "Vitamin C, gelatin",
          },
        ]),
      },
    );

    expect(assessment.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "MFDS Korean labeling",
          severity: "info",
          agency: "Ministry of Food and Drug Safety",
          evidence: expect.objectContaining({
            count: 1,
          }),
        }),
      ]),
    );
    expect(assessment.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "MFDS Korean labeling",
          confidence: "public_api",
        }),
      ]),
    );
  });
});
