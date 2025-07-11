-- Migration: Ensure auth_user_id column exists before creating policies
-- Description: This migration handles the case where policies might be created before the column rename

BEGIN;

-- Step 1: Check if we still have the old column name
DO $$
DECLARE
  has_old_column boolean;
  has_new_column boolean;
BEGIN
  -- Check for old column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player_claims' 
    AND column_name = 'supabase_uid'
  ) INTO has_old_column;
  
  -- Check for new column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'player_claims' 
    AND column_name = 'auth_user_id'
  ) INTO has_new_column;
  
  IF has_old_column AND NOT has_new_column THEN
    RAISE NOTICE 'Found old column name - renaming to auth_user_id';
    
    -- First drop all policies that might reference the old column
    DROP POLICY IF EXISTS "player_claims_select_own" ON player_claims;
    DROP POLICY IF EXISTS "player_claims_insert_own" ON player_claims;
    
    -- Rename the column
    ALTER TABLE player_claims 
    RENAME COLUMN supabase_uid TO auth_user_id;
    
    -- Drop old constraint if exists
    ALTER TABLE player_claims 
    DROP CONSTRAINT IF EXISTS player_claims_unique_supabase_uid;
    
    -- Add new constraint
    ALTER TABLE player_claims 
    ADD CONSTRAINT player_claims_auth_user_id_key UNIQUE (auth_user_id);
    
  ELSIF has_old_column AND has_new_column THEN
    RAISE EXCEPTION 'Both supabase_uid and auth_user_id columns exist - database is in inconsistent state';
    
  ELSIF NOT has_old_column AND NOT has_new_column THEN
    RAISE EXCEPTION 'Neither supabase_uid nor auth_user_id column exists - database schema is corrupted';
    
  ELSE
    RAISE NOTICE 'Column auth_user_id already exists - proceeding with policy updates';
  END IF;
END
$$;

-- Step 2: Now that we're sure the column exists with the right name, drop ALL policies
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
  END LOOP;
END
$$;

-- Step 3: Create policies with the correct column name
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

-- Step 4: Final verification
DO $$
DECLARE
  col_name text;
  policy_count integer;
  bad_policy_count integer;
BEGIN
  -- Verify column name
  SELECT column_name INTO col_name
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'player_claims' 
  AND column_name IN ('supabase_uid', 'auth_user_id');
  
  IF col_name != 'auth_user_id' THEN
    RAISE EXCEPTION 'Column verification failed - expected auth_user_id but found %', col_name;
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relname = 'player_claims';
  
  -- Count bad policies
  SELECT COUNT(*) INTO bad_policy_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relname = 'player_claims'
  AND (
    pol.polqual::text LIKE '%supabase_uid%' OR
    pol.polwithcheck::text LIKE '%supabase_uid%'
  );
  
  RAISE NOTICE 'Verification complete: Column name is %, found % policies, % with old column reference', 
    col_name, policy_count, bad_policy_count;
  
  IF bad_policy_count > 0 THEN
    RAISE EXCEPTION 'Found % policies still referencing supabase_uid', bad_policy_count;
  END IF;
END
$$;

COMMIT;

SELECT 'Column and policy alignment completed at ' || NOW() AS status;