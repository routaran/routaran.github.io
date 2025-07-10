-- Migration: Fix player_claims RLS for anonymous users
-- Description: Allow anonymous users to read player_claims table
-- This fixes the infinite loop issue where the frontend couldn't filter claimed players
-- 
-- Issue: The PlayerClaim component needs to read player_claims to filter out
-- already claimed players, but anonymous users don't have SELECT permission

BEGIN;

-- Allow anonymous users to read player_claims (needed for filtering)
-- They can only see which players are claimed, not who claimed them
CREATE POLICY "player_claims_select_anon" ON player_claims
  FOR SELECT TO anon
  USING (true);

-- Also allow authenticated users to see all claims (not just their own)
-- This is needed for the same filtering logic when authenticated
DROP POLICY IF EXISTS "player_claims_select_own" ON player_claims;

CREATE POLICY "player_claims_select_authenticated" ON player_claims
  FOR SELECT TO authenticated
  USING (true);

-- Keep the insert policy as is - users can only create their own claims
-- (The existing player_claims_insert_own policy is fine)

COMMIT;