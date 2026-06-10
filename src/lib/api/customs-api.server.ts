import { assertServerConfig, getServerConfig } from "../config.server";
import {
  buildPublicApiUrl,
  getPublicApiResponseItems,
  requestPublicApiXml,
  type PublicApiFetcher,
} from "./api-helpers.server";

export const CUSTOMS_REQUIREMENT_ENDPOINT =
  "http://apis.data.go.kr/1220000/retrieveCcctLworCd/getRetrieveCcctLworCd";
export const CUSTOMS_FX_RATE_ENDPOINT =
  "http://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo";
export const CUSTOMS_ITEM_COUNTRY_TRADE_ENDPOINT =
  "http://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList";

type DataGoKrClientOptions = {
  serviceKey?: string;
  fetcher?: PublicApiFetcher;
  timeoutMs?: number;
  retryCount?: number;
};

export type CustomsRequirementItem = {
  aplyStrtDt?: string;
  bfhnAffcRtmTpcd?: string;
  dcerCfrmLworCd?: string;
  dcerCfrmLworNm?: string;
  hsSgn?: string;
  reqApreIttCd?: string;
  reqApreIttNm?: string;
  reqCfrmIstmNm?: string;
};

export type CustomsFxRateItem = {
  cntySgn?: string;
  mtryUtNm?: string;
  fxrt?: string;
  currSgn?: string;
  aplyBgnDt?: string;
  imexTp?: string;
};

export type ItemCountryTradeStatItem = {
  year?: string;
  hsCd?: string;
  statCd?: string;
  statCdCntnKor1?: string;
  statKor?: string;
  impDlr?: string;
  impWgt?: string;
  expDlr?: string;
  expWgt?: string;
  balPayments?: string;
};

type CustomsRequirementOptions = DataGoKrClientOptions & {
  hsCode: string;
  importExportTypeCode?: "1" | "2";
};

type CustomsFxRateOptions = DataGoKrClientOptions & {
  appliedBeginDate: string;
  weeklyFxRateTypeCode?: "1" | "2";
};

type ItemCountryTradeStatsOptions = DataGoKrClientOptions & {
  startYearMonth: string;
  endYearMonth: string;
  hsCode: string;
  countryCode?: string;
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

export const fetchCustomsRequirementItems = async (
  options: CustomsRequirementOptions,
): Promise<CustomsRequirementItem[]> => {
  const requestOptions = resolveDataGoKrOptions(options);
  const url = buildPublicApiUrl(CUSTOMS_REQUIREMENT_ENDPOINT, {
    serviceKey: requestOptions.serviceKey,
    hsSgn: options.hsCode,
    imexTpcd: options.importExportTypeCode ?? "2",
  });
  const parsed = await requestPublicApiXml(url, requestOptions);

  return getPublicApiResponseItems<CustomsRequirementItem>(parsed);
};

export const fetchCustomsFxRates = async (
  options: CustomsFxRateOptions,
): Promise<CustomsFxRateItem[]> => {
  const requestOptions = resolveDataGoKrOptions(options);
  const url = buildPublicApiUrl(CUSTOMS_FX_RATE_ENDPOINT, {
    serviceKey: requestOptions.serviceKey,
    aplyBgnDt: options.appliedBeginDate,
    weekFxrtTpcd: options.weeklyFxRateTypeCode ?? "2",
  });
  const parsed = await requestPublicApiXml(url, requestOptions);

  return getPublicApiResponseItems<CustomsFxRateItem>(parsed);
};

export const fetchItemCountryTradeStats = async (
  options: ItemCountryTradeStatsOptions,
): Promise<ItemCountryTradeStatItem[]> => {
  const requestOptions = resolveDataGoKrOptions(options);
  const url = buildPublicApiUrl(CUSTOMS_ITEM_COUNTRY_TRADE_ENDPOINT, {
    serviceKey: requestOptions.serviceKey,
    strtYymm: options.startYearMonth,
    endYymm: options.endYearMonth,
    hsSgn: options.hsCode,
    cntyCd: options.countryCode,
  });
  const parsed = await requestPublicApiXml(url, requestOptions);

  return getPublicApiResponseItems<ItemCountryTradeStatItem>(parsed);
};
