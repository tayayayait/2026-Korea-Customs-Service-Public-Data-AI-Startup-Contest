CREATE TABLE public.api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  response_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (api_name, cache_key)
);

CREATE INDEX api_cache_api_name_idx ON public.api_cache (api_name);
CREATE INDEX api_cache_expires_at_idx ON public.api_cache (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_cache TO service_role;

ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage api cache"
  ON public.api_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
