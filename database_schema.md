# Comprehensive Database Schema - Pickleball Tracker

## Executive Summary

This document presents the complete database schema design for the Pickleball Tracker system, synthesizing requirements from UI wireframes analysis and business logic requirements. The schema supports a partnership-based round-robin tournament system with real-time updates, comprehensive audit trails, and multi-role security through Row-Level Security policies.

## Design Philosophy

### Core Principles
1. **Partnership-Centric Model**: All match operations centered around pre-generated partnerships for enhanced analytics
2. **Optimistic Locking**: Version fields prevent concurrent score update conflicts
3. **Real-time Architecture**: Supabase Realtime enables sub-second updates across all clients
4. **Comprehensive Audit Trail**: Full change history for dispute resolution and transparency
5. **Performance Optimization**: Materialized views and strategic indexing for fast queries
6. **Security by Design**: RLS policies enforce role-based access control

### Database Technology Stack
- **Primary Database**: PostgreSQL (via Supabase)
- **Real-time Updates**: Supabase Realtime WebSocket subscriptions
- **Authentication**: Supabase Auth with magic link authentication
- **Security**: Row-Level Security (RLS) policies
- **Performance**: Materialized views for analytics

## Core Tables

### 1. play_dates
**Purpose**: Tournament days with configuration settings and status tracking

```sql
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
    version INTEGER NOT NULL DEFAULT 1
);
```

**Key Features**:
- Supports 1-4 courts per tournament
- Flexible win conditions (first-to-target or win-by-2)
- Schedule locking prevents regeneration after first score
- Status tracking for UI workflow management
- Optimistic locking for concurrent updates

### 2. players
**Purpose**: All players in the system with authentication mapping

```sql
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_project_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key Features**:
- Unique player names globally (FR-03: "Duplicate names are rejected")
- Unique email addresses for authentication
- Project owner flag for admin privileges
- Global player registry across all tournaments

### 3. player_claims
**Purpose**: Links players to Supabase auth UIDs for secure authentication

```sql
CREATE TABLE player_claims (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    supabase_uid UUID UNIQUE NOT NULL REFERENCES auth.users(id),
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key Features**:
- One-time claim system linking players to auth UIDs
- Prevents multiple users from claiming same player name
- Enables secure score entry authorization

### 4. courts
**Purpose**: Court configuration per Play Date with custom naming support

```sql
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    play_date_id UUID NOT NULL REFERENCES play_dates(id) ON DELETE CASCADE,
    court_number INTEGER NOT NULL CHECK (court_number BETWEEN 1 AND 4),
    court_name VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(play_date_id, court_number)
);
```

**Key Features**:
- Custom court names (up to 20 characters)
- Emoji support for personalization
- Automatic creation based on play_date.num_courts

### 5. partnerships
**Purpose**: Pre-generated doubles pairings for enhanced analytics

```sql
CREATE TABLE partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    play_date_id UUID NOT NULL REFERENCES play_dates(id) ON DELETE CASCADE,
    player1_id UUID NOT NULL REFERENCES players(id),
    player2_id UUID NOT NULL REFERENCES players(id),
    partnership_name VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(play_date_id, player1_id, player2_id),
    CHECK (player1_id != player2_id)
);
```

**Key Features**:
- Pre-calculated partnerships for round-robin scheduling
- Human-readable partnership names (Team A, B, C, etc.)
- Prevents duplicate partnerships per play date
- Enables rich partnership analytics

### 6. matches
**Purpose**: Individual games with scores and comprehensive tracking

```sql
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
    CHECK (partnership1_id != partnership2_id),
    CHECK (winning_partnership_id IN (partnership1_id, partnership2_id) OR winning_partnership_id IS NULL)
);
```

**Key Features**:
- Optimistic locking prevents concurrent score updates
- Comprehensive match status tracking
- Audit trail of who recorded scores and when
- Winning partnership denormalization for performance

### 7. audit_log
**Purpose**: Complete audit trail for all system changes

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    play_date_id UUID REFERENCES play_dates(id),
    match_id UUID REFERENCES matches(id),
    player_id UUID REFERENCES players(id),
    action_type VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key Features**:
- Full change history for dispute resolution
- JSONB storage for flexible data tracking
- Supports multiple action types (score_entry, player_added, etc.)
- Metadata field for additional context

## Materialized Views

### 8. match_results
**Purpose**: Pre-calculated player statistics for high-performance rankings

```sql
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
```

**Key Features**:
- Pre-calculated statistics for instant rankings
- Supports all ranking methods (wins, points, win percentage)
- Optimized for mobile dashboard performance
- Refreshed via triggers on match completion

## Performance Optimization

### Critical Security Fixes

**Recent Updates (2025-07-09)**:
1. **Added UNIQUE constraint on player names** (FR-03: "Duplicate names are rejected")
2. **Enhanced RLS policies** with specific completion checks (FR-07, NFR-09)
3. **Added match completion locking** to prevent data integrity issues

### Strategic Indexing

```sql
-- Primary lookup indexes
CREATE INDEX idx_play_dates_date ON play_dates(date DESC);
CREATE INDEX idx_play_dates_organizer ON play_dates(organizer_id);
CREATE INDEX idx_play_dates_status ON play_dates(status);

-- Match querying indexes
CREATE INDEX idx_matches_play_date_status ON matches(play_date_id, status);
CREATE INDEX idx_matches_court_round ON matches(court_id, round_number);
CREATE INDEX idx_matches_partnership1 ON matches(partnership1_id);
CREATE INDEX idx_matches_partnership2 ON matches(partnership2_id);
CREATE INDEX idx_matches_winning_partnership ON matches(winning_partnership_id);

-- Partnership lookup indexes
CREATE INDEX idx_partnerships_play_date ON partnerships(play_date_id);
CREATE INDEX idx_partnerships_player1 ON partnerships(player1_id);
CREATE INDEX idx_partnerships_player2 ON partnerships(player2_id);

-- Authentication indexes
CREATE UNIQUE INDEX idx_player_claims_supabase_uid ON player_claims(supabase_uid);
CREATE INDEX idx_players_email ON players(email);

-- Audit and real-time indexes
CREATE INDEX idx_audit_log_play_date_created ON audit_log(play_date_id, created_at DESC);
CREATE INDEX idx_audit_log_match_created ON audit_log(match_id, created_at DESC);
CREATE INDEX idx_audit_log_player_created ON audit_log(player_id, created_at DESC);

-- Court management indexes
CREATE INDEX idx_courts_play_date ON courts(play_date_id);
CREATE INDEX idx_courts_play_date_number ON courts(play_date_id, court_number);

-- Materialized view indexes
CREATE INDEX idx_match_results_play_date_wins ON match_results(play_date_id, wins DESC);
CREATE INDEX idx_match_results_play_date_points ON match_results(play_date_id, points_for DESC);
CREATE INDEX idx_match_results_play_date_percentage ON match_results(play_date_id, win_percentage DESC);
CREATE INDEX idx_match_results_play_date_differential ON match_results(play_date_id, point_differential DESC);
```

### Real-time Update Configuration

```sql
-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE play_dates;
ALTER PUBLICATION supabase_realtime ADD TABLE partnerships;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
```

## Security Architecture

### Row-Level Security Policies

#### Project Owner Access (Full Administrative Access)
```sql
-- Project owners can access all data
CREATE POLICY "Project owners full access" ON play_dates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM players p 
            JOIN player_claims pc ON p.id = pc.player_id 
            WHERE pc.supabase_uid = auth.uid() 
            AND p.is_project_owner = true
        )
    );

-- Similar policies for all other tables
```

#### Organizer Access (Play Date Management)
```sql
-- Organizers can manage their own play dates
CREATE POLICY "Organizers manage own play dates" ON play_dates
    FOR ALL TO authenticated
    USING (
        organizer_id IN (
            SELECT p.id FROM players p 
            JOIN player_claims pc ON p.id = pc.player_id 
            WHERE pc.supabase_uid = auth.uid()
        )
    );
```

#### Player Access (Score Entry)
```sql
-- Players can update scores for their own incomplete matches only (FR-07)
CREATE POLICY "Players update own incomplete matches" ON matches
    FOR UPDATE TO authenticated
    USING (
        completed = FALSE AND
        EXISTS (
            SELECT 1 FROM partnerships part
            JOIN player_claims pc ON (part.player1_id = pc.player_id OR part.player2_id = pc.player_id)
            WHERE pc.supabase_uid = auth.uid()
            AND (part.id = matches.partnership1_id OR part.id = matches.partnership2_id)
        )
    );

-- Data integrity: lock matches after completion (NFR-09)
CREATE POLICY "Lock completed matches" ON matches
    FOR UPDATE TO authenticated
    WITH CHECK (completed = TRUE);
```

#### Visitor Access (Read-Only)
```sql
-- Visitors can read public data
CREATE POLICY "Visitors read public data" ON play_dates
    FOR SELECT TO anon
    USING (status IN ('active', 'completed'));
```

### Data Privacy and Compliance

#### Email Protection
- Email addresses stored only in `players` table
- No email data in audit logs or exports
- Magic link authentication prevents password storage

#### Audit Trail Privacy
- Player names only (no email addresses)
- Match-specific data only (no personal information)
- Automatic cleanup of old audit entries (optional)

## Data Integrity and Business Rules

### Triggers for Business Logic

#### 1. Schedule Lock Trigger
```sql
CREATE OR REPLACE FUNCTION lock_schedule_on_first_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.team1_score IS NOT NULL AND NEW.team2_score IS NOT NULL 
       AND (OLD.team1_score IS NULL OR OLD.team2_score IS NULL) THEN
        UPDATE play_dates 
        SET schedule_locked = true 
        WHERE id = NEW.play_date_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lock_schedule
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION lock_schedule_on_first_score();
```

#### 2. Audit Log Trigger
```sql
CREATE OR REPLACE FUNCTION log_match_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        match_id, 
        player_id, 
        action_type, 
        old_values, 
        new_values,
        metadata
    ) VALUES (
        NEW.id,
        NEW.recorded_by,
        'score_entry',
        to_jsonb(OLD),
        to_jsonb(NEW),
        jsonb_build_object('timestamp', NOW())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_match_changes
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION log_match_changes();
```

#### 3. Materialized View Refresh Trigger
```sql
CREATE OR REPLACE FUNCTION refresh_match_results()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY match_results;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_match_results
    AFTER INSERT OR UPDATE OR DELETE ON matches
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_match_results();
```

### Data Validation Functions

#### Score Validation
```sql
CREATE OR REPLACE FUNCTION validate_score(
    p_team1_score INTEGER,
    p_team2_score INTEGER,
    p_win_condition VARCHAR(20),
    p_target_score INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    -- Both scores must be provided
    IF p_team1_score IS NULL OR p_team2_score IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Scores must be non-negative
    IF p_team1_score < 0 OR p_team2_score < 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Validate win conditions
    IF p_win_condition = 'first_to_target' THEN
        RETURN (p_team1_score = p_target_score AND p_team2_score < p_target_score) OR
               (p_team2_score = p_target_score AND p_team1_score < p_target_score);
    ELSIF p_win_condition = 'win_by_2' THEN
        RETURN (p_team1_score >= p_target_score AND p_team1_score - p_team2_score >= 2) OR
               (p_team2_score >= p_target_score AND p_team2_score - p_team1_score >= 2);
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

## Migration Strategy

### Phase 1: Core Tables
1. Create basic table structure
2. Insert seed data for admin user
3. Set up RLS policies for authentication

### Phase 2: Partnerships and Matches
1. Create partnership generation functions
2. Create match scheduling algorithms
3. Test round-robin generation

### Phase 3: Real-time and Performance
1. Enable Supabase Realtime
2. Create materialized views
3. Implement trigger functions

### Phase 4: Security and Audit
1. Implement comprehensive RLS policies
2. Create audit logging system
3. Test all security scenarios

### Sample Migration Script
```sql
-- Migration: 001_initial_tables.sql
BEGIN;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables in dependency order
CREATE TABLE players (...);
CREATE TABLE player_claims (...);
CREATE TABLE play_dates (...);
CREATE TABLE courts (...);
CREATE TABLE partnerships (...);
CREATE TABLE matches (...);
CREATE TABLE audit_log (...);

-- Create indexes
CREATE INDEX ...;

-- Create RLS policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...;

-- Create triggers
CREATE TRIGGER ...;

COMMIT;
```

## Performance Benchmarks

### Target Performance Metrics
- **Initial page load**: ≤ 2 seconds
- **Real-time updates**: ≤ 1 second propagation
- **Rankings calculation**: ≤ 500ms (via materialized view)
- **Dashboard queries**: ≤ 200ms
- **Score entry**: ≤ 100ms response time

### Capacity Planning
- **Maximum configuration**: 16 players, 4 courts
- **Maximum matches per play date**: 120 matches
- **Storage per play date**: ~10KB with full results
- **Concurrent users**: 50+ per play date
- **Database size**: 500MB supports 50,000+ play dates

## Maintenance and Monitoring

### Automated Maintenance
```sql
-- Clean up old audit logs (optional)
DELETE FROM audit_log 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY match_results;

-- Update table statistics
ANALYZE players, play_dates, matches, partnerships;
```

### Monitoring Queries
```sql
-- Monitor real-time performance
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
FROM pg_stat_user_tables
WHERE tablename IN ('matches', 'play_dates', 'partnerships');

-- Monitor index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('matches', 'play_dates', 'partnerships');
```

## Conclusion

This comprehensive database schema provides a robust foundation for the Pickleball Tracker system, supporting all identified requirements from both UI wireframes and business logic analysis. The design emphasizes:

1. **Scalability**: Handles up to 16 players and 4 courts efficiently
2. **Real-time Performance**: Sub-second updates through optimized queries and materialized views
3. **Data Integrity**: Comprehensive constraints and triggers ensure data consistency
4. **Security**: Multi-level RLS policies support all user roles
5. **Auditability**: Complete change tracking for dispute resolution
6. **Maintainability**: Clear structure with automated maintenance capabilities

The schema is ready for implementation with Supabase and supports all 33 wireframes across the 4 user roles while maintaining the performance and security requirements specified in the project documentation.