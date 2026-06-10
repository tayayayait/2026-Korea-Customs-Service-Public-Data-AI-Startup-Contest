import { XMLParser } from "fast-xml-parser";

export type PublicApiParamValue = string | number | boolean | null | undefined;
export type PublicApiParams = Record<string, PublicApiParamValue>;
export type PublicApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

export const buildPublicApiUrl = (baseUrl: string, params: PublicApiParams = {}): string => {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

export const parseXmlResponse = (xml: string): unknown => parser.parse(xml);

export const toArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

export const readPath = (value: unknown, path: string[]): unknown => {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
};

export const extractPublicApiError = (parsed: unknown): string | undefined => {
  const serviceErrorCandidates = [
    ["OpenAPI_ServiceResponse", "cmmMsgHeader", "returnAuthMsg"],
    ["OpenAPI_ServiceResponse", "cmmMsgHeader", "errMsg"],
    ["cargCsclPrgsInfoQryRtnVo", "ntceInfo"],
  ];

  for (const path of serviceErrorCandidates) {
    const value = readPath(parsed, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const resultCode = readPath(parsed, ["response", "header", "resultCode"]);
  const resultMessage = readPath(parsed, ["response", "header", "resultMsg"]);
  if (
    typeof resultCode === "string" &&
    resultCode.trim() &&
    resultCode.trim() !== "00" &&
    typeof resultMessage === "string" &&
    resultMessage.trim()
  ) {
    return resultMessage.trim();
  }

  return undefined;
};

export const getPublicApiResponseItems = <T>(parsed: unknown): T[] => {
  return toArray(
    readPath(parsed, ["response", "body", "items", "item"]) as T | T[] | null | undefined,
  );
};

export const requestPublicApi = async (
  url: string,
  options: {
    fetcher?: PublicApiFetcher;
    timeoutMs?: number;
    retryCount?: number;
  } = {},
): Promise<string> => {
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const retryCount = options.retryCount ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetcher(url, { signal: controller.signal });
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`Public API request failed with HTTP ${response.status}: ${text}`);
      }

      return text;
    } catch (error) {
      lastError = error;
      if (attempt >= retryCount) break;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Public API request failed");
};

export const requestPublicApiXml = async (
  url: string,
  options: {
    fetcher?: PublicApiFetcher;
    timeoutMs?: number;
    retryCount?: number;
  } = {},
): Promise<unknown> => {
  const xml = await requestPublicApi(url, options);
  const parsed = parseXmlResponse(xml);
  const error = extractPublicApiError(parsed);

  if (error) {
    throw new Error(`Public API error: ${error}`);
  }

  return parsed;
};
