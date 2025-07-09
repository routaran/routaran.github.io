-- =====================================================
-- Migration: Helper Functions for RLS Policies
-- Created: 2025-07-09
-- Description: Creates helper functions that simplify RLS policy definitions
--              and improve query performance. These functions are used by
--              Row Level Security policies to determine user permissions.
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CORE HELPER FUNCTIONS
-- =====================================================

-- Get the current user's player ID from their auth session
-- This function is the foundation for all other permission checks
CREATE OR REPLACE FUNCTION current_player_id()
RETURNS uuid AS $$
  SELECT player_id FROM player_claims WHERE supabase_uid = auth.uid()
$$ LANGUAGE sql STABLE
SECURITY DEFINER;

COMMENT ON FUNCTION current_player_id() IS 
'Returns the player ID associated with the current authenticated user. 
Returns NULL if user is not authenticated or has not claimed a player.';

-- =====================================================
-- 2. ROLE-BASED PERMISSION FUNCTIONS
-- =====================================================

-- Check if current user is a project owner
-- Project owners have full admin access to all system data
CREATE OR REPLACE FUNCTION is_project_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM players
    WHERE id = current_player_id()
    AND is_project_owner = TRUE
  )
$$ LANGUAGE sql STABLE
SECURITY DEFINER;

COMMENT ON FUNCTION is_project_owner() IS 
'Checks if the current authenticated user is a project owner.
Project owners have full admin access to all Play Dates and system data.';

-- Check if current user is the organizer of a specific play date
-- Organizers can manage their own Play Dates but not others
CREATE OR REPLACE FUNCTION is_organizer_of(play_date_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM play_dates
    WHERE id = $1
    AND organizer_id = current_player_id()
  )
$$ LANGUAGE sql STABLE
SECURITY DEFINER;

COMMENT ON FUNCTION is_organizer_of(uuid) IS 
'Checks if the current authenticated user is the organizer of the specified Play Date.
Organizers can create and manage their own Play Dates.';

-- Check if current user is a player in a specific match
-- Players can only update scores for matches they are participating in
CREATE OR REPLACE FUNCTION is_player_in_match(match_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches m
    JOIN partnerships p ON (p.id = m.partnership1_id OR p.id = m.partnership2_id)
    WHERE m.id = $1
    AND (p.player1_id = current_player_id() OR p.player2_id = current_player_id())
  )
$$ LANGUAGE sql STABLE
SECURITY DEFINER;

COMMENT ON FUNCTION is_player_in_match(uuid) IS 
'Checks if the current authenticated user is a player in the specified match.
Players can only update scores for their own matches.';

-- =====================================================
-- 3. PLAYER CLAIM FUNCTION
-- =====================================================

-- Function to claim a player name (called after first login)
-- This is a one-time operation that links a Supabase auth user to a player record
CREATE OR REPLACE FUNCTION claim_player(player_id uuid)
RETURNS void AS $$
BEGIN
  -- Validate input
  IF player_id IS NULL THEN
    RAISE EXCEPTION 'Player ID cannot be null';
  END IF;

  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to claim a player';
  END IF;

  -- Check if user already has a claim
  IF EXISTS (SELECT 1 FROM player_claims WHERE supabase_uid = auth.uid()) THEN
    RAISE EXCEPTION 'User has already claimed a player';
  END IF;
  
  -- Check if player exists
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = player_id) THEN
    RAISE EXCEPTION 'Player with ID % does not exist', player_id;
  END IF;
  
  -- Check if player is already claimed
  IF EXISTS (SELECT 1 FROM player_claims WHERE player_id = player_id) THEN
    RAISE EXCEPTION 'Player has already been claimed';
  END IF;
  
  -- Create the claim
  INSERT INTO player_claims (player_id, supabase_uid, claimed_at)
  VALUES (player_id, auth.uid(), NOW());
  
  -- Log the claim for audit purposes
  RAISE NOTICE 'Player % claimed by user %', player_id, auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION claim_player(uuid) IS 
'Allows an authenticated user to claim a player name. This is a one-time operation
that creates the link between a Supabase auth user and a player record.
Includes validation to prevent duplicate claims.';

-- =====================================================
-- 4. AUDIT TRAIL FUNCTIONS
-- =====================================================

-- Function to log match changes for audit trail
-- This function is called by triggers to maintain a complete audit history
CREATE OR REPLACE FUNCTION audit_match_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if scores actually changed
  IF (OLD.team1_score IS DISTINCT FROM NEW.team1_score) 
     OR (OLD.team2_score IS DISTINCT FROM NEW.team2_score) 
     OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    
    INSERT INTO audit_log (
      play_date_id,
      match_id,
      player_id,
      action_type,
      old_values,
      new_values,
      metadata,
      created_at
    ) VALUES (
      NEW.play_date_id,
      NEW.id,
      current_player_id(),
      TG_OP,
      jsonb_build_object(
        'team1_score', OLD.team1_score,
        'team2_score', OLD.team2_score,
        'status', OLD.status,
        'version', OLD.version
      ),
      jsonb_build_object(
        'team1_score', NEW.team1_score,
        'team2_score', NEW.team2_score,
        'status', NEW.status,
        'version', NEW.version
      ),
      jsonb_build_object(
        'user_agent', COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown'),
        'ip_address', COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', 'unknown'),
        'timestamp', NOW()
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the main operation
    RAISE WARNING 'Audit logging failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_match_change() IS 
'Trigger function that logs match changes to the audit_log table.
Captures before/after values, player who made the change, and metadata.
Includes error handling to prevent audit failures from blocking operations.';

-- =====================================================
-- 5. UTILITY FUNCTIONS
-- =====================================================

-- Function to refresh the match_results materialized view
-- This ensures the latest statistics are available for rankings
CREATE OR REPLACE FUNCTION refresh_match_results_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY match_results;
  RAISE NOTICE 'Match results materialized view refreshed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to refresh match results view: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_match_results_view() IS 
'Refreshes the match_results materialized view to ensure rankings calculations
use the latest match data. Uses CONCURRENTLY to allow concurrent access.';

-- Function to auto-refresh materialized view when matches are updated
CREATE OR REPLACE FUNCTION auto_refresh_match_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Only refresh if score data actually changed
  IF (OLD.team1_score IS DISTINCT FROM NEW.team1_score) 
     OR (OLD.team2_score IS DISTINCT FROM NEW.team2_score) 
     OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    
    -- Refresh the materialized view asynchronously
    PERFORM pg_notify('refresh_match_results', NEW.play_date_id::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_refresh_match_results() IS 
'Trigger function that triggers materialized view refresh when match data changes.
Uses pg_notify to allow asynchronous processing.';

-- =====================================================
-- 5. UTILITY FUNCTIONS (CONTINUED)
-- =====================================================

-- Function to check if a play date schedule is locked
-- Schedule becomes locked after the first score is entered
CREATE OR REPLACE FUNCTION is_schedule_locked(play_date_id uuid)
RETURNS boolean AS $$
  SELECT COALESCE(schedule_locked, false) 
  FROM play_dates 
  WHERE id = $1
$$ LANGUAGE sql STABLE
SECURITY DEFINER;

COMMENT ON FUNCTION is_schedule_locked(uuid) IS 
'Checks if a play date schedule is locked (cannot be regenerated).
Schedule becomes locked after the first score is entered.';

-- Function to validate score values
-- Ensures scores are within valid pickleball ranges
CREATE OR REPLACE FUNCTION is_valid_score(score integer)
RETURNS boolean AS $$
  SELECT score >= 0 AND score <= 21
$$ LANGUAGE sql IMMUTABLE
SECURITY DEFINER;

COMMENT ON FUNCTION is_valid_score(integer) IS 
'Validates that a score is within the valid range for pickleball (0-21).
Used by application logic and constraints.';

-- Function to check if a match is complete
-- A match is complete when it has final scores
CREATE OR REPLACE FUNCTION is_match_complete(team1_score integer, team2_score integer)
RETURNS boolean AS $$
  SELECT 
    team1_score IS NOT NULL 
    AND team2_score IS NOT NULL 
    AND team1_score >= 0 
    AND team2_score >= 0
$$ LANGUAGE sql IMMUTABLE
SECURITY DEFINER;

COMMENT ON FUNCTION is_match_complete(integer, integer) IS 
'Determines if a match is complete based on score values.
A match is complete when both teams have valid scores.';

-- =====================================================
-- 6. GRANTS AND PERMISSIONS
-- =====================================================

-- Grant execute permissions to appropriate roles
GRANT EXECUTE ON FUNCTION current_player_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_project_owner() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_organizer_of(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_player_in_match(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION claim_player(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_schedule_locked(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_valid_score(integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_match_complete(integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_match_results_view() TO authenticated;

-- Audit function should only be called by triggers
GRANT EXECUTE ON FUNCTION audit_match_change() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_refresh_match_results() TO authenticated;

-- =====================================================
-- 7. TRIGGER SETUP
-- =====================================================

-- Create trigger for match updates to maintain audit trail
DROP TRIGGER IF EXISTS audit_match_update ON matches;
CREATE TRIGGER audit_match_update
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION audit_match_change();

-- Create trigger for automatic materialized view refresh
DROP TRIGGER IF EXISTS auto_refresh_match_results_trigger ON matches;
CREATE TRIGGER auto_refresh_match_results_trigger
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION auto_refresh_match_results();

-- =====================================================
-- 8. VALIDATION AND TESTING
-- =====================================================

-- Test that all functions can be called without errors
DO $$
BEGIN
  -- Test helper functions exist and are callable
  PERFORM current_player_id();
  PERFORM is_project_owner();
  PERFORM is_organizer_of(uuid_generate_v4());
  PERFORM is_player_in_match(uuid_generate_v4());
  PERFORM is_schedule_locked(uuid_generate_v4());
  PERFORM is_valid_score(10);
  PERFORM is_match_complete(11, 9);
  
  RAISE NOTICE 'All helper functions created successfully';
END
$$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Migration completed successfully
SELECT 'Helper functions migration completed at ' || NOW() AS status;