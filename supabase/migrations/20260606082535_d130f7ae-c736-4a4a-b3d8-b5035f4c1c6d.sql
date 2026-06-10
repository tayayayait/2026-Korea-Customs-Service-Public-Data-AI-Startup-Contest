CREATE TABLE public.scan_cases (
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
