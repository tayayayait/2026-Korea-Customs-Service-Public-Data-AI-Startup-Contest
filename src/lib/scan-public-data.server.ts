import {
  fetchCustomsFxRates,
  fetchCustomsRequirementItems,
  type CustomsFxRateItem,
  type CustomsRequirementItem,
} from "./api/customs-api.server";
import {
  fetchBlockedDirectImportFoods,
  type BlockedDirectImportFoodItem,
} from "./api/foodsafety-api.server";
import {
  fetchFoodRawMaterials,
  fetchImportedFoodIngredientCodes,
  fetchImportedFoodKoreanLabelingItems,
  fetchImportedFoodProducts,
  type FoodRawMaterialItem,
  type ImportedFoodIngredientCodeItem,
  type ImportedFoodKoreanLabelingItem,
  type ImportedFoodProductItem,
} from "./api/mfds-api.server";
import {
  calculateTaxEstimate,
  generateFallbackFindings,
  type ExtractedProduct,
  type Finding,
  type HsCandidate,
  type TaxEstimate,
} from "./scan-logic";
import { buildFailureEvidence } from "./error-handler.server";

export type EvidenceItem = {
  source: string;
  purpose: string;
  timestamp: string;
  confidence: string;
  status?: string;
  errorCode?: string;
  message?: string;
};

type PublicDataAssessmentInput = {
  product: ExtractedProduct;
  selectedHs: HsCandidate;
  itemPrice: number;
  shippingFee: number;
  currency: string;
};

type PublicDataAssessmentDependencies = {
  dataGoKrApiKey?: string;
  foodSafetyKoreaApiKey?: string;
  publicApiTimeoutMs?: number;
  publicApiRetryCount?: number;
  now?: () => Date;
  cache?: PublicDataCache;
  fetchCustomsRequirementItems?: typeof fetchCustomsRequirementItems;
  fetchCustomsFxRates?: typeof fetchCustomsFxRates;
  fetchImportedFoodProducts?: typeof fetchImportedFoodProducts;
  fetchImportedFoodIngredientCodes?: typeof fetchImportedFoodIngredientCodes;
  fetchFoodRawMaterials?: typeof fetchFoodRawMaterials;
  fetchImportedFoodKoreanLabelingItems?: typeof fetchImportedFoodKoreanLabelingItems;
  fetchBlockedDirectImportFoods?: typeof fetchBlockedDirectImportFoods;
  checkIngredientVector?: (
    ingredientName: string,
  ) => Promise<Array<{ ingredient_name: string; similarity: number }>>;
};

type PublicDataAssessment = {
  findings: Finding[];
  tax: TaxEstimate;
  evidence: EvidenceItem[];
};

export type PublicDataCache = {
  read<T>(apiName: string, cacheKey: string): Promise<T | undefined>;
  write<T>(apiName: string, cacheKey: string, responseData: T, ttlMs: number): Promise<void>;
};

const FOOD_LIKE = new Set(["food", "health_supplement", "medical"]);
const MAX_INGREDIENT_LOOKUPS = 5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

const yyyymmdd = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const numberFromFxRate = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const publicApiCallOptions = (
  serviceKey: string,
  dependencies: PublicDataAssessmentDependencies,
) => ({
  serviceKey,
  timeoutMs: dependencies.publicApiTimeoutMs,
  retryCount: dependencies.publicApiRetryCount,
});

const addEvidence = (
  evidence: EvidenceItem[],
  source: string,
  purpose: string,
  timestamp: string,
  confidence: string,
) => {
  evidence.push({ source, purpose, timestamp, confidence });
};

const customsRequirementFinding = (
  item: CustomsRequirementItem,
  selectedHs: HsCandidate,
): Finding => ({
  source: "관세청_세관장확인대상물품",
  severity: "high",
  summary: `${item.reqCfrmIstmNm ?? selectedHs.hsNameKo} 품목은 통관 전 관계기관 확인 대상일 수 있습니다.`,
  agency: item.reqApreIttNm,
  law: item.dcerCfrmLworNm,
  hsCode: item.hsSgn ?? selectedHs.hsCode,
  evidence: { law: item.dcerCfrmLworNm, agency: item.reqApreIttNm },
});

const productDbFinding = (items: ImportedFoodProductItem[]): Finding => ({
  source: "식약처_수입식품 제품DB",
  severity: "medium",
  summary: `수입식품 제품DB에서 유사 제품 ${items.length}건이 확인되었습니다.`,
  agency: "식품의약품안전처",
  evidence: { count: items.length },
});

const ingredientCodeFinding = (items: ImportedFoodIngredientCodeItem[]): Finding => ({
  source: "식약처_수입식품성분코드정보",
  severity: "medium",
  summary: `수입식품 성분코드 정보에서 성분 ${items.length}건이 확인되었습니다.`,
  agency: "식품의약품안전처",
  evidence: { count: items.length },
});

const firstNonEmpty = (...values: Array<string | undefined>) =>
  values.find((value) => value !== undefined && value.trim().length > 0);

const rawMaterialDetails = (items: FoodRawMaterialItem[]) => {
  const seen = new Set<string>();

  return items
    .map((item) => {
      const name = firstNonEmpty(item.ORM_STD_NM, item.rprsnt_rawmtrl_nm);
      if (!name) return undefined;

      return {
        name,
        englishName: firstNonEmpty(item.ORM_STD_NM_ENG, item.eng_nm),
        code: item.ORM_STD_CD,
        importYn: item.IMPORT_YN,
        originCountryCode: item.PRV_NATN_CD,
        gmoYn: item.GMO_YN,
        useFlag: item.USE_FLAG,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined)
    .filter((item) => {
      const key = `${item.name}:${item.code ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const rawMaterialFinding = (items: FoodRawMaterialItem[]): Finding => {
  const details = rawMaterialDetails(items);
  const preview = details
    .slice(0, 5)
    .map((item) => item.name)
    .join(", ");

  return {
    source: "식약처_식품 원재료 정보 조회",
    severity: "info",
    summary:
      details.length > 0
        ? `식품 원재료 정보에서 원재료 ${items.length}건이 확인되었습니다: ${preview}${details.length > 5 ? " 외" : ""}.`
        : `식품 원재료 정보에서 원재료 ${items.length}건이 확인되었습니다.`,
    agency: "식품의약품안전처",
    evidence: {
      count: items.length,
      rawMaterials: details.slice(0, 10),
    },
  };
};

const blockedDirectImportFoodFinding = (items: BlockedDirectImportFoodItem[]): Finding => ({
  source: "FoodSafetyKorea I2715",
  severity: "high",
  summary: `FoodSafetyKorea 해외직구 위해식품 목록에서 ${items.length}건이 확인되었습니다. 구매 전 식약처 기준으로 재확인해야 합니다.`,
  agency: "식품의약품안전처",
  evidence: {
    count: items.length,
    blockedFoods: items.slice(0, 10).map((item) => ({
      productName: item.PRDT_NM,
      manufacturerName: item.MUFC_NM,
      countryName: item.MUFC_CNTRY_NM,
      ingredientNames: item.INGR_NM_LST,
      sequence: item.SELF_IMPORT_SEQ,
    })),
  },
});

const koreanLabelingFinding = (items: ImportedFoodKoreanLabelingItem[]): Finding => ({
  source: "MFDS Korean labeling",
  severity: "info",
  summary: `MFDS imported-food Korean labeling data matched ${items.length} item(s). Use label and ingredient text as product identity evidence.`,
  agency: "Ministry of Food and Drug Safety",
  evidence: { count: items.length },
});

const selectCurrencyRate = (items: CustomsFxRateItem[], currency: string) => {
  return items.find((item) => item.currSgn?.toUpperCase() === currency.toUpperCase());
};

const readThroughCache = async <T>(
  dependencies: PublicDataAssessmentDependencies,
  apiName: string,
  cacheKey: string,
  ttlMs: number,
  fetchFresh: () => Promise<T>,
): Promise<{ data: T; confidence: "cache" | "public_api" }> => {
  try {
    const cached = await dependencies.cache?.read<T>(apiName, cacheKey);
    if (cached !== undefined) return { data: cached, confidence: "cache" };
  } catch {
    // Cache must not block public API lookups.
  }

  const fresh = await fetchFresh();

  try {
    await dependencies.cache?.write(apiName, cacheKey, fresh, ttlMs);
  } catch {
    // Cache writes are best-effort.
  }

  return { data: fresh, confidence: "public_api" };
};

export const buildPublicDataAssessment = async (
  input: PublicDataAssessmentInput,
  dependencies: PublicDataAssessmentDependencies = {},
): Promise<PublicDataAssessment> => {
  const timestamp = (dependencies.now?.() ?? new Date()).toISOString();
  const appliedBeginDate = yyyymmdd(dependencies.now?.() ?? new Date());
  const evidence: EvidenceItem[] = [];
  const findings: Finding[] = [];
  const serviceKey = dependencies.dataGoKrApiKey;

  if (!serviceKey) {
    const tax = calculateTaxEstimate({
      itemPrice: input.itemPrice,
      shippingFee: input.shippingFee,
      currency: input.currency,
      category: input.product.category,
      fxSource: "fallback",
    });

    return {
      findings: generateFallbackFindings(input.product, input.selectedHs),
      tax,
      evidence: [
        {
          source: "공공데이터 API fallback",
          purpose: "DATA_GO_KR_API_KEY 미설정으로 로컬 규칙 사용",
          timestamp,
          confidence: "fallback",
        },
      ],
    };
  }

  const commonOptions = publicApiCallOptions(serviceKey, dependencies);

  const parallelTasks: Promise<void>[] = [];

  parallelTasks.push(
    (async () => {
      try {
        const requirementResult = await readThroughCache<CustomsRequirementItem[]>(
          dependencies,
          "customs_requirement",
          input.selectedHs.hsCode,
          ONE_DAY_MS,
          () =>
            (dependencies.fetchCustomsRequirementItems ?? fetchCustomsRequirementItems)({
              ...commonOptions,
              hsCode: input.selectedHs.hsCode,
            }),
        );
        const requirementItems = requirementResult.data;
        findings.push(
          ...requirementItems.map((item) => customsRequirementFinding(item, input.selectedHs)),
        );
        addEvidence(
          evidence,
          "관세청_세관장확인대상물품",
          `HS ${input.selectedHs.hsCode} 수입요건 조회`,
          timestamp,
          requirementResult.confidence,
        );
      } catch (error) {
        evidence.push(
          buildFailureEvidence({
            source: "관세청_세관장확인대상물품",
            purpose: "HS 수입요건 조회",
            timestamp,
            error,
          }),
        );
      }
    })(),
  );

  let fxRate: number | undefined;
  let usdFxRate: number | undefined;
  let fxAppliedAt: string | undefined;
  let fxSource = "fallback";

  parallelTasks.push(
    (async () => {
      if (input.currency.toUpperCase() === "KRW") {
        fxRate = 1;
        usdFxRate = undefined;
        fxAppliedAt = appliedBeginDate;
        fxSource = "KRW";
      } else {
        try {
          const fxResult = await readThroughCache<CustomsFxRateItem[]>(
            dependencies,
            "customs_fx",
            appliedBeginDate,
            ONE_WEEK_MS,
            () =>
              (dependencies.fetchCustomsFxRates ?? fetchCustomsFxRates)({
                ...commonOptions,
                appliedBeginDate,
              }),
          );
          const fxItems = fxResult.data;
          const currencyRate = selectCurrencyRate(fxItems, input.currency);
          const usdRate = selectCurrencyRate(fxItems, "USD");
          fxRate = numberFromFxRate(currencyRate?.fxrt);
          usdFxRate = numberFromFxRate(usdRate?.fxrt);
          fxAppliedAt = currencyRate?.aplyBgnDt ?? usdRate?.aplyBgnDt ?? appliedBeginDate;
          if (fxRate) fxSource = "관세청_관세환율정보";
          addEvidence(
            evidence,
            "관세청_관세환율정보",
            `${input.currency} 수입 환율 조회`,
            timestamp,
            fxResult.confidence,
          );
        } catch (error) {
          evidence.push(
            buildFailureEvidence({
              source: "관세청_관세환율정보",
              purpose: `${input.currency} 수입 환율 조회`,
              timestamp,
              error,
            }),
          );
        }
      }
    })(),
  );

  if (FOOD_LIKE.has(input.product.category) || input.product.ingredients.length > 0) {
    const productName = input.product.rawTitle || input.product.translatedTitleKo;
    const ingredients = input.product.ingredients.slice(0, MAX_INGREDIENT_LOOKUPS);

    parallelTasks.push(
      (async () => {
        try {
          const productResult = await readThroughCache<ImportedFoodProductItem[]>(
            dependencies,
            "mfds_imported_food_product",
            `${productName}:${input.product.originCountry}`,
            ONE_DAY_MS,
            () =>
              (dependencies.fetchImportedFoodProducts ?? fetchImportedFoodProducts)({
                ...commonOptions,
                productName,
                manufacturerCountry: input.product.originCountry,
              }),
          );
          const productItems = productResult.data;
          if (productItems.length > 0) findings.push(productDbFinding(productItems));
          addEvidence(
            evidence,
            "식약처_수입식품 제품DB",
            "제품명/제조국 기반 유사 제품 조회",
            timestamp,
            productResult.confidence,
          );
        } catch (error) {
          evidence.push(
            buildFailureEvidence({
              source: "식약처_수입식품 제품DB",
              purpose: "제품명/제조국 기반 유사 제품 조회",
              timestamp,
              error,
            }),
          );
        }
      })(),
    );

    parallelTasks.push(
      (async () => {
        try {
          const ingredientResults = (
            await Promise.all(
              ingredients.map((ingredient) =>
                readThroughCache<ImportedFoodIngredientCodeItem[]>(
                  dependencies,
                  "mfds_imported_food_ingredient_code",
                  ingredient,
                  ONE_DAY_MS,
                  () =>
                    (
                      dependencies.fetchImportedFoodIngredientCodes ??
                      fetchImportedFoodIngredientCodes
                    )({
                      ...commonOptions,
                      koreanName: ingredient,
                    }),
                ).then((result) => result.data),
              ),
            )
          ).flat();
          if (ingredientResults.length > 0) findings.push(ingredientCodeFinding(ingredientResults));
          addEvidence(
            evidence,
            "식약처_수입식품성분코드정보",
            "성분명 기반 성분코드 조회",
            timestamp,
            "public_api",
          );
        } catch (error) {
          evidence.push(
            buildFailureEvidence({
              source: "식약처_수입식품성분코드정보",
              purpose: "성분명 기반 성분코드 조회",
              timestamp,
              error,
            }),
          );
        }
      })(),
    );

    parallelTasks.push(
      (async () => {
        try {
          const rawMaterialResults = (
            await Promise.all(
              ingredients.map((ingredient) =>
                readThroughCache<FoodRawMaterialItem[]>(
                  dependencies,
                  "mfds_food_raw_material",
                  ingredient,
                  ONE_DAY_MS,
                  () =>
                    (dependencies.fetchFoodRawMaterials ?? fetchFoodRawMaterials)({
                      ...commonOptions,
                      rawMaterialName: ingredient,
                    }),
                ).then((result) => result.data),
              ),
            )
          ).flat();
          if (rawMaterialResults.length > 0) findings.push(rawMaterialFinding(rawMaterialResults));
          addEvidence(
            evidence,
            "식약처_식품 원재료 정보 조회",
            "성분명 기반 원재료 조회",
            timestamp,
            "public_api",
          );
        } catch (error) {
          evidence.push(
            buildFailureEvidence({
              source: "식약처_식품 원재료 정보 조회",
              purpose: "성분명 기반 원재료 조회",
              timestamp,
              error,
            }),
          );
        }
      })(),
    );

    parallelTasks.push(
      (async () => {
        try {
          const labelingLookups = [
            {
              cacheKey: `product:${productName}:${input.product.originCountry}`,
              productName,
              manufacturerCountry: input.product.originCountry,
            },
            ...ingredients.map((ingredient) => ({
              cacheKey: `ingredient:${ingredient}:${input.product.originCountry}`,
              ingredientName: ingredient,
              manufacturerCountry: input.product.originCountry,
            })),
          ];
          const labelingResults = await Promise.all(
            labelingLookups.map((lookup) =>
              readThroughCache<ImportedFoodKoreanLabelingItem[]>(
                dependencies,
                "mfds_imported_food_korean_labeling",
                lookup.cacheKey,
                ONE_DAY_MS,
                () =>
                  (
                    dependencies.fetchImportedFoodKoreanLabelingItems ??
                    fetchImportedFoodKoreanLabelingItems
                  )({
                    ...commonOptions,
                    productName: "productName" in lookup ? lookup.productName : undefined,
                    manufacturerCountry: lookup.manufacturerCountry,
                    ingredientName: "ingredientName" in lookup ? lookup.ingredientName : undefined,
                  }),
              ),
            ),
          );
          const seen = new Set<string>();
          const labelingItems = labelingResults
            .flatMap((result) => result.data)
            .filter((item) => {
              const key = `${item.PRDUCT_NM ?? ""}:${item.PRDUCT_KOREAN_NM ?? ""}:${
                item.BSN_OFC_NAME ?? ""
              }:${item.IRDNT_NM ?? ""}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });

          if (labelingItems.length > 0) findings.push(koreanLabelingFinding(labelingItems));
          addEvidence(
            evidence,
            "MFDS Korean labeling",
            "Imported-food label and ingredient lookup",
            timestamp,
            labelingResults.some((result) => result.confidence === "public_api")
              ? "public_api"
              : "cache",
          );
        } catch (error) {
          evidence.push(
            buildFailureEvidence({
              source: "MFDS Korean labeling",
              purpose: "Imported-food label and ingredient lookup",
              timestamp,
              error,
            }),
          );
        }
      })(),
    );

    parallelTasks.push(
      (async () => {
        if (dependencies.foodSafetyKoreaApiKey) {
          try {
            const lookups = [
              {
                cacheKey: `product:${productName}:${input.product.originCountry}`,
                productName,
                countryName: input.product.originCountry,
              },
              ...ingredients.map((ingredient) => ({
                cacheKey: `ingredient:${ingredient}:${input.product.originCountry}`,
                ingredientName: ingredient,
                countryName: input.product.originCountry,
              })),
            ];
            const lookupResults = await Promise.all(
              lookups.map((lookup) =>
                readThroughCache<BlockedDirectImportFoodItem[]>(
                  dependencies,
                  "foodsafety_i2715",
                  lookup.cacheKey,
                  ONE_DAY_MS,
                  () =>
                    (dependencies.fetchBlockedDirectImportFoods ?? fetchBlockedDirectImportFoods)({
                      apiKey: dependencies.foodSafetyKoreaApiKey,
                      timeoutMs: dependencies.publicApiTimeoutMs,
                      retryCount: dependencies.publicApiRetryCount,
                      productName: "productName" in lookup ? lookup.productName : undefined,
                      countryName: lookup.countryName,
                      ingredientName:
                        "ingredientName" in lookup ? lookup.ingredientName : undefined,
                    }),
                ),
              ),
            );
            const seen = new Set<string>();
            const blockedItems = lookupResults
              .flatMap((result) => result.data)
              .filter((item) => {
                const key =
                  item.SELF_IMPORT_SEQ ||
                  `${item.PRDT_NM ?? ""}:${item.MUFC_NM ?? ""}:${item.INGR_NM_LST ?? ""}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });

            if (blockedItems.length > 0)
              findings.push(blockedDirectImportFoodFinding(blockedItems));
            addEvidence(
              evidence,
              "FoodSafetyKorea I2715",
              "Blocked overseas direct purchase food lookup",
              timestamp,
              lookupResults.some((result) => result.confidence === "public_api")
                ? "public_api"
                : "cache",
            );
          } catch (error) {
            evidence.push(
              buildFailureEvidence({
                source: "FoodSafetyKorea I2715",
                purpose: "Blocked overseas direct purchase food lookup",
                timestamp,
                error,
              }),
            );
          }
        } else {
          addEvidence(
            evidence,
            "FoodSafetyKorea I2715",
            "FOODSAFETY_KOREA_API_KEY not configured; lookup skipped",
            timestamp,
            "not_configured",
          );
        }
      })(),
    );

    parallelTasks.push(
      (async () => {
        try {
          const checkIngredientVector =
            dependencies.checkIngredientVector ??
            (await import("./api/vector-search.server")).checkIngredientVector;
          let matchCount = 0;
          for (const ingredient of ingredients) {
            const matches = await checkIngredientVector(ingredient);
            if (matches && matches.length > 0) {
              matchCount++;
              findings.push({
                source: "식약처 위해성분 (AI 벡터 검색)",
                severity: "high",
                summary: `'${ingredient}' 성분이 반입차단 성분 '${matches[0].ingredient_name}'과(와) 유사합니다 (유사도: ${Math.round(matches[0].similarity * 100)}%).`,
                agency: "식품의약품안전처",
                evidence: {
                  similarity: matches[0].similarity,
                  matched_ingredient: matches[0].ingredient_name,
                },
              });
            }
          }
          addEvidence(
            evidence,
            "식약처 위해성분 (AI 벡터 검색)",
            "pgvector 유사도 기반 위해성분 검출",
            timestamp,
            "ai_vector",
          );
        } catch (error) {
          evidence.push(
            buildFailureEvidence({
              source: "식약처 위해성분 (AI 벡터 검색)",
              purpose: "pgvector 유사도 기반 위해성분 검출",
              timestamp,
              error,
            }),
          );
        }
      })(),
    );
  }

  await Promise.allSettled(parallelTasks);

  if (findings.length === 0) {
    findings.push(...generateFallbackFindings(input.product, input.selectedHs));
    addEvidence(
      evidence,
      "공공데이터 API fallback",
      "공공 API 결과 없음 또는 실패로 로컬 규칙 사용",
      timestamp,
      "fallback",
    );
  }

  const tax = calculateTaxEstimate({
    itemPrice: input.itemPrice,
    shippingFee: input.shippingFee,
    currency: input.currency,
    category: input.product.category,
    fxRate,
    usdFxRate,
    fxAppliedAt,
    fxSource,
  });

  if (
    fxSource === "fallback" &&
    !evidence.some((item) => item.source === "공공데이터 API fallback")
  ) {
    addEvidence(
      evidence,
      "공공데이터 API fallback",
      "관세환율 조회 실패로 fallback 환율 사용",
      timestamp,
      "fallback",
    );
  }

  return { findings, tax, evidence };
};
