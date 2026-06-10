import { describe, expect, it, vi } from "vitest";

import {
  CUSTOMS_FX_RATE_ENDPOINT,
  CUSTOMS_ITEM_COUNTRY_TRADE_ENDPOINT,
  CUSTOMS_REQUIREMENT_ENDPOINT,
  fetchCustomsFxRates,
  fetchItemCountryTradeStats,
  fetchCustomsRequirementItems,
} from "./customs-api.server";

const createFetcher = (xml: string) =>
  vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));

const calledUrl = (fetcher: ReturnType<typeof createFetcher>) => {
  return new URL(fetcher.mock.calls[0][0] as string);
};

describe("customs-api.server", () => {
  it("fetches customs confirmation requirement items by HS code", async () => {
    const fetcher = createFetcher(`
      <response>
        <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
        <body>
          <items>
            <item>
              <hsSgn>3307903000</hsSgn>
              <dcerCfrmLworCd>AA000</dcerCfrmLworCd>
              <dcerCfrmLworNm>수입식품안전관리 특별법</dcerCfrmLworNm>
              <reqApreIttNm>식품의약품안전처</reqApreIttNm>
              <reqCfrmIstmNm>화장품류</reqCfrmIstmNm>
            </item>
          </items>
        </body>
      </response>
    `);

    const items = await fetchCustomsRequirementItems({
      serviceKey: "service-key",
      hsCode: "3307903000",
      fetcher,
    });

    const url = calledUrl(fetcher);
    expect(url.origin + url.pathname).toBe(CUSTOMS_REQUIREMENT_ENDPOINT);
    expect(url.searchParams.get("serviceKey")).toBe("service-key");
    expect(url.searchParams.get("hsSgn")).toBe("3307903000");
    expect(url.searchParams.get("imexTpcd")).toBe("2");
    expect(items).toEqual([
      {
        hsSgn: "3307903000",
        dcerCfrmLworCd: "AA000",
        dcerCfrmLworNm: "수입식품안전관리 특별법",
        reqApreIttNm: "식품의약품안전처",
        reqCfrmIstmNm: "화장품류",
      },
    ]);
  });

  it("fetches import customs FX rates by applied begin date", async () => {
    const fetcher = createFetcher(`
      <response>
        <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
        <body>
          <items>
            <item>
              <cntySgn>US</cntySgn>
              <currSgn>USD</currSgn>
              <fxrt>1350.00</fxrt>
              <mtryUtNm>미국 달러</mtryUtNm>
              <aplyBgnDt>20260101</aplyBgnDt>
              <imexTp>수입</imexTp>
            </item>
          </items>
        </body>
      </response>
    `);

    const items = await fetchCustomsFxRates({
      serviceKey: "service-key",
      appliedBeginDate: "20260101",
      fetcher,
    });

    const url = calledUrl(fetcher);
    expect(url.origin + url.pathname).toBe(CUSTOMS_FX_RATE_ENDPOINT);
    expect(url.searchParams.get("serviceKey")).toBe("service-key");
    expect(url.searchParams.get("aplyBgnDt")).toBe("20260101");
    expect(url.searchParams.get("weekFxrtTpcd")).toBe("2");
    expect(items).toEqual([
      {
        cntySgn: "US",
        currSgn: "USD",
        fxrt: "1350.00",
        mtryUtNm: "미국 달러",
        aplyBgnDt: "20260101",
        imexTp: "수입",
      },
    ]);
  });

  it("fetches item-country trade stats by HS code and country", async () => {
    const fetcher = createFetcher(`
      <response>
        <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
        <body>
          <items>
            <item>
              <year>2026.01</year>
              <hsCd>3304</hsCd>
              <statCd>US</statCd>
              <statCdCntnKor1>미국</statCdCntnKor1>
              <impDlr>15515151</impDlr>
              <expDlr>29343051</expDlr>
              <balPayments>13827900</balPayments>
            </item>
          </items>
        </body>
      </response>
    `);

    const items = await fetchItemCountryTradeStats({
      serviceKey: "service-key",
      startYearMonth: "202601",
      endYearMonth: "202601",
      hsCode: "3304",
      countryCode: "US",
      fetcher,
    });

    const url = calledUrl(fetcher);
    expect(url.origin + url.pathname).toBe(CUSTOMS_ITEM_COUNTRY_TRADE_ENDPOINT);
    expect(url.searchParams.get("strtYymm")).toBe("202601");
    expect(url.searchParams.get("endYymm")).toBe("202601");
    expect(url.searchParams.get("hsSgn")).toBe("3304");
    expect(url.searchParams.get("cntyCd")).toBe("US");
    expect(items).toEqual([
      {
        year: "2026.01",
        hsCd: "3304",
        statCd: "US",
        statCdCntnKor1: "미국",
        impDlr: "15515151",
        expDlr: "29343051",
        balPayments: "13827900",
      },
    ]);
  });
});
