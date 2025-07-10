-- Migration: Fix all player_claims RLS policies
-- Description: Ensures all RLS policies are correctly set up after column rename
-- This finalizes the fix for authentication and player claim issues

BEGIN;

-- Drop all existing policies on player_claims
DROP POLICY IF EXISTS "player_claims_select_anon" ON player_claims;
DROP POLICY IF EXISTS "player_claims_select_authenticated" ON player_claims;
DROP POLICY IF EXISTS "player_claims_select_own" ON player_claims;
DROP POLICY IF EXISTS "player_claims_insert_own" ON player_claims;

-- Create new policies with correct column names

-- 1. Anonymous users can read all claims (for filtering)
CREATE POLICY "player_claims_select_anon" ON player_claims
  FOR SELECT TO anon
  USING (true);

-- 2. Authenticated users can read all claims (for filtering)
CREATE POLICY "player_claims_select_authenticated" ON player_claims
  FOR SELECT TO authenticated
  USING (true);

-- 3. Authenticated users can only insert their own claims
CREATE POLICY "player_claims_insert_own" ON player_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM player_claims WHERE auth_user_id = auth.uid()
    )
  );

-- 4. No updates allowed (claims are permanent)
-- No UPDATE policy means no updates are allowed

-- 5. Only the user who made the claim can delete it
CREATE POLICY "player_claims_delete_own" ON player_claims
  FOR DELETE TO authenticated
  USING (auth_user_id = auth.uid());

COMMIT;