import { describe, expect, it, vi } from "vitest";

import {
  fetchBlockedDirectImportFoods,
  FOODSAFETY_BLOCKED_DIRECT_IMPORT_ENDPOINT,
} from "./foodsafety-api.server";

const createFetcher = (json: string) =>
  vi.fn().mockResolvedValue(new Response(json, { status: 200 }));

const calledUrl = (fetcher: ReturnType<typeof createFetcher>) => {
  return new URL(fetcher.mock.calls[0][0] as string);
};

describe("foodsafety-api.server", () => {
  it("fetches blocked overseas direct purchase foods from I2715", async () => {
    const fetcher = createFetcher(
      JSON.stringify({
        I2715: {
          total_count: "1",
          RESULT: {
            CODE: "INFO-000",
            MSG: "OK",
          },
          row: [
            {
              PRDT_NM: "ZEN-ERGY Oxy Xtreme",
              MUFC_NM: "EPG EXTREME PRODUCTS GROUP",
              MUFC_CNTRY_NM: "United States",
              INGR_NM_LST: "Yohimbine",
              SELF_IMPORT_SEQ: "20269319",
              BARCD_CTN: "804879274308",
            },
          ],
        },
      }),
    );

    const items = await fetchBlockedDirectImportFoods({
      apiKey: "food-key",
      productName: "ZEN-ERGY",
      manufacturerName: "EPG",
      countryName: "United States",
      ingredientName: "Yohimbine",
      startIdx: 2,
      endIdx: 3,
      fetcher,
    });

    const url = calledUrl(fetcher);
    expect(url.origin + url.pathname.split("/api/food-key")[0] + "/api").toBe(
      FOODSAFETY_BLOCKED_DIRECT_IMPORT_ENDPOINT,
    );
    expect(decodeURIComponent(url.pathname)).toContain(
      "/food-key/I2715/json/2/3/PRDT_NM=ZEN-ERGY&MUFC_NM=EPG&MUFC_CNTRY_NM=United States&INGR_NM_LST=Yohimbine",
    );
    expect(items).toEqual([
      {
        PRDT_NM: "ZEN-ERGY Oxy Xtreme",
        MUFC_NM: "EPG EXTREME PRODUCTS GROUP",
        MUFC_CNTRY_NM: "United States",
        INGR_NM_LST: "Yohimbine",
        SELF_IMPORT_SEQ: "20269319",
        BARCD_CTN: "804879274308",
      },
    ]);
  });

  it("treats INFO-200 no-data responses as an empty result", async () => {
    const fetcher = createFetcher(
      JSON.stringify({
        I2715: {
          RESULT: {
            CODE: "INFO-200",
            MSG: "해당하는 데이터가 없습니다.",
          },
        },
      }),
    );

    await expect(
      fetchBlockedDirectImportFoods({
        apiKey: "food-key",
        productName: "not-found",
        fetcher,
      }),
    ).resolves.toEqual([]);
  });
});
