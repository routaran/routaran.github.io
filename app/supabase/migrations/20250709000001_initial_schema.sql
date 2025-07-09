-- Migration: Initial Database Schema for Pickleball Tracker
-- Description: Creates all core tables, constraints, and basic structure
-- Author: Generated for 40plusPickleball project
-- Date: 2025-07-09

BEGIN;

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. Players table - All players in the system
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_project_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT players_name_length CHECK (length(name) >= 2),
    CONSTRAINT players_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 2. Player Claims table - Links players to Supabase auth UIDs
CREATE TABLE player_claims (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    supabase_uid UUID UNIQUE NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT player_claims_unique_player UNIQUE (player_id),
    CONSTRAINT player_claims_unique_supabase_uid UNIQUE (supabase_uid)
);

-- 3. Play Dates table - Tournament days with configuration
CREATE TABLE play_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    organizer_id UUID NOT NULL REFERENCES players(id),
    num_courts INTEGER NOT NULL CHECK (num_courts BETWEEN 1 AND 4),
    win_condition VARCHAR(20) NOT NULL CHECK (win_condition IN ('first_to_target', 'win_by_2')),
    target_score INTEGER NOT NULL CHECK (target_score BETWEEN 5 AND 21) DEFAULT 11,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    schedule_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT play_dates_future_date CHECK (date >= CURRENT_DATE),
    CONSTRAINT play_dates_version_positive CHECK (version > 0)
);

-- 4. Courts table - Court configuration per Play Date
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    play_date_id UUID NOT NULL REFERENCES play_dates(id) ON DELETE CASCADE,
    court_number INTEGER NOT NULL CHECK (court_number BETWEEN 1 AND 4),
    court_name VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(play_date_id, court_number),
    CONSTRAINT courts_name_length CHECK (length(court_name) >= 1)
);

-- 5. Partnerships table - Pre-generated doubles pairings
CREATE TABLE partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    play_date_id UUID NOT NULL REFERENCES play_dates(id) ON DELETE CASCADE,
    player1_id UUID NOT NULL REFERENCES players(id),
    player2_id UUID NOT NULL REFERENCES players(id),
    partnership_name VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(play_date_id, player1_id, player2_id),
    CHECK (player1_id != player2_id),
    CONSTRAINT partnerships_name_length CHECK (length(partnership_name) >= 1)
);

-- 6. Matches table - Individual games with scores and tracking
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    play_date_id UUID NOT NULL REFERENCES play_dates(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES courts(id),
    round_number INTEGER NOT NULL CHECK (round_number >= 1),
    partnership1_id UUID NOT NULL REFERENCES partnerships(id),
    partnership2_id UUID NOT NULL REFERENCES partnerships(id),
    team1_score INTEGER CHECK (team1_score >= 0),
    team2_score INTEGER CHECK (team2_score >= 0),
    winning_partnership_id UUID REFERENCES partnerships(id),
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'disputed')),
    recorded_by UUID REFERENCES players(id),
    recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Constraints
    CHECK (partnership1_id != partnership2_id),
    CHECK (winning_partnership_id IN (partnership1_id, partnership2_id) OR winning_partnership_id IS NULL),
    CHECK (version > 0),
    UNIQUE(play_date_id, round_number, court_id),
    
    -- Score validation constraints
    CHECK (
        (team1_score IS NULL AND team2_score IS NULL) OR
        (team1_score IS NOT NULL AND team2_score IS NOT NULL)
    ),
    CHECK (
        (team1_score IS NULL AND team2_score IS NULL AND winning_partnership_id IS NULL) OR
        (team1_score IS NOT NULL AND team2_score IS NOT NULL AND winning_partnership_id IS NOT NULL)
    )
);

-- 7. Audit Log table - Complete audit trail for all system changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    play_date_id UUID REFERENCES play_dates(id),
    match_id UUID REFERENCES matches(id),
    player_id UUID REFERENCES players(id),
    action_type VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT audit_log_action_type_length CHECK (length(action_type) >= 1),
    CONSTRAINT audit_log_requires_context CHECK (
        play_date_id IS NOT NULL OR match_id IS NOT NULL OR player_id IS NOT NULL
    )
);

-- ============================================================================
-- MATERIALIZED VIEW FOR PERFORMANCE
-- ============================================================================

-- Match Results materialized view for high-performance rankings
CREATE MATERIALIZED VIEW match_results AS
SELECT 
    p.id AS player_id,
    p.name AS player_name,
    pd.id AS play_date_id,
    pd.date AS play_date,
    pd.status AS play_date_status,
    
    COUNT(m.id) AS games_played,
    
    SUM(CASE 
        WHEN m.winning_partnership_id IN (
            SELECT id FROM partnerships 
            WHERE (player1_id = p.id OR player2_id = p.id) 
            AND play_date_id = pd.id
        ) THEN 1 
        ELSE 0 
    END) AS wins,
    
    SUM(CASE 
        WHEN m.winning_partnership_id NOT IN (
            SELECT id FROM partnerships 
            WHERE (player1_id = p.id OR player2_id = p.id) 
            AND play_date_id = pd.id
        ) AND m.winning_partnership_id IS NOT NULL
        THEN 1 
        ELSE 0 
    END) AS losses,
    
    SUM(CASE 
        WHEN part.player1_id = p.id OR part.player2_id = p.id 
        THEN CASE 
            WHEN part.id = m.partnership1_id THEN COALESCE(m.team1_score, 0)
            ELSE COALESCE(m.team2_score, 0)
        END 
        ELSE 0 
    END) AS points_for,
    
    SUM(CASE 
        WHEN part.player1_id = p.id OR part.player2_id = p.id 
        THEN CASE 
            WHEN part.id = m.partnership1_id THEN COALESCE(m.team2_score, 0)
            ELSE COALESCE(m.team1_score, 0)
        END 
        ELSE 0 
    END) AS points_against,
    
    CASE 
        WHEN COUNT(m.id) > 0 THEN 
            ROUND(
                (SUM(CASE 
                    WHEN m.winning_partnership_id IN (
                        SELECT id FROM partnerships 
                        WHERE (player1_id = p.id OR player2_id = p.id) 
                        AND play_date_id = pd.id
                    ) THEN 1 
                    ELSE 0 
                END) * 100.0) / COUNT(m.id), 
                1
            )
        ELSE 0 
    END AS win_percentage,
    
    (SUM(CASE 
        WHEN part.player1_id = p.id OR part.player2_id = p.id 
        THEN CASE 
            WHEN part.id = m.partnership1_id THEN COALESCE(m.team1_score, 0)
            ELSE COALESCE(m.team2_score, 0)
        END 
        ELSE 0 
    END) - 
    SUM(CASE 
        WHEN part.player1_id = p.id OR part.player2_id = p.id 
        THEN CASE 
            WHEN part.id = m.partnership1_id THEN COALESCE(m.team2_score, 0)
            ELSE COALESCE(m.team1_score, 0)
        END 
        ELSE 0 
    END)) AS point_differential

FROM players p
CROSS JOIN play_dates pd
LEFT JOIN partnerships part ON (part.player1_id = p.id OR part.player2_id = p.id) 
    AND part.play_date_id = pd.id
LEFT JOIN matches m ON (m.partnership1_id = part.id OR m.partnership2_id = part.id)
    AND m.play_date_id = pd.id 
    AND m.status = 'completed'
GROUP BY p.id, p.name, pd.id, pd.date, pd.status;

-- Create unique index for materialized view
CREATE UNIQUE INDEX idx_match_results_player_play_date ON match_results(player_id, play_date_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables that need them
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_play_dates_updated_at
    BEFORE UPDATE ON play_dates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE players IS 'All players in the system with unique names and email addresses';
COMMENT ON TABLE player_claims IS 'Links players to Supabase auth UIDs for secure authentication';
COMMENT ON TABLE play_dates IS 'Tournament days with configuration settings and status tracking';
COMMENT ON TABLE courts IS 'Court configuration per Play Date with custom naming support';
COMMENT ON TABLE partnerships IS 'Pre-generated doubles pairings for enhanced analytics';
COMMENT ON TABLE matches IS 'Individual games with scores and comprehensive tracking';
COMMENT ON TABLE audit_log IS 'Complete audit trail for all system changes';
COMMENT ON MATERIALIZED VIEW match_results IS 'Pre-calculated player statistics for instant rankings';

COMMENT ON COLUMN players.is_project_owner IS 'Identifies admin users with full system access';
COMMENT ON COLUMN play_dates.schedule_locked IS 'Prevents schedule regeneration after first score entry';
COMMENT ON COLUMN matches.version IS 'Optimistic locking field to prevent concurrent update conflicts';
COMMENT ON COLUMN matches.winning_partnership_id IS 'Denormalized winner for performance optimization';

COMMIT;