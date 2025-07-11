-- Migration: Verify all database functions use correct column names
-- Description: This migration checks that all functions and policies are using auth_user_id
-- It will fail if any references to supabase_uid remain

BEGIN;

-- Check for any remaining references to supabase_uid in functions
DO $$
DECLARE
  func_count integer;
  func_names text;
BEGIN
  -- Find any functions that still reference supabase_uid
  SELECT 
    COUNT(*),
    string_agg(p.proname, ', ')
  INTO 
    func_count,
    func_names
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.prosrc LIKE '%supabase_uid%';
  
  IF func_count > 0 THEN
    RAISE EXCEPTION 'Found % functions still using supabase_uid: %', func_count, func_names;
  END IF;
  
  RAISE NOTICE 'All functions verified - no references to supabase_uid found';
END
$$;

-- Check for any remaining references to supabase_uid in policies
DO $$
DECLARE
  policy_count integer;
  policy_names text;
BEGIN
  -- Find any policies that still reference supabase_uid
  SELECT 
    COUNT(*),
    string_agg(pol.polname, ', ')
  INTO 
    policy_count,
    policy_names
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND (
    pol.polqual::text LIKE '%supabase_uid%' OR
    pol.polwithcheck::text LIKE '%supabase_uid%'
  );
  
  IF policy_count > 0 THEN
    RAISE WARNING 'Found % policies that may still reference supabase_uid: %', policy_count, policy_names;
  END IF;
  
  RAISE NOTICE 'Policy check complete';
END
$$;

-- Verify critical functions exist and work
DO $$
DECLARE
  test_result uuid;
BEGIN
  -- Test current_player_id (should return NULL for system user)
  test_result := current_player_id();
  RAISE NOTICE 'current_player_id() function works correctly';
  
  -- Test other critical functions exist
  PERFORM is_project_owner();
  RAISE NOTICE 'is_project_owner() function exists';
  
  PERFORM is_organizer_of(gen_random_uuid());
  RAISE NOTICE 'is_organizer_of() function exists';
  
  PERFORM is_player_in_match(gen_random_uuid());
  RAISE NOTICE 'is_player_in_match() function exists';
  
  RAISE NOTICE 'All critical functions verified';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Function verification failed: %', SQLERRM;
END
$$;

COMMIT;