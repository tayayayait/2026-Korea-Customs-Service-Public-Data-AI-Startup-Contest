import { describe, expect, it, vi } from "vitest";

import { buildPublicDataAssessment } from "./scan-public-data.server";
import type { ExtractedProduct, HsCandidate } from "./scan-logic";

const product: ExtractedProduct = {
  rawTitle: "ZEN-ERGY Oxy Xtreme",
  translatedTitleKo: "ZEN-ERGY Oxy Xtreme",
  brand: "EPG",
  category: "health_supplement",
  intendedUse: "supplement",
  materials: [],
  ingredients: ["Yohimbine"],
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

describe("scan-public-data.server FoodSafetyKorea integration", () => {
  it("adds high severity findings for blocked overseas direct purchase foods", async () => {
    const assessment = await buildPublicDataAssessment(
      {
        product,
        selectedHs,
        itemPrice: 30,
        shippingFee: 0,
        currency: "USD",
      },
      {
        dataGoKrApiKey: "service-key",
        foodSafetyKoreaApiKey: "food-key",
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
        fetchImportedFoodKoreanLabelingItems: vi.fn().mockResolvedValue([]),
        checkIngredientVector: vi.fn().mockResolvedValue([]),
        fetchBlockedDirectImportFoods: vi.fn().mockResolvedValue([
          {
            PRDT_NM: "ZEN-ERGY Oxy Xtreme",
            MUFC_NM: "EPG EXTREME PRODUCTS GROUP",
            MUFC_CNTRY_NM: "United States",
            INGR_NM_LST: "Yohimbine",
            SELF_IMPORT_SEQ: "20269319",
          },
        ]),
      },
    );

    expect(assessment.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "FoodSafetyKorea I2715",
          severity: "high",
          agency: "식품의약품안전처",
          evidence: expect.objectContaining({
            count: 1,
            blockedFoods: [
              expect.objectContaining({
                productName: "ZEN-ERGY Oxy Xtreme",
                ingredientNames: "Yohimbine",
                sequence: "20269319",
              }),
            ],
          }),
        }),
      ]),
    );
    expect(assessment.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "FoodSafetyKorea I2715",
          confidence: "public_api",
        }),
      ]),
    );
  });
});
