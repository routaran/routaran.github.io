-- Migration: Final verification that all supabase_uid references are removed
-- Description: Comprehensive check to ensure the column rename is complete
-- This migration will fail if any references to supabase_uid remain in active objects

BEGIN;

-- Check 1: Verify no functions reference supabase_uid (excluding test/verification functions)
DO $$
DECLARE
  func_count integer;
  func_names text;
BEGIN
  SELECT 
    COUNT(*),
    string_agg(p.proname, ', ')
  INTO func_count, func_names
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prosrc LIKE '%supabase_uid%'
  -- Exclude verification and health check functions
  AND p.proname NOT IN ('verify_all_functions_updated', 'check_database_health')
  -- Exclude this verification function itself
  AND p.proname NOT LIKE '%verification%';
  
  IF func_count > 0 THEN
    RAISE EXCEPTION 'Found % functions still using supabase_uid: %', func_count, func_names;
  END IF;
  
  RAISE NOTICE 'PASS: No functions reference supabase_uid';
END
$$;

-- Check 2: Verify no policies reference supabase_uid
DO $$
DECLARE
  policy_count integer;
  policy_info text;
BEGIN
  SELECT 
    COUNT(*),
    string_agg(c.relname || '.' || pol.polname, ', ')
  INTO policy_count, policy_info
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND (
    pol.polqual::text LIKE '%supabase_uid%' OR
    pol.polwithcheck::text LIKE '%supabase_uid%'
  );
  
  IF policy_count > 0 THEN
    RAISE EXCEPTION 'Found % policies still using supabase_uid: %', policy_count, policy_info;
  END IF;
  
  RAISE NOTICE 'PASS: No policies reference supabase_uid';
END
$$;

-- Check 3: Verify no indexes reference supabase_uid
DO $$
DECLARE
  index_count integer;
  index_names text;
BEGIN
  SELECT 
    COUNT(*),
    string_agg(indexname, ', ')
  INTO index_count, index_names
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE '%supabase_uid%';
  
  IF index_count > 0 THEN
    RAISE EXCEPTION 'Found % indexes still using supabase_uid: %', index_count, index_names;
  END IF;
  
  RAISE NOTICE 'PASS: No indexes reference supabase_uid';
END
$$;

-- Check 4: Verify column doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name = 'supabase_uid'
  ) THEN
    RAISE EXCEPTION 'Column supabase_uid still exists in the schema';
  END IF;
  
  RAISE NOTICE 'PASS: Column supabase_uid does not exist';
END
$$;

-- Check 5: Verify auth_user_id column exists with correct properties
DO $$
DECLARE
  col_exists boolean;
  col_nullable boolean;
BEGIN
  SELECT 
    COUNT(*) > 0,
    MAX(CASE WHEN is_nullable = 'YES' THEN true ELSE false END)
  INTO col_exists, col_nullable
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'player_claims'
  AND column_name = 'auth_user_id';
  
  IF NOT col_exists THEN
    RAISE EXCEPTION 'Column auth_user_id does not exist in player_claims';
  END IF;
  
  IF col_nullable THEN
    RAISE EXCEPTION 'Column auth_user_id should not be nullable';
  END IF;
  
  RAISE NOTICE 'PASS: Column auth_user_id exists with correct properties';
END
$$;

-- Check 6: Verify constraints are properly named
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'player_claims'
    AND constraint_name LIKE '%supabase_uid%'
  ) THEN
    RAISE EXCEPTION 'Found constraints still referencing supabase_uid';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'player_claims'
    AND constraint_name = 'player_claims_unique_auth_user_id'
  ) THEN
    RAISE EXCEPTION 'Constraint player_claims_unique_auth_user_id not found';
  END IF;
  
  RAISE NOTICE 'PASS: All constraints properly renamed';
END
$$;

-- Final summary
RAISE NOTICE '';
RAISE NOTICE '===========================================';
RAISE NOTICE 'VERIFICATION COMPLETE: All supabase_uid references have been successfully removed';
RAISE NOTICE 'The column has been renamed to auth_user_id throughout the database';
RAISE NOTICE '===========================================';

COMMIT;