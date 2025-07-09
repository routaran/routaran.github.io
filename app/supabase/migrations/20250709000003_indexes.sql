-- Migration: 20250709000003_indexes.sql
-- Description: Create comprehensive database indexes for optimal query performance
-- This migration creates all necessary indexes for the Pickleball Tracker system
-- to ensure fast lookups, efficient joins, and optimized real-time updates.

BEGIN;

-- ============================================================================
-- PRIMARY LOOKUP INDEXES
-- ============================================================================

-- Play dates primary lookups
CREATE INDEX idx_play_dates_date ON play_dates(date DESC);
CREATE INDEX idx_play_dates_organizer ON play_dates(organizer_id);
CREATE INDEX idx_play_dates_status ON play_dates(status);

-- ============================================================================
-- MATCH QUERYING INDEXES
-- ============================================================================

-- Core match queries for dashboard and court management
CREATE INDEX idx_matches_play_date_status ON matches(play_date_id, status);
CREATE INDEX idx_matches_court_round ON matches(court_id, round_number);
CREATE INDEX idx_matches_partnership1 ON matches(partnership1_id);
CREATE INDEX idx_matches_partnership2 ON matches(partnership2_id);
CREATE INDEX idx_matches_winning_partnership ON matches(winning_partnership_id);

-- ============================================================================
-- PARTNERSHIP LOOKUP INDEXES
-- ============================================================================

-- Partnership queries for player statistics and match assignment
CREATE INDEX idx_partnerships_play_date ON partnerships(play_date_id);
CREATE INDEX idx_partnerships_player1 ON partnerships(player1_id);
CREATE INDEX idx_partnerships_player2 ON partnerships(player2_id);

-- ============================================================================
-- AUTHENTICATION INDEXES
-- ============================================================================

-- Player authentication and lookup optimization
CREATE UNIQUE INDEX idx_player_claims_supabase_uid ON player_claims(supabase_uid);
CREATE INDEX idx_players_email ON players(email);

-- ============================================================================
-- AUDIT AND REAL-TIME INDEXES
-- ============================================================================

-- Audit log queries for dispute resolution and change tracking
CREATE INDEX idx_audit_log_play_date_created ON audit_log(play_date_id, created_at DESC);
CREATE INDEX idx_audit_log_match_created ON audit_log(match_id, created_at DESC);
CREATE INDEX idx_audit_log_player_created ON audit_log(player_id, created_at DESC);

-- ============================================================================
-- COURT MANAGEMENT INDEXES
-- ============================================================================

-- Court configuration and assignment queries
CREATE INDEX idx_courts_play_date ON courts(play_date_id);
CREATE INDEX idx_courts_play_date_number ON courts(play_date_id, court_number);

-- ============================================================================
-- MATERIALIZED VIEW INDEXES
-- ============================================================================

-- Rankings and statistics queries for real-time dashboard updates
CREATE INDEX idx_match_results_play_date_wins ON match_results(play_date_id, wins DESC);
CREATE INDEX idx_match_results_play_date_points ON match_results(play_date_id, points_for DESC);
CREATE INDEX idx_match_results_play_date_percentage ON match_results(play_date_id, win_percentage DESC);
CREATE INDEX idx_match_results_play_date_differential ON match_results(play_date_id, point_differential DESC);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================================================

-- Index Usage Guidelines:
-- 1. Primary lookup indexes support main dashboard queries
-- 2. Match querying indexes optimize court scheduling and status updates
-- 3. Partnership indexes enable fast player statistics calculations
-- 4. Authentication indexes ensure secure and fast user login/claims
-- 5. Audit indexes support dispute resolution and change tracking
-- 6. Court management indexes optimize court assignment and scheduling
-- 7. Materialized view indexes provide sub-second rankings updates

-- Expected Performance Impact:
-- - Dashboard load times: < 200ms
-- - Real-time updates: < 1 second propagation
-- - Rankings calculations: < 500ms (via materialized view)
-- - Score entry responses: < 100ms
-- - Authentication queries: < 50ms

COMMIT;