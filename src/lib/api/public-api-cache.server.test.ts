import { describe, expect, it, vi } from "vitest";

import { createSupabasePublicDataCache } from "./public-api-cache.server";

describe("public-api-cache.server", () => {
  it("reads unexpired cached response data", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { response_data: { ok: true } },
        error: null,
      }),
    };
    const client = {
      from: vi.fn().mockReturnValue(query),
    };
    const cache = createSupabasePublicDataCache(client, () => new Date("2026-01-08T00:00:00.000Z"));

    await expect(cache.read("customs_fx", "20260108")).resolves.toEqual({ ok: true });
    expect(client.from).toHaveBeenCalledWith("api_cache");
    expect(query.select).toHaveBeenCalledWith("response_data");
    expect(query.eq).toHaveBeenCalledWith("api_name", "customs_fx");
    expect(query.eq).toHaveBeenCalledWith("cache_key", "20260108");
    expect(query.gt).toHaveBeenCalledWith("expires_at", "2026-01-08T00:00:00.000Z");
  });

  it("writes cached response data with calculated expiry", async () => {
    const query = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const client = {
      from: vi.fn().mockReturnValue(query),
    };
    const cache = createSupabasePublicDataCache(client, () => new Date("2026-01-08T00:00:00.000Z"));

    await cache.write("customs_fx", "20260108", [{ currSgn: "USD" }], 60_000);

    expect(query.upsert).toHaveBeenCalledWith(
      {
        api_name: "customs_fx",
        cache_key: "20260108",
        response_data: [{ currSgn: "USD" }],
        cached_at: "2026-01-08T00:00:00.000Z",
        expires_at: "2026-01-08T00:01:00.000Z",
      },
      { onConflict: "api_name,cache_key" },
    );
  });
});
