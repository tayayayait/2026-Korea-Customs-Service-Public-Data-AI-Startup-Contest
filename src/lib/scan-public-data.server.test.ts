import { describe, expect, it, vi } from "vitest";

import { buildPublicDataAssessment } from "./scan-public-data.server";
import type { ExtractedProduct, HsCandidate } from "./scan-logic";

const product: ExtractedProduct = {
  rawTitle: "Chocolate supplement",
  translatedTitleKo: "초콜릿 보충제",
  brand: "Sample",
  category: "food",
  intendedUse: "snack",
  materials: [],
  ingredients: ["카페인", "비타민"],
  originCountry: "미국",
  riskKeywords: [],
  confidence: 0.92,
};

const selectedHs: HsCandidate = {
  hsCode: "2106909099",
  hsNameKo: "기타 조제식료품",
  hsNameEn: "Other food preparations",
  matchReason: "food supplement",
  confidence: 0.84,
};

describe("scan-public-data.server", () => {
  it("builds findings, tax, and evidence from public API responses", async () => {
    const assessment = await buildPublicDataAssessment(
      {
        product,
        selectedHs,
        itemPrice: 100,
        shippingFee: 10,
        currency: "USD",
      },
      {
        dataGoKrApiKey: "service-key",
        now: () => new Date("2026-01-08T00:00:00.000Z"),
        fetchCustomsRequirementItems: vi.fn().mockResolvedValue([
          {
            hsSgn: "2106909099",
            dcerCfrmLworNm: "수입식품안전관리 특별법",
            reqApreIttNm: "식품의약품안전처",
            reqCfrmIstmNm: "식품",
          },
        ]),
        fetchCustomsFxRates: vi.fn().mockResolvedValue([
          {
            currSgn: "USD",
            fxrt: "1350.00",
            aplyBgnDt: "20260108",
            imexTp: "수입",
          },
        ]),
        fetchImportedFoodProducts: vi.fn().mockResolvedValue([
          {
            PRDT_NM: "Chocolate supplement",
            PRDLST_NM: "기타가공품",
            MNFT_NATN_NM: "미국",
            IPRT_FOOD_MNG_NO: "MFDS-001",
          },
        ]),
        fetchImportedFoodIngredientCodes: vi.fn().mockResolvedValue([
          {
            CPNT_CD: "C001",
            KOR_NM: "카페인",
            ENG_NM: "Caffeine",
            USE_DIVS_CD_NM: "사용",
          },
        ]),
        fetchFoodRawMaterials: vi.fn().mockResolvedValue([
          {
            ORM_STD_NM: "비타민B2",
            ORM_STD_NM_ENG: "Riboflavin",
            ORM_STD_CD: "B1000084000000",
            IMPORT_YN: "N",
            PRV_NATN_CD: "US",
            GMO_YN: "N",
            USE_FLAG: "Y",
          },
        ]),
        fetchImportedFoodKoreanLabelingItems: vi.fn().mockResolvedValue([]),
        checkIngredientVector: vi.fn().mockResolvedValue([]),
      },
    );

    expect(assessment.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "관세청_세관장확인대상물품",
          severity: "high",
          agency: "식품의약품안전처",
          law: "수입식품안전관리 특별법",
          hsCode: "2106909099",
        }),
        expect.objectContaining({
          source: "식약처_수입식품 제품DB",
          severity: "medium",
        }),
        expect.objectContaining({
          source: "식약처_수입식품성분코드정보",
          severity: "medium",
        }),
        expect.objectContaining({
          source: "식약처_식품 원재료 정보 조회",
          severity: "info",
        }),
      ]),
    );
    const rawMaterialFinding = assessment.findings.find(
      (finding) => finding.source === "식약처_식품 원재료 정보 조회",
    );
    expect(rawMaterialFinding?.summary).toContain("비타민B2");
    expect(rawMaterialFinding?.evidence).toEqual(
      expect.objectContaining({
        count: 2,
        rawMaterials: [
          expect.objectContaining({
            name: "비타민B2",
            englishName: "Riboflavin",
            code: "B1000084000000",
            importYn: "N",
            originCountryCode: "US",
          }),
        ],
      }),
    );
    expect(assessment.tax.fxRate).toBe(1350);
    expect(assessment.tax.fxAppliedAt).toBe("20260108");
    expect(assessment.tax.fxSource).toBe("관세청_관세환율정보");
    expect(assessment.evidence.map((item) => item.source)).toEqual(
      expect.arrayContaining([
        "관세청_세관장확인대상물품",
        "관세청_관세환율정보",
        "식약처_수입식품 제품DB",
        "식약처_수입식품성분코드정보",
        "식약처_식품 원재료 정보 조회",
      ]),
    );
  });

  it("falls back to deterministic local rules when public APIs are unavailable", async () => {
    const assessment = await buildPublicDataAssessment(
      {
        product,
        selectedHs,
        itemPrice: 100,
        shippingFee: 0,
        currency: "USD",
      },
      {
        dataGoKrApiKey: "service-key",
        now: () => new Date("2026-01-08T00:00:00.000Z"),
        fetchCustomsRequirementItems: vi.fn().mockRejectedValue(new Error("network")),
        fetchCustomsFxRates: vi.fn().mockRejectedValue(new Error("network")),
        fetchImportedFoodProducts: vi.fn().mockRejectedValue(new Error("network")),
        fetchImportedFoodIngredientCodes: vi.fn().mockRejectedValue(new Error("network")),
        fetchFoodRawMaterials: vi.fn().mockRejectedValue(new Error("network")),
        fetchImportedFoodKoreanLabelingItems: vi.fn().mockRejectedValue(new Error("network")),
        checkIngredientVector: vi.fn().mockResolvedValue([]),
      },
    );

    expect(assessment.findings.length).toBeGreaterThan(0);
    expect(assessment.tax.fxSource).toBe("fallback");
    expect(assessment.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "공공데이터 API fallback",
          confidence: "fallback",
        }),
      ]),
    );
  });

  it("uses cached public API responses before calling external APIs", async () => {
    const externalFetch = vi.fn().mockResolvedValue([]);
    const cache = {
      read: vi.fn().mockImplementation((apiName: string) => {
        if (apiName === "customs_requirement") {
          return Promise.resolve([
            {
              hsSgn: "2106909099",
              dcerCfrmLworNm: "수입식품안전관리 특별법",
              reqApreIttNm: "식품의약품안전처",
              reqCfrmIstmNm: "식품",
            },
          ]);
        }
        if (apiName === "customs_fx") {
          return Promise.resolve([
            {
              currSgn: "USD",
              fxrt: "1320.00",
              aplyBgnDt: "20260108",
            },
          ]);
        }
        return Promise.resolve(undefined);
      }),
      write: vi.fn(),
    };

    const assessment = await buildPublicDataAssessment(
      {
        product: { ...product, category: "other", ingredients: [] },
        selectedHs,
        itemPrice: 100,
        shippingFee: 0,
        currency: "USD",
      },
      {
        dataGoKrApiKey: "service-key",
        now: () => new Date("2026-01-08T00:00:00.000Z"),
        cache,
        fetchCustomsRequirementItems: externalFetch,
        fetchCustomsFxRates: externalFetch,
      },
    );

    expect(externalFetch).not.toHaveBeenCalled();
    expect(assessment.tax.fxRate).toBe(1320);
    expect(assessment.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "관세청_세관장확인대상물품",
          confidence: "cache",
        }),
        expect.objectContaining({
          source: "관세청_관세환율정보",
          confidence: "cache",
        }),
      ]),
    );
  });
});
