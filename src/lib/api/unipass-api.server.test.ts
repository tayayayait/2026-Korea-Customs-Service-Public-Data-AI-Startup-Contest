import { describe, expect, it, vi } from "vitest";

import { UNIPASS_CARGO_PROGRESS_ENDPOINT, fetchCargoClearanceProgress } from "./unipass-api.server";

const createFetcher = (xml: string) =>
  vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));

describe("unipass-api.server", () => {
  it("fetches cargo clearance progress by cargo management number", async () => {
    const fetcher = createFetcher(`
      <cargCsclPrgsInfoQryRtnVo>
        <tCnt>1</tCnt>
        <cargCsclPrgsInfoQryVo>
          <cargMtNo>23ABCD123456</cargMtNo>
          <csclPrgsStts>수입신고수리</csclPrgsStts>
          <prcsDttm>20260608120000</prcsDttm>
        </cargCsclPrgsInfoQryVo>
      </cargCsclPrgsInfoQryRtnVo>
    `);

    const items = await fetchCargoClearanceProgress({
      apiKey: "unipass-key",
      cargoManagementNumber: "23ABCD123456",
      fetcher,
    });

    const url = new URL(fetcher.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(UNIPASS_CARGO_PROGRESS_ENDPOINT);
    expect(url.searchParams.get("crkyCn")).toBe("unipass-key");
    expect(url.searchParams.get("cargMtNo")).toBe("23ABCD123456");
    expect(items).toEqual([
      {
        cargMtNo: "23ABCD123456",
        csclPrgsStts: "수입신고수리",
        prcsDttm: "20260608120000",
      },
    ]);
  });
});
