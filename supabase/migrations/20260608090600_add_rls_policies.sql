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
