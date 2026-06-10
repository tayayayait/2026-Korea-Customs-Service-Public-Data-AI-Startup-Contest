import { assertServerConfig, getServerConfig } from "../config.server";
import { requestPublicApi, toArray, type PublicApiFetcher } from "./api-helpers.server";

export const FOODSAFETY_BLOCKED_DIRECT_IMPORT_ENDPOINT = "http://openapi.foodsafetykorea.go.kr/api";
export const FOODSAFETY_BLOCKED_DIRECT_IMPORT_SERVICE_ID = "I2715";

type FoodSafetyKoreaClientOptions = {
  apiKey?: string;
  fetcher?: PublicApiFetcher;
  timeoutMs?: number;
  retryCount?: number;
};

type FoodSafetyKoreaPagingOptions = {
  startIdx?: number;
  endIdx?: number;
  dataType?: "json";
};

export type BlockedDirectImportFoodItem = {
  PRDT_NM?: string;
  MUFC_NM?: string;
  MUFC_CNTRY_NM?: string;
  INGR_NM_LST?: string;
  STT_YMD?: string;
  END_YMD?: string;
  CRET_DTM?: string;
  LAST_UPDT_DTM?: string;
  IMAGE_URL?: string;
  SELF_IMPORT_SEQ?: string;
  BARCD_CTN?: string;
};

type BlockedDirectImportFoodsOptions = FoodSafetyKoreaClientOptions &
  FoodSafetyKoreaPagingOptions & {
    productName?: string;
    manufacturerName?: string;
    countryName?: string;
    ingredientName?: string;
  };

type FoodSafetyKoreaResponse = {
  I2715?: {
    RESULT?: {
      CODE?: string;
      MSG?: string;
    };
    row?: BlockedDirectImportFoodItem | BlockedDirectImportFoodItem[];
  };
};

const resolveFoodSafetyKoreaOptions = (options: FoodSafetyKoreaClientOptions) => {
  const config = options.apiKey
    ? getServerConfig()
    : assertServerConfig(["foodSafetyKoreaApiKey"], "FoodSafetyKorea API request");
  const apiKey = options.apiKey ?? config.foodSafetyKoreaApiKey;

  if (!apiKey) {
    throw new Error("Missing FoodSafetyKorea API key");
  }

  return {
    apiKey,
    fetcher: options.fetcher,
    timeoutMs: options.timeoutMs ?? config.publicApiTimeoutMs,
    retryCount: options.retryCount ?? config.publicApiRetryCount,
  };
};

const optionalPathParams = (options: BlockedDirectImportFoodsOptions) => {
  return [
    ["PRDT_NM", options.productName],
    ["MUFC_NM", options.manufacturerName],
    ["MUFC_CNTRY_NM", options.countryName],
    ["INGR_NM_LST", options.ingredientName],
  ]
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");
};

const buildBlockedDirectImportFoodsUrl = (
  apiKey: string,
  options: BlockedDirectImportFoodsOptions,
) => {
  const startIdx = options.startIdx ?? 1;
  const endIdx = options.endIdx ?? 20;
  const dataType = options.dataType ?? "json";
  const params = optionalPathParams(options);
  const basePath = `${FOODSAFETY_BLOCKED_DIRECT_IMPORT_ENDPOINT}/${encodeURIComponent(
    apiKey,
  )}/${FOODSAFETY_BLOCKED_DIRECT_IMPORT_SERVICE_ID}/${dataType}/${startIdx}/${endIdx}`;

  return params ? `${basePath}/${params}` : basePath;
};

export const fetchBlockedDirectImportFoods = async (
  options: BlockedDirectImportFoodsOptions,
): Promise<BlockedDirectImportFoodItem[]> => {
  const requestOptions = resolveFoodSafetyKoreaOptions(options);
  const url = buildBlockedDirectImportFoodsUrl(requestOptions.apiKey, options);
  const text = await requestPublicApi(url, requestOptions);
  const parsed = JSON.parse(text) as FoodSafetyKoreaResponse;
  const response = parsed.I2715;
  const resultCode = response?.RESULT?.CODE;

  if (resultCode === "INFO-200") {
    return [];
  }

  if (resultCode && resultCode !== "INFO-000") {
    throw new Error(`FoodSafetyKorea API error: ${response?.RESULT?.MSG ?? resultCode}`);
  }

  return toArray(response?.row);
};
