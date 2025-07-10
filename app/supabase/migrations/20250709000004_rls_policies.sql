-- Migration: Row Level Security (RLS) Policies
-- Description: Implements comprehensive RLS policies for multi-role security
-- This migration creates all security policies for the Pickleball Tracker system
-- supporting Project Owner, Organizer, Player, and Visitor roles.
-- 
-- Dependencies: Requires helper functions from 20250709000002_helper_functions.sql
-- 
-- Security Model:
-- - Project Owner: Full admin access to all Play Dates and system data
-- - Organizer: Creates and manages their own Play Dates
-- - Player: Updates scores for their matches only
-- - Visitor: Read-only access without login

BEGIN;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Note: Materialized views don't support RLS directly
-- Access control for match_results is handled by the underlying tables

-- ============================================================================
-- PLAYERS TABLE POLICIES
-- ============================================================================

-- Visitors can read all players (for displaying names in dropdowns)
CREATE POLICY "players_select_anon" ON players
  FOR SELECT TO anon
  USING (true);

-- Authenticated users can read all players
CREATE POLICY "players_select_authenticated" ON players
  FOR SELECT TO authenticated
  USING (true);

-- Only project owners can insert new players
CREATE POLICY "players_insert_project_owner" ON players
  FOR INSERT TO authenticated
  WITH CHECK (is_project_owner());

-- Only project owners can update players
CREATE POLICY "players_update_project_owner" ON players
  FOR UPDATE TO authenticated
  USING (is_project_owner())
  WITH CHECK (is_project_owner());

-- Only project owners can delete players
CREATE POLICY "players_delete_project_owner" ON players
  FOR DELETE TO authenticated
  USING (is_project_owner());

-- ============================================================================
-- PLAYER_CLAIMS TABLE POLICIES
-- ============================================================================

-- Users can only view their own claims
CREATE POLICY "player_claims_select_own" ON player_claims
  FOR SELECT TO authenticated
  USING (supabase_uid = auth.uid());

-- Users can create their own claims (one-time only via claim_player function)
CREATE POLICY "player_claims_insert_own" ON player_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    supabase_uid = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM player_claims WHERE supabase_uid = auth.uid()
    )
  );

-- No updates or deletes allowed on claims (immutable after creation)

-- ============================================================================
-- PLAY_DATES TABLE POLICIES
-- ============================================================================

-- Visitors can read all play dates (for public rankings)
CREATE POLICY "play_dates_select_anon" ON play_dates
  FOR SELECT TO anon
  USING (true);

-- Authenticated users can read all play dates
CREATE POLICY "play_dates_select_authenticated" ON play_dates
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can create play dates (they become the organizer)
CREATE POLICY "play_dates_insert_authenticated" ON play_dates
  FOR INSERT TO authenticated
  WITH CHECK (organizer_id = current_player_id());

-- Organizers can update their own play dates, project owners can update any
CREATE POLICY "play_dates_update_organizer" ON play_dates
  FOR UPDATE TO authenticated
  USING (
    organizer_id = current_player_id()
    OR is_project_owner()
  )
  WITH CHECK (
    -- Only organizers and project owners can update
    -- Schedule lock enforcement is handled by triggers
    organizer_id = current_player_id()
    OR is_project_owner()
  );

-- Organizers can delete their own play dates, project owners can delete any
CREATE POLICY "play_dates_delete_organizer" ON play_dates
  FOR DELETE TO authenticated
  USING (
    organizer_id = current_player_id()
    OR is_project_owner()
  );

-- ============================================================================
-- COURTS TABLE POLICIES
-- ============================================================================

-- Visitors can read all courts (for public schedule viewing)
CREATE POLICY "courts_select_anon" ON courts
  FOR SELECT TO anon
  USING (true);

-- Authenticated users can read all courts
CREATE POLICY "courts_select_authenticated" ON courts
  FOR SELECT TO authenticated
  USING (true);

-- Organizers can manage courts for their play dates
CREATE POLICY "courts_insert_organizer" ON courts
  FOR INSERT TO authenticated
  WITH CHECK (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );

CREATE POLICY "courts_update_organizer" ON courts
  FOR UPDATE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  )
  WITH CHECK (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );

CREATE POLICY "courts_delete_organizer" ON courts
  FOR DELETE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );

-- ============================================================================
-- PARTNERSHIPS TABLE POLICIES
-- ============================================================================

-- Visitors can read all partnerships (for public rankings)
CREATE POLICY "partnerships_select_anon" ON partnerships
  FOR SELECT TO anon
  USING (true);

-- Authenticated users can read all partnerships
CREATE POLICY "partnerships_select_authenticated" ON partnerships
  FOR SELECT TO authenticated
  USING (true);

-- Organizers can manage partnerships for their play dates
CREATE POLICY "partnerships_insert_organizer" ON partnerships
  FOR INSERT TO authenticated
  WITH CHECK (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );

CREATE POLICY "partnerships_update_organizer" ON partnerships
  FOR UPDATE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  )
  WITH CHECK (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );

CREATE POLICY "partnerships_delete_organizer" ON partnerships
  FOR DELETE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );

-- ============================================================================
-- MATCHES TABLE POLICIES (CRITICAL FOR SCORE ENTRY)
-- ============================================================================

-- Visitors can read all matches (for public viewing)
CREATE POLICY "matches_select_anon" ON matches
  FOR SELECT TO anon
  USING (true);

-- Authenticated users can read all matches
CREATE POLICY "matches_select_authenticated" ON matches
  FOR SELECT TO authenticated
  USING (true);

-- Organizers can create matches for their play dates
CREATE POLICY "matches_insert_organizer" ON matches
  FOR INSERT TO authenticated
  WITH CHECK (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );

-- Players can update scores for their incomplete matches only
CREATE POLICY "matches_update_player" ON matches
  FOR UPDATE TO authenticated
  USING (
    status != 'completed'
    AND is_player_in_match(id)
  )
  WITH CHECK (
    -- Optimistic locking is enforced at application level
    -- Players can only update their own incomplete matches
    recorded_by = current_player_id()
    AND recorded_at IS NOT NULL
    AND status != 'completed'
    AND is_player_in_match(id)
  );

-- Organizers can update any match in their play dates
CREATE POLICY "matches_update_organizer" ON matches
  FOR UPDATE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  )
  WITH CHECK (
    -- Optimistic locking is enforced at application level
    recorded_by = current_player_id()
    AND recorded_at IS NOT NULL
    AND (is_organizer_of(play_date_id) OR is_project_owner())
  );

-- Organizers can delete matches from their play dates
CREATE POLICY "matches_delete_organizer" ON matches
  FOR DELETE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );

-- ============================================================================
-- AUDIT_LOG TABLE POLICIES
-- ============================================================================

-- Organizers can view audit logs for their play dates
CREATE POLICY "audit_log_select_organizer" ON audit_log
  FOR SELECT TO authenticated
  USING (
    play_date_id IS NOT NULL AND (
      is_organizer_of(play_date_id)
      OR is_project_owner()
    )
  );

-- System can insert audit logs via triggers (recorded_by must be current user)
CREATE POLICY "audit_log_insert_system" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    player_id = current_player_id()
    OR is_project_owner()
  );

-- No updates or deletes allowed on audit logs (immutable for integrity)

-- ============================================================================
-- MATCH_RESULTS MATERIALIZED VIEW ACCESS
-- ============================================================================

-- Note: Materialized views don't support RLS policies
-- Access to match_results is controlled at the application level
-- The view aggregates data from tables that DO have RLS policies

-- ============================================================================
-- SECURITY VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate user permissions before sensitive operations
CREATE OR REPLACE FUNCTION validate_user_permissions(
  required_role TEXT,
  context_play_date_id UUID DEFAULT NULL,
  context_match_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is authenticated for non-visitor operations
  IF required_role != 'visitor' AND auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check specific role permissions
  CASE required_role
    WHEN 'project_owner' THEN
      RETURN is_project_owner();
    WHEN 'organizer' THEN
      RETURN is_project_owner() OR 
             (context_play_date_id IS NOT NULL AND is_organizer_of(context_play_date_id));
    WHEN 'player' THEN
      RETURN is_project_owner() OR 
             (context_play_date_id IS NOT NULL AND is_organizer_of(context_play_date_id)) OR
             (context_match_id IS NOT NULL AND is_player_in_match(context_match_id));
    WHEN 'visitor' THEN
      RETURN TRUE; -- Visitors always allowed for read operations
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_user_permissions(TEXT, UUID, UUID) IS 
'Validates user permissions for specific operations. Used by application logic
to ensure users have appropriate access before performing sensitive operations.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_user_permissions(TEXT, UUID, UUID) TO authenticated;

-- ============================================================================
-- ENABLE REALTIME FOR LIVE UPDATES
-- ============================================================================

-- Enable realtime for tables that need live updates
ALTER publication supabase_realtime ADD TABLE matches;
ALTER publication supabase_realtime ADD TABLE play_dates;
ALTER publication supabase_realtime ADD TABLE partnerships;
ALTER publication supabase_realtime ADD TABLE audit_log;

-- ============================================================================
-- POLICY TESTING AND VALIDATION
-- ============================================================================

-- Test policy setup by verifying critical scenarios
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Test that policies are properly enabled
  SELECT count(*) > 0 INTO test_result
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('players', 'play_dates', 'matches', 'partnerships');
  
  IF NOT test_result THEN
    RAISE EXCEPTION 'RLS policies not properly created';
  END IF;
  
  -- Test that RLS is enabled on all tables
  SELECT count(*) = 7 INTO test_result
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public' 
  AND t.tablename IN ('players', 'player_claims', 'play_dates', 'courts', 'partnerships', 'matches', 'audit_log')
  AND c.relrowsecurity = true;
  
  IF NOT test_result THEN
    RAISE EXCEPTION 'RLS not enabled on all required tables';
  END IF;
  
  RAISE NOTICE 'All RLS policies created and validated successfully';
END;
$$;

-- ============================================================================
-- SECURITY DOCUMENTATION
-- ============================================================================

-- Document security model for reference
COMMENT ON SCHEMA public IS 
'Pickleball Tracker Database Schema with Row Level Security

Security Model:
- Project Owner: Full admin access (is_project_owner = true)
- Organizer: Manages own Play Dates (play_dates.organizer_id = current_player_id())
- Player: Updates scores for own matches (via partnerships)
- Visitor: Read-only access (anon role)

Key Security Features:
- Optimistic locking prevents concurrent update conflicts
- Audit trail tracks all score changes
- Schedule locking prevents regeneration after first score
- Player claims ensure one-time auth-to-player mapping

Critical Functions:
- current_player_id(): Maps auth.uid() to player record
- is_project_owner(): Checks admin privileges
- is_organizer_of(): Validates play date ownership
- is_player_in_match(): Validates match participation';

COMMIT;

-- RLS Policies migration completed successfully
SELECT 'RLS policies migration completed at ' || NOW() AS status;