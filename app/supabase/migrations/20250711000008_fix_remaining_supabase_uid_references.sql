-- Migration: Fix any remaining supabase_uid references
-- Description: This migration ensures all RLS policies use auth_user_id instead of supabase_uid
-- This is a defensive migration to handle any edge cases where policies weren't properly updated

BEGIN;

-- First, let's check if the problematic policies exist
DO $$
DECLARE
  policy_exists boolean;
BEGIN
  -- Check if the old policies exist with supabase_uid references
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policy pol
    JOIN pg_class c ON pol.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname = 'player_claims'
    AND pol.polname IN ('player_claims_select_own', 'player_claims_insert_own')
    AND (
      pol.polqual::text LIKE '%supabase_uid%' OR
      pol.polwithcheck::text LIKE '%supabase_uid%'
    )
  ) INTO policy_exists;

  IF policy_exists THEN
    RAISE NOTICE 'Found policies with supabase_uid references - updating them';
    
    -- Drop the problematic policies
    DROP POLICY IF EXISTS "player_claims_select_own" ON player_claims;
    DROP POLICY IF EXISTS "player_claims_insert_own" ON player_claims;
    
    -- Recreate them with the correct column name
    CREATE POLICY "player_claims_select_own" ON player_claims
      FOR SELECT TO authenticated
      USING (auth_user_id = auth.uid());

    CREATE POLICY "player_claims_insert_own" ON player_claims
      FOR INSERT TO authenticated
      WITH CHECK (
        auth_user_id = auth.uid()
        AND NOT EXISTS (
          SELECT 1 FROM player_claims WHERE auth_user_id = auth.uid()
        )
      );
      
    RAISE NOTICE 'Policies successfully updated to use auth_user_id';
  ELSE
    RAISE NOTICE 'No policies found with supabase_uid references - checking if policies exist at all';
    
    -- Check if the policies exist at all
    SELECT EXISTS (
      SELECT 1 
      FROM pg_policy pol
      JOIN pg_class c ON pol.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
      AND c.relname = 'player_claims'
      AND pol.polname IN ('player_claims_select_own', 'player_claims_insert_own')
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
      RAISE NOTICE 'Policies do not exist - creating them';
      
      -- Create the policies with the correct column name
      CREATE POLICY "player_claims_select_own" ON player_claims
        FOR SELECT TO authenticated
        USING (auth_user_id = auth.uid());

      CREATE POLICY "player_claims_insert_own" ON player_claims
        FOR INSERT TO authenticated
        WITH CHECK (
          auth_user_id = auth.uid()
          AND NOT EXISTS (
            SELECT 1 FROM player_claims WHERE auth_user_id = auth.uid()
          )
        );
        
      RAISE NOTICE 'Policies created successfully';
    ELSE
      RAISE NOTICE 'Policies already exist with correct column references';
    END IF;
  END IF;
END
$$;

-- Also check and update the current_player_id function if needed
CREATE OR REPLACE FUNCTION current_player_id()
RETURNS uuid AS $$
  SELECT player_id FROM player_claims WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE
SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION current_player_id() TO authenticated, anon;

-- Final verification
DO $$
DECLARE
  bad_policies integer;
  bad_functions integer;
BEGIN
  -- Check for any policies still using supabase_uid
  SELECT COUNT(*)
  INTO bad_policies
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND (
    pol.polqual::text LIKE '%supabase_uid%' OR
    pol.polwithcheck::text LIKE '%supabase_uid%'
  );
  
  -- Check for any functions still using supabase_uid
  SELECT COUNT(*)
  INTO bad_functions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname NOT LIKE '%verify%'
  AND p.proname NOT LIKE '%test%'
  AND p.proname NOT LIKE '%check%'
  AND p.prosrc LIKE '%supabase_uid%';
  
  IF bad_policies > 0 THEN
    RAISE EXCEPTION 'Still found % policies using supabase_uid after migration', bad_policies;
  END IF;
  
  IF bad_functions > 0 THEN
    RAISE EXCEPTION 'Still found % functions using supabase_uid after migration', bad_functions;
  END IF;
  
  RAISE NOTICE 'Migration completed successfully - all references to supabase_uid have been updated';
END
$$;

COMMIT;