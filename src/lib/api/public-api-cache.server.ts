import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PublicDataCache } from "../scan-public-data.server";

type SupabaseCacheClient = {
  from(table: string): unknown;
};

type SupabaseReadQuery = {
  select(columns: string): SupabaseReadQuery;
  eq(column: string, value: string): SupabaseReadQuery;
  gt(column: string, value: string): SupabaseReadQuery;
  maybeSingle(): Promise<{ data: { response_data: unknown } | null; error: unknown }>;
};

type SupabaseWriteQuery = {
  upsert(
    row: {
      api_name: string;
      cache_key: string;
      response_data: unknown;
      cached_at: string;
      expires_at: string;
    },
    options: { onConflict: string },
  ): Promise<{ error: unknown }>;
};

export const createSupabasePublicDataCache = (
  client: SupabaseCacheClient = supabaseAdmin,
  now: () => Date = () => new Date(),
): PublicDataCache => {
  return {
    async read<T>(apiName: string, cacheKey: string): Promise<T | undefined> {
      const query = client.from("api_cache") as SupabaseReadQuery;
      const { data, error } = await query
        .select("response_data")
        .eq("api_name", apiName)
        .eq("cache_key", cacheKey)
        .gt("expires_at", now().toISOString())
        .maybeSingle();

      if (error || !data) return undefined;
      return data.response_data as T;
    },

    async write<T>(
      apiName: string,
      cacheKey: string,
      responseData: T,
      ttlMs: number,
    ): Promise<void> {
      const cachedAt = now();
      const expiresAt = new Date(cachedAt.getTime() + ttlMs);
      const query = client.from("api_cache") as SupabaseWriteQuery;
      const { error } = await query.upsert(
        {
          api_name: apiName,
          cache_key: cacheKey,
          response_data: responseData,
          cached_at: cachedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "api_name,cache_key" },
      );

      if (error) {
        console.warn(`[public-api-cache] Failed to write cache for ${apiName}:${cacheKey}`, error);
      }
    },
  };
};

export const supabasePublicDataCache = createSupabasePublicDataCache();
