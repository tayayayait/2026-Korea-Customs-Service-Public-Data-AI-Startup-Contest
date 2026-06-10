import { describe, expect, it, vi } from "vitest";

import {
  FOOD_RAW_MATERIAL_ENDPOINT,
  IMPORTED_FOOD_INGREDIENT_CODE_ENDPOINT,
  IMPORTED_FOOD_PRODUCT_ENDPOINT,
  fetchFoodRawMaterials,
  fetchImportedFoodIngredientCodes,
  fetchImportedFoodProducts,
} from "./mfds-api.server";

const createFetcher = (xml: string) =>
  vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));

const calledUrl = (fetcher: ReturnType<typeof createFetcher>) => {
  return new URL(fetcher.mock.calls[0][0] as string);
};

describe("mfds-api.server", () => {
  it("fetches imported food product DB items", async () => {
    const fetcher = createFetcher(`
      <response>
        <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
        <body>
          <items>
            <item>
              <DCLR_PRDT_DIVS_NM>가공식품</DCLR_PRDT_DIVS_NM>
              <MNFT_NATN_NM>미국</MNFT_NATN_NM>
              <PRDT_NM>Chocolate Bar</PRDT_NM>
              <PRDLST_NM>초콜릿가공품</PRDLST_NM>
              <IPRT_FOOD_MNG_NO>ABC-001</IPRT_FOOD_MNG_NO>
            </item>
          </items>
        </body>
      </response>
    `);

    const items = await fetchImportedFoodProducts({
      serviceKey: "service-key",
      declarationProductDivisionName: "가공식품",
      manufacturerCountry: "미국",
      productName: "Chocolate Bar",
      itemName: "초콜릿가공품",
      pageNo: 2,
      numOfRows: 5,
      fetcher,
    });

    const url = calledUrl(fetcher);
    expect(url.origin + url.pathname).toBe(IMPORTED_FOOD_PRODUCT_ENDPOINT);
    expect(url.searchParams.get("serviceKey")).toBe("service-key");
    expect(url.searchParams.get("DCLR_PRDT_DIVS_NM")).toBe("가공식품");
    expect(url.searchParams.get("MNFT_NATN_NM")).toBe("미국");
    expect(url.searchParams.get("PRDT_NM")).toBe("Chocolate Bar");
    expect(url.searchParams.get("PRDLST_NM")).toBe("초콜릿가공품");
    expect(url.searchParams.get("pageNo")).toBe("2");
    expect(url.searchParams.get("numOfRows")).toBe("5");
    expect(url.searchParams.get("type")).toBe("xml");
    expect(items).toEqual([
      {
        DCLR_PRDT_DIVS_NM: "가공식품",
        MNFT_NATN_NM: "미국",
        PRDT_NM: "Chocolate Bar",
        PRDLST_NM: "초콜릿가공품",
        IPRT_FOOD_MNG_NO: "ABC-001",
      },
    ]);
  });

  it("fetches imported food ingredient code items", async () => {
    const fetcher = createFetcher(`
      <response>
        <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
        <body>
          <items>
            <item>
              <CPNT_CD>A001</CPNT_CD>
              <KOR_NM>카페인</KOR_NM>
              <ENG_NM>Caffeine</ENG_NM>
              <CPNT_LCLS_CD_NM>식품첨가물</CPNT_LCLS_CD_NM>
              <USE_DIVS_CD_NM>사용</USE_DIVS_CD_NM>
            </item>
          </items>
        </body>
      </response>
    `);

    const items = await fetchImportedFoodIngredientCodes({
      serviceKey: "service-key",
      koreanName: "카페인",
      englishName: "Caffeine",
      componentClassName: "식품첨가물",
      pageNo: 1,
      numOfRows: 10,
      fetcher,
    });

    const url = calledUrl(fetcher);
    expect(url.origin + url.pathname).toBe(IMPORTED_FOOD_INGREDIENT_CODE_ENDPOINT);
    expect(url.searchParams.get("serviceKey")).toBe("service-key");
    expect(url.searchParams.get("KOR_NM")).toBe("카페인");
    expect(url.searchParams.get("ENG_NM")).toBe("Caffeine");
    expect(url.searchParams.get("CPNT_LCLS_CD_NM")).toBe("식품첨가물");
    expect(items).toEqual([
      {
        CPNT_CD: "A001",
        KOR_NM: "카페인",
        ENG_NM: "Caffeine",
        CPNT_LCLS_CD_NM: "식품첨가물",
        USE_DIVS_CD_NM: "사용",
      },
    ]);
  });

  it("fetches food raw material items with caller-supplied search parameters", async () => {
    const fetcher = createFetcher(`
      <response>
        <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
        <body>
          <items>
            <item>
              <ORM_STD_NM>비타민B2</ORM_STD_NM>
              <ORM_STD_NM_ENG>Riboflavin</ORM_STD_NM_ENG>
              <IMPORT_YN>N</IMPORT_YN>
              <ORM_STD_CD>B1000084000000</ORM_STD_CD>
            </item>
          </items>
        </body>
      </response>
    `);

    const items = await fetchFoodRawMaterials({
      serviceKey: "service-key",
      rawMaterialName: "비타민",
      fetcher,
    });

    const url = calledUrl(fetcher);
    expect(url.origin + url.pathname).toBe(FOOD_RAW_MATERIAL_ENDPOINT);
    expect(url.searchParams.get("serviceKey")).toBe("service-key");
    expect(url.searchParams.get("type")).toBe("xml");
    expect(url.searchParams.get("ORM_STD_NM")).toBe("비타민");
    expect(items).toEqual([
      {
        ORM_STD_NM: "비타민B2",
        ORM_STD_NM_ENG: "Riboflavin",
        IMPORT_YN: "N",
        ORM_STD_CD: "B1000084000000",
      },
    ]);
  });
});
