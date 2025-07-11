-- Migration: Fix current_player_id function to use correct column name
-- Description: Updates current_player_id function to use auth_user_id instead of supabase_uid
-- This is a critical fix as this function is used by all RLS policies and permission checks

BEGIN;

-- Drop and recreate the function with the correct column name
CREATE OR REPLACE FUNCTION current_player_id()
RETURNS uuid AS $$
  SELECT player_id FROM player_claims WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE
SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION current_player_id() IS 
'Returns the player ID associated with the current authenticated user. 
Returns NULL if user is not authenticated or has not claimed a player.
This function is the foundation for all other permission checks.';

-- Keep the same permissions
GRANT EXECUTE ON FUNCTION current_player_id() TO authenticated, anon;

-- Verify the function works by testing it
-- This will fail if there are any issues with the column name
DO $$
BEGIN
  -- Test that the function can be called without errors
  PERFORM current_player_id();
  RAISE NOTICE 'current_player_id() function updated successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update current_player_id() function: %', SQLERRM;
END
$$;

COMMIT;