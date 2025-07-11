-- Migration: Comprehensive fix for all supabase_uid references
-- Description: This migration ensures all database objects are updated to use auth_user_id
-- This handles any edge cases where previous migrations may have been partially applied

BEGIN;

-- Step 1: Drop ALL existing policies on player_claims to ensure clean slate
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT pol.polname
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname = 'player_claims'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON player_claims', policy_record.polname);
    RAISE NOTICE 'Dropped policy: %', policy_record.polname;
  END LOOP;
END
$$;

-- Step 2: Recreate ALL policies with correct column names
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

-- Step 3: Update all functions that might reference the old column
-- Update current_player_id function
CREATE OR REPLACE FUNCTION current_player_id()
RETURNS uuid AS $$
  SELECT player_id FROM player_claims WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE
SECURITY DEFINER;

-- Update claim_player function to use auth_user_id
CREATE OR REPLACE FUNCTION claim_player(player_id uuid)
RETURNS void AS $$
DECLARE
  v_player_id uuid := player_id;
BEGIN
  -- Validate input
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Player ID cannot be null';
  END IF;

  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to claim a player';
  END IF;

  -- Check if user already has a claim
  IF EXISTS (SELECT 1 FROM player_claims WHERE auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User has already claimed a player';
  END IF;
  
  -- Check if player exists
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = v_player_id) THEN
    RAISE EXCEPTION 'Player with ID % does not exist', v_player_id;
  END IF;
  
  -- Check if player is already claimed
  IF EXISTS (SELECT 1 FROM player_claims pc WHERE pc.player_id = v_player_id) THEN
    RAISE EXCEPTION 'Player has already been claimed';
  END IF;
  
  -- Create the claim
  INSERT INTO player_claims (player_id, auth_user_id, claimed_at)
  VALUES (v_player_id, auth.uid(), NOW());
  
  -- Log the claim for audit purposes
  RAISE NOTICE 'Player % claimed by user %', v_player_id, auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION current_player_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION claim_player(uuid) TO authenticated;

-- Step 5: Comprehensive verification
DO $$
DECLARE
  error_count integer := 0;
  error_details text := '';
BEGIN
  -- Check for any policies using supabase_uid
  SELECT COUNT(*) INTO error_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND (
    pol.polqual::text LIKE '%supabase_uid%' OR
    pol.polwithcheck::text LIKE '%supabase_uid%'
  );
  
  IF error_count > 0 THEN
    error_details := error_details || format('Found %s policies still using supabase_uid. ', error_count);
  END IF;
  
  -- Check for any functions using supabase_uid (excluding test/verification functions)
  SELECT COUNT(*) INTO error_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname NOT LIKE '%verify%'
  AND p.proname NOT LIKE '%test%'
  AND p.proname NOT LIKE '%check%'
  AND p.proname NOT LIKE '%fix%'
  AND p.proname NOT LIKE '%comprehensive%'
  AND p.prosrc LIKE '%supabase_uid%';
  
  IF error_count > 0 THEN
    error_details := error_details || format('Found %s functions still using supabase_uid. ', error_count);
  END IF;
  
  -- Check that the column exists with correct name
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player_claims' 
    AND column_name = 'auth_user_id'
  ) THEN
    error_details := error_details || 'Column auth_user_id does not exist in player_claims table. ';
  END IF;
  
  -- Check that old column doesn't exist
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player_claims' 
    AND column_name = 'supabase_uid'
  ) THEN
    error_details := error_details || 'Old column supabase_uid still exists in player_claims table. ';
  END IF;
  
  -- If any errors found, raise exception
  IF error_details != '' THEN
    RAISE EXCEPTION 'Migration verification failed: %', error_details;
  END IF;
  
  RAISE NOTICE 'All verifications passed - database is correctly using auth_user_id';
END
$$;

-- Step 6: List all policies on player_claims for confirmation
DO $$
DECLARE
  policy_info text;
BEGIN
  SELECT string_agg(
    format('%s (%s)', pol.polname, pol.polcmd), 
    ', ' ORDER BY pol.polname
  ) INTO policy_info
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relname = 'player_claims';
  
  RAISE NOTICE 'Player claims policies after migration: %', COALESCE(policy_info, 'none');
END
$$;

COMMIT;

-- Migration completed
SELECT 'Comprehensive supabase_uid fix completed at ' || NOW() AS status;