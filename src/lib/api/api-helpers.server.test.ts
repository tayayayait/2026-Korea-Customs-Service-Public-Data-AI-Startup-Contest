import { describe, expect, it, vi } from "vitest";

import {
  buildPublicApiUrl,
  extractPublicApiError,
  getPublicApiResponseItems,
  parseXmlResponse,
  requestPublicApi,
  requestPublicApiXml,
  toArray,
} from "./api-helpers.server";

describe("api-helpers.server", () => {
  it("builds a URL without double-encoding service keys", () => {
    const url = buildPublicApiUrl("https://example.test/open", {
      serviceKey: "abc==",
      query: "비타민",
      pageNo: 1,
      empty: undefined,
    });

    expect(url).toBe(
      "https://example.test/open?serviceKey=abc%3D%3D&query=%EB%B9%84%ED%83%80%EB%AF%BC&pageNo=1",
    );
  });

  it("parses nested XML responses and preserves item arrays", () => {
    const parsed = parseXmlResponse(`
      <response>
        <header>
          <resultCode>00</resultCode>
          <resultMsg>NORMAL SERVICE.</resultMsg>
        </header>
        <body>
          <items>
            <item><hsSgn>3307903000</hsSgn></item>
            <item><hsSgn>8518300000</hsSgn></item>
          </items>
        </body>
      </response>
    `);

    expect(toArray(parsed.response.body.items.item)).toEqual([
      { hsSgn: "3307903000" },
      { hsSgn: "8518300000" },
    ]);
  });

  it("extracts public API error messages from parsed responses", () => {
    const parsed = parseXmlResponse(`
      <OpenAPI_ServiceResponse>
        <cmmMsgHeader>
          <errMsg>SERVICE ERROR</errMsg>
          <returnAuthMsg>INVALID KEY</returnAuthMsg>
        </cmmMsgHeader>
      </OpenAPI_ServiceResponse>
    `);

    expect(extractPublicApiError(parsed)).toBe("INVALID KEY");
  });

  it("does not treat normal public API result messages as errors", () => {
    const parsed = parseXmlResponse(`
      <response>
        <header>
          <resultCode>00</resultCode>
          <resultMsg>NORMAL SERVICE.</resultMsg>
        </header>
      </response>
    `);

    expect(extractPublicApiError(parsed)).toBeUndefined();
  });

  it("reads standard response items as an array", () => {
    const parsed = parseXmlResponse(`
      <response>
        <body>
          <items>
            <item><name>A</name></item>
          </items>
        </body>
      </response>
    `);

    expect(getPublicApiResponseItems<{ name: string }>(parsed)).toEqual([{ name: "A" }]);
  });

  it("retries failed HTTP requests once before returning XML text", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("temporary", { status: 503 }))
      .mockResolvedValueOnce(new Response("<response />", { status: 200 }));

    const result = await requestPublicApi("https://example.test/open", {
      fetcher,
      timeoutMs: 1000,
      retryCount: 1,
    });

    expect(result).toBe("<response />");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("throws parsed public API errors after successful HTTP responses", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        `
          <response>
            <header>
              <resultCode>99</resultCode>
              <resultMsg>BLOCKED</resultMsg>
            </header>
          </response>
        `,
        { status: 200 },
      ),
    );

    await expect(requestPublicApiXml("https://example.test/open", { fetcher })).rejects.toThrow(
      "BLOCKED",
    );
  });
});
