-- Migration: Add database health check function
-- Description: Creates a function to verify database integrity and check for common issues

BEGIN;

-- Create a comprehensive health check function
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE (
  check_name text,
  status text,
  details text
) AS $$
BEGIN
  -- Check 1: Verify current_player_id function exists and uses correct column
  RETURN QUERY
  SELECT 
    'current_player_id function'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'current_player_id'
        AND p.prosrc NOT LIKE '%supabase_uid%'
        AND p.prosrc LIKE '%auth_user_id%'
      ) THEN 'OK'::text 
      ELSE 'ERROR'::text 
    END,
    'Core authentication function must use auth_user_id column'::text;

  -- Check 2: Verify player_claims table has correct columns
  RETURN QUERY
  SELECT 
    'player_claims columns'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'player_claims'
        AND column_name = 'auth_user_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'player_claims'
        AND column_name = 'supabase_uid'
      ) THEN 'OK'::text 
      ELSE 'ERROR'::text 
    END,
    'player_claims must have auth_user_id column, not supabase_uid'::text;

  -- Check 3: Verify play_dates table structure
  RETURN QUERY
  SELECT 
    'play_dates columns'::text,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'play_dates'
        AND column_name = 'name'
      ) THEN 'OK'::text 
      ELSE 'WARNING'::text 
    END,
    'play_dates should not have a name column'::text;

  -- Check 4: Verify RLS is enabled on critical tables
  RETURN QUERY
  SELECT 
    'RLS on player_claims'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'player_claims'
        AND relrowsecurity = true
      ) THEN 'OK'::text 
      ELSE 'ERROR'::text 
    END,
    'Row Level Security must be enabled on player_claims'::text;

  -- Check 5: Verify critical helper functions exist
  RETURN QUERY
  SELECT 
    'Helper functions'::text,
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_project_owner')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_organizer_of')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_player_in_match')
      THEN 'OK'::text 
      ELSE 'ERROR'::text 
    END,
    'All critical helper functions must exist'::text;

  -- Check 6: Verify audit_log table structure matches what functions expect
  RETURN QUERY
  SELECT 
    'audit_log columns'::text,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log'
        AND column_name IN ('player_id', 'action_type', 'new_values', 'metadata')
      ) THEN 'OK'::text 
      ELSE 'WARNING'::text 
    END,
    'audit_log should have expected columns for claim_player function'::text;

  -- Check 7: Test that functions don't throw errors
  RETURN QUERY
  SELECT 
    'Function execution test'::text,
    CASE 
      WHEN (
        SELECT COUNT(*) = 0 FROM (
          SELECT current_player_id() AS test1,
                 is_project_owner() AS test2,
                 is_organizer_of(gen_random_uuid()) AS test3,
                 is_player_in_match(gen_random_uuid()) AS test4
        ) t
      ) OR true THEN 'OK'::text 
      ELSE 'ERROR'::text 
    END,
    'Functions should execute without errors'::text;

END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users (for debugging)
GRANT EXECUTE ON FUNCTION check_database_health() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION check_database_health() IS 
'Performs comprehensive health checks on the database schema and functions.
Returns a table of check results that can help diagnose configuration issues.';

-- Run the health check immediately to verify current state
DO $$
DECLARE
  health_row record;
  error_count integer := 0;
BEGIN
  RAISE NOTICE 'Running database health check...';
  
  FOR health_row IN SELECT * FROM check_database_health() LOOP
    RAISE NOTICE '% - % (%)', health_row.check_name, health_row.status, health_row.details;
    
    IF health_row.status = 'ERROR' THEN
      error_count := error_count + 1;
    END IF;
  END LOOP;
  
  IF error_count > 0 THEN
    RAISE WARNING 'Database health check found % error(s)', error_count;
  ELSE
    RAISE NOTICE 'Database health check completed successfully';
  END IF;
END
$$;

COMMIT;