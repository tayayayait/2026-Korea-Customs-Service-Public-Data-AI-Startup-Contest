DROP POLICY IF EXISTS "Anyone can insert scan cases" ON public.scan_cases;
DROP POLICY IF EXISTS "Anyone can update scan cases" ON public.scan_cases;
REVOKE INSERT, UPDATE ON public.scan_cases FROM anon, authenticated;
GRANT SELECT ON public.scan_cases TO anon, authenticated;
