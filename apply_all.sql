-- pg_trgm 확장 추가 (gin_trgm_ops 에러 방지)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.scan_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  risk_level TEXT NULL,
  risk_score INTEGER NULL,
  input_type TEXT NOT NULL,
  product_url TEXT NULL,
  product_text TEXT NULL,
  purchase_country TEXT NOT NULL,
  currency TEXT NOT NULL,
  item_price NUMERIC NOT NULL,
  shipping_fee NUMERIC NOT NULL DEFAULT 0,
  purchase_purpose TEXT NOT NULL DEFAULT 'personal',
  extracted JSONB NULL,
  hs_candidates JSONB NULL,
  selected_hs_code TEXT NULL,
  findings JSONB NULL,
  tax_estimate JSONB NULL,
  checklist JSONB NULL,
  evidence JSONB NULL,
  summary_ko TEXT NULL,
  action_recommendation TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

GRANT SELECT, INSERT, UPDATE ON public.scan_cases TO anon, authenticated;
GRANT ALL ON public.scan_cases TO service_role;

ALTER TABLE public.scan_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scan cases by id"
  ON public.scan_cases FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert scan cases"
  ON public.scan_cases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update scan cases"
  ON public.scan_cases FOR UPDATE
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can insert scan cases" ON public.scan_cases;
DROP POLICY IF EXISTS "Anyone can update scan cases" ON public.scan_cases;
REVOKE INSERT, UPDATE ON public.scan_cases FROM anon, authenticated;
GRANT SELECT ON public.scan_cases TO anon, authenticated;
CREATE TABLE IF NOT EXISTS public.api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  response_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (api_name, cache_key)
);

CREATE INDEX IF NOT EXISTS api_cache_api_name_idx ON public.api_cache (api_name);
CREATE INDEX IF NOT EXISTS api_cache_expires_at_idx ON public.api_cache (expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_cache TO service_role;

ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage api cache"
  ON public.api_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
CREATE TABLE IF NOT EXISTS hs_codes (
    hs_code TEXT PRIMARY KEY,
    name_ko TEXT NOT NULL,
    name_en TEXT,
    import_code TEXT,
    export_code TEXT,
    unit_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_hs_codes_name_ko ON hs_codes USING GIN (name_ko gin_trgm_ops);
-- 1. Enable RLS on scan_cases table if not already enabled
ALTER TABLE scan_cases ENABLE ROW LEVEL SECURITY;

-- 2. Create policy for insert: authenticated users can insert their own cases, anon users can also insert (with user_id = null)
-- Note: Currently the schema doesn't have `user_id`. We need to add it first.
ALTER TABLE scan_cases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON scan_cases;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON scan_cases;
DROP POLICY IF EXISTS "Enable insert for all users" ON scan_cases;
DROP POLICY IF EXISTS "Users can read own data or anonymous data" ON scan_cases;

-- 3. Policy: Anyone can insert (to allow non-logged-in users to scan)
CREATE POLICY "Enable insert for all users" 
ON scan_cases FOR INSERT 
WITH CHECK (true);

-- 4. Policy: Read access
-- A user can read a scan case if:
--   - The user_id is null (anonymous scan)
--   - The user_id matches the authenticated user's id
CREATE POLICY "Users can read own data or anonymous data" 
ON scan_cases FOR SELECT 
USING (
  user_id IS NULL OR user_id = auth.uid()
);

-- 5. Policy: Update/Delete (Optional, usually we only allow users to delete their own)
CREATE POLICY "Users can delete own data" 
ON scan_cases FOR DELETE 
USING (
  user_id = auth.uid()
);
