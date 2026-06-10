import { assertServerConfig, getServerConfig } from "../config.server";
import {
  buildPublicApiUrl,
  getPublicApiResponseItems,
  requestPublicApiXml,
  type PublicApiFetcher,
  type PublicApiParams,
} from "./api-helpers.server";

export const IMPORTED_FOOD_PRODUCT_ENDPOINT =
  "http://apis.data.go.kr/1471000/IprtFoodPrdtDBService02/getIprtFoodPrdtDBInq02";
export const IMPORTED_FOOD_INGREDIENT_CODE_ENDPOINT =
  "http://apis.data.go.kr/1471000/IprtFoodCpntCdInfoFoodService/getIprtFoodCpntCdInfoFoodInq";
export const FOOD_RAW_MATERIAL_ENDPOINT =
  "http://apis.data.go.kr/1471000/FoodRwmtInfo/getFoodRwmtInfo";
export const IMPORTED_FOOD_KOREAN_LABELING_ENDPOINT =
  "http://apis.data.go.kr/1471000/IprtFoodPrdtKoreanLabelingItem/getIprtFoodPrdtKoreanLabelingItem";

type DataGoKrClientOptions = {
  serviceKey?: string;
  fetcher?: PublicApiFetcher;
  timeoutMs?: number;
  retryCount?: number;
};

type XmlPagingOptions = {
  pageNo?: number;
  numOfRows?: number;
  type?: "xml";
};

export type ImportedFoodProductItem = {
  DCLR_PRDT_DIVS_CD?: string;
  DCLR_PRDT_DIVS_NM?: string;
  MNFT_NATN_CD?: string;
  MNFT_NATN_NM?: string;
  PRDT_NM?: string;
  MEAT_PRDLST_CD?: string;
  MEAT_PRDLST_NM?: string;
  PRDLST_CD?: string;
  PRDLST_NM?: string;
  IPRT_FOOD_MNG_NO?: string;
};

export type ImportedFoodIngredientCodeItem = {
  CPNT_CD?: string;
  KOR_NM?: string;
  ENG_NM?: string;
  NKNM_INFO_CONT?: string;
  CPNT_LCLS_CD_NM?: string;
  USE_DIVS_CD_NM?: string;
};

export type FoodRawMaterialItem = {
  ORM_STD_NM?: string;
  HRNK_RAWMTRL_ORDNO?: string;
  ORM_ORDNO?: string;
  PRDLST_REPORT_LEDG_NO?: string;
  ORM_SPEC?: string;
  ORM_SPEC_UNIT?: string;
  GMO_YN?: string;
  IMPORT_YN?: string;
  PRV_NATN_CD?: string;
  REMARKS?: string;
  USE_FLAG?: string;
  ORM_STD_NM_ENG?: string;
  ENTP_CD?: string;
  ORM_STD_CD?: string;
  rprsnt_rawmtrl_nm?: string;
  eng_nm?: string;
  [key: string]: string | undefined;
};

export type ImportedFoodKoreanLabelingItem = {
  DCL_PRDUCT_SE_CD_NM?: string;
  BSN_OFC_NAME?: string;
  PRDUCT_KOREAN_NM?: string;
  PRDUCT_NM?: string;
  EXPIRDE_DTM?: string;
  PROCS_DTM?: string;
  OVSMNFST_NM?: string;
  ITM_NM?: string;
  XPORT_NTNCD_NM?: string;
  MNF_NTNCD_NM?: string;
  KORLABEL?: string;
  IRDNT_NM?: string;
  EXPIRDE_BEGIN_DTM?: string;
  EXPIRDE_END_DTM?: string;
};

type ImportedFoodProductsOptions = DataGoKrClientOptions &
  XmlPagingOptions & {
    declarationProductDivisionName?: string;
    manufacturerCountry?: string;
    productName?: string;
    itemName?: string;
  };

type ImportedFoodIngredientCodesOptions = DataGoKrClientOptions &
  XmlPagingOptions & {
    componentCode?: string;
    koreanName?: string;
    englishName?: string;
    componentClassName?: string;
  };

type FoodRawMaterialsOptions = DataGoKrClientOptions &
  XmlPagingOptions & {
    rawMaterialName?: string;
    standardRawMaterialCode?: string;
    importYn?: string;
    originCountryCode?: string;
    searchParams?: PublicApiParams;
  };

type ImportedFoodKoreanLabelingOptions = DataGoKrClientOptions &
  XmlPagingOptions & {
    productDivisionName?: string;
    importerName?: string;
    productKoreanName?: string;
    productName?: string;
    overseasManufacturerName?: string;
    itemName?: string;
    exportCountry?: string;
    manufacturerCountry?: string;
    koreanLabel?: string;
    ingredientName?: string;
    expirationBeginStart?: string;
    expirationBeginEnd?: string;
    expirationEndStart?: string;
    expirationEndEnd?: string;
    processedDateStart?: string;
    processedDateEnd?: string;
  };

const resolveDataGoKrOptions = (options: DataGoKrClientOptions) => {
  const config = options.serviceKey
    ? getServerConfig()
    : assertServerConfig(["dataGoKrApiKey"], "data.go.kr API request");
  const serviceKey = options.serviceKey ?? config.dataGoKrApiKey;

  if (!serviceKey) {
    throw new Error("Missing data.go.kr service key");
  }

  return {
    serviceKey,
    fetcher: options.fetcher,
    timeoutMs: options.timeoutMs ?? config.publicApiTimeoutMs,
    retryCount: options.retryCount ?? config.publicApiRetryCount,
  };
};

const pagingParams = (options: XmlPagingOptions): PublicApiParams => {
  return {
    pageNo: options.pageNo ?? 1,
    numOfRows: options.numOfRows ?? 10,
    type: options.type ?? "xml",
  };
};

export const fetchImportedFoodProducts = async (
  options: ImportedFoodProductsOptions,
): Promise<ImportedFoodProductItem[]> => {
  const requestOptions = resolveDataGoKrOptions(options);
  const url = buildPublicApiUrl(IMPORTED_FOOD_PRODUCT_ENDPOINT, {
    serviceKey: requestOptions.serviceKey,
    ...pagingParams(options),
    DCLR_PRDT_DIVS_NM: options.declarationProductDivisionName,
    MNFT_NATN_NM: options.manufacturerCountry,
    PRDT_NM: options.productName,
    PRDLST_NM: options.itemName,
  });
  const parsed = await requestPublicApiXml(url, requestOptions);

  return getPublicApiResponseItems<ImportedFoodProductItem>(parsed);
};

export const fetchImportedFoodIngredientCodes = async (
  options: ImportedFoodIngredientCodesOptions,
): Promise<ImportedFoodIngredientCodeItem[]> => {
  const requestOptions = resolveDataGoKrOptions(options);
  const url = buildPublicApiUrl(IMPORTED_FOOD_INGREDIENT_CODE_ENDPOINT, {
    serviceKey: requestOptions.serviceKey,
    ...pagingParams(options),
    CPNT_CD: options.componentCode,
    KOR_NM: options.koreanName,
    ENG_NM: options.englishName,
    CPNT_LCLS_CD_NM: options.componentClassName,
  });
  const parsed = await requestPublicApiXml(url, requestOptions);

  return getPublicApiResponseItems<ImportedFoodIngredientCodeItem>(parsed);
};

export const fetchFoodRawMaterials = async (
  options: FoodRawMaterialsOptions,
): Promise<FoodRawMaterialItem[]> => {
  const requestOptions = resolveDataGoKrOptions(options);
  const url = buildPublicApiUrl(FOOD_RAW_MATERIAL_ENDPOINT, {
    serviceKey: requestOptions.serviceKey,
    ...pagingParams(options),
    ORM_STD_NM: options.rawMaterialName,
    ORM_STD_CD: options.standardRawMaterialCode,
    IMPORT_YN: options.importYn,
    PRV_NATN_CD: options.originCountryCode,
    ...options.searchParams,
  });
  const parsed = await requestPublicApiXml(url, requestOptions);

  return getPublicApiResponseItems<FoodRawMaterialItem>(parsed);
};

export const fetchImportedFoodKoreanLabelingItems = async (
  options: ImportedFoodKoreanLabelingOptions,
): Promise<ImportedFoodKoreanLabelingItem[]> => {
  const requestOptions = resolveDataGoKrOptions(options);
  const url = buildPublicApiUrl(IMPORTED_FOOD_KOREAN_LABELING_ENDPOINT, {
    serviceKey: requestOptions.serviceKey,
    ...pagingParams(options),
    dclPrductSeCdNm: options.productDivisionName,
    bsnOfcName: options.importerName,
    prductKoreanNm: options.productKoreanName,
    prductNm: options.productName,
    ovsmnfstNm: options.overseasManufacturerName,
    itmNm: options.itemName,
    xportNtncdNm: options.exportCountry,
    mnfNtncdNm: options.manufacturerCountry,
    korlabel: options.koreanLabel,
    irdntNm: options.ingredientName,
    expirdeBeginDtmStart: options.expirationBeginStart,
    expirdeBeginDtmEnd: options.expirationBeginEnd,
    expirdeEndDtmStart: options.expirationEndStart,
    expirdeEndDtmEnd: options.expirationEndEnd,
    procsDtmStart: options.processedDateStart,
    procsDtmEnd: options.processedDateEnd,
  });
  const parsed = await requestPublicApiXml(url, requestOptions);

  return getPublicApiResponseItems<ImportedFoodKoreanLabelingItem>(parsed);
};
