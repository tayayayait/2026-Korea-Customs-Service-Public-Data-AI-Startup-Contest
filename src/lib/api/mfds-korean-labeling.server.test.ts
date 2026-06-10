import { describe, expect, it, vi } from "vitest";

import {
  IMPORTED_FOOD_KOREAN_LABELING_ENDPOINT,
  fetchImportedFoodKoreanLabelingItems,
} from "./mfds-api.server";

const createFetcher = (xml: string) =>
  vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));

const calledUrl = (fetcher: ReturnType<typeof createFetcher>) => {
  return new URL(fetcher.mock.calls[0][0] as string);
};

describe("mfds Korean labeling API", () => {
  it("fetches imported food product Korean labeling items", async () => {
    const fetcher = createFetcher(`
      <response>
        <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
        <body>
          <items>
            <item>
              <DCL_PRDUCT_SE_CD_NM>processed food</DCL_PRDUCT_SE_CD_NM>
              <BSN_OFC_NAME>Importer Co</BSN_OFC_NAME>
              <PRDUCT_KOREAN_NM>Sample Gummies</PRDUCT_KOREAN_NM>
              <PRDUCT_NM>Vitamin C Gummies</PRDUCT_NM>
              <OVSMNFST_NM>Sample Manufacturer</OVSMNFST_NM>
              <ITM_NM>gummy candy</ITM_NM>
              <XPORT_NTNCD_NM>United States</XPORT_NTNCD_NM>
              <MNF_NTNCD_NM>United States</MNF_NTNCD_NM>
              <KORLABEL>product label text</KORLABEL>
              <IRDNT_NM>Vitamin C, gelatin</IRDNT_NM>
            </item>
          </items>
        </body>
      </response>
    `);

    const items = await fetchImportedFoodKoreanLabelingItems({
      serviceKey: "service-key",
      productDivisionName: "processed food",
      importerName: "Importer Co",
      productKoreanName: "Sample Gummies",
      productName: "Vitamin C Gummies",
      overseasManufacturerName: "Sample Manufacturer",
      itemName: "gummy candy",
      exportCountry: "United States",
      manufacturerCountry: "United States",
      ingredientName: "Vitamin C",
      pageNo: 2,
      numOfRows: 5,
      fetcher,
    });

    const url = calledUrl(fetcher);
    expect(url.origin + url.pathname).toBe(IMPORTED_FOOD_KOREAN_LABELING_ENDPOINT);
    expect(url.searchParams.get("serviceKey")).toBe("service-key");
    expect(url.searchParams.get("dclPrductSeCdNm")).toBe("processed food");
    expect(url.searchParams.get("bsnOfcName")).toBe("Importer Co");
    expect(url.searchParams.get("prductKoreanNm")).toBe("Sample Gummies");
    expect(url.searchParams.get("prductNm")).toBe("Vitamin C Gummies");
    expect(url.searchParams.get("ovsmnfstNm")).toBe("Sample Manufacturer");
    expect(url.searchParams.get("itmNm")).toBe("gummy candy");
    expect(url.searchParams.get("xportNtncdNm")).toBe("United States");
    expect(url.searchParams.get("mnfNtncdNm")).toBe("United States");
    expect(url.searchParams.get("irdntNm")).toBe("Vitamin C");
    expect(url.searchParams.get("pageNo")).toBe("2");
    expect(url.searchParams.get("numOfRows")).toBe("5");
    expect(url.searchParams.get("type")).toBe("xml");
    expect(items).toEqual([
      {
        DCL_PRDUCT_SE_CD_NM: "processed food",
        BSN_OFC_NAME: "Importer Co",
        PRDUCT_KOREAN_NM: "Sample Gummies",
        PRDUCT_NM: "Vitamin C Gummies",
        OVSMNFST_NM: "Sample Manufacturer",
        ITM_NM: "gummy candy",
        XPORT_NTNCD_NM: "United States",
        MNF_NTNCD_NM: "United States",
        KORLABEL: "product label text",
        IRDNT_NM: "Vitamin C, gelatin",
      },
    ]);
  });
});
