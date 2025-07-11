-- Migration: Update RLS policies to use auth_user_id
-- Description: Updates all RLS policies that still reference supabase_uid to use auth_user_id
-- This completes the column rename by updating the security policies

BEGIN;

-- Drop existing policies that reference the old column name
DROP POLICY IF EXISTS "player_claims_select_own" ON player_claims;
DROP POLICY IF EXISTS "player_claims_insert_own" ON player_claims;

-- Recreate policies with the correct column name
-- Users can only view their own claims
CREATE POLICY "player_claims_select_own" ON player_claims
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Users can create their own claims (one-time only via claim_player function)
CREATE POLICY "player_claims_insert_own" ON player_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM player_claims WHERE auth_user_id = auth.uid()
    )
  );

-- Verify the policies are using the correct column
DO $$
DECLARE
  policy_count integer;
  policy_names text;
BEGIN
  -- Check if any policies still reference supabase_uid
  SELECT 
    COUNT(*),
    string_agg(pol.polname, ', ')
  INTO policy_count, policy_names
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relname = 'player_claims'
  AND (
    pol.polqual::text LIKE '%supabase_uid%' OR
    pol.polwithcheck::text LIKE '%supabase_uid%'
  );
  
  IF policy_count > 0 THEN
    RAISE EXCEPTION 'Found % policies still using supabase_uid: %', policy_count, policy_names;
  END IF;
  
  RAISE NOTICE 'All player_claims policies updated to use auth_user_id';
END
$$;

COMMIT;