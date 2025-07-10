# Database Inconsistencies Report

## Executive Summary

After analyzing the frontend code expectations and the actual database schema, I've identified multiple critical inconsistencies that are causing application failures. The most significant issues involve column name mismatches, missing columns, incorrect data types, and RPC function parameter mismatches.

## Critical Inconsistencies

### 1. play_dates Table

#### Column Name Mismatches:
- **Frontend expects**: `name`, `created_by`, `court_count`
- **Database has**: No `name` column, `organizer_id` instead of `created_by`, `num_courts` instead of `court_count`
- **Fix needed**: Database migration to rename columns

#### Data Type Mismatches:
- **Frontend expects**: `win_condition` as "first-to-target" | "win-by-2" (with hyphens)
- **Database has**: `win_condition` as 'first_to_target' | 'win_by_2' (with underscores)
- **Fix needed**: Update frontend types or database CHECK constraint

#### Missing Columns:
- **Frontend expects**: `name` column for play dates
- **Database has**: No name column
- **Fix needed**: Add `name` column to database

### 2. players Table

#### Structure Mismatch:
- **Frontend expects**: `play_date_id` column (players belong to play dates)
- **Database has**: No `play_date_id` column (players are global)
- **Frontend expects**: `project_owner` column
- **Database has**: `is_project_owner` column
- **Fix needed**: Either update frontend to use global players model or add play_date association

### 3. player_claims Table

#### Primary Key Mismatch:
- **Frontend expects**: `id` column as primary key
- **Database has**: `player_id` as primary key (no separate id column)
- **Fix needed**: Update frontend types

#### Missing Column:
- **Frontend expects**: `created_at` column
- **Database has**: `claimed_at` column instead
- **Fix needed**: Rename column or update frontend

### 4. partnerships Table

#### Missing Column:
- **Frontend expects**: Standard structure
- **Database has**: `partnership_name` column that frontend doesn't use
- **Fix needed**: Update frontend types to include partnership_name

### 5. matches Table

#### Column Name Mismatches:
- **Frontend expects**: `court_number`, `updated_by`
- **Database has**: `court_id` (reference to courts table), `recorded_by`
- **Fix needed**: Update frontend to use court_id relationship

#### Missing Columns:
- **Frontend expects**: `scheduled_at` column
- **Database has**: No `scheduled_at` column
- **Fix needed**: Add column to database

### 6. courts Table

#### Column Name Mismatch:
- **Frontend expects**: `number` column
- **Database has**: `court_number` column
- **Fix needed**: Update frontend types

### 7. audit_log Table

#### Complete Structure Mismatch:
- **Frontend expects**: `match_id`, `change_type`, `old_values`, `new_values`, `changed_by`, `changed_at`, `ip_address`, `user_agent`, `reason`
- **Database has**: `play_date_id`, `match_id`, `player_id`, `action_type`, `old_values`, `new_values`, `metadata`, `created_at`
- **Fix needed**: Major restructuring needed

### 8. match_results View

#### Column Name Mismatches:
- **Frontend expects**: `games_won`, `games_lost`
- **Database has**: `wins`, `losses`
- **Fix needed**: Update frontend types

### 9. RPC Functions

#### claim_player Function:
- **Frontend calls with**: Only `player_id` parameter
- **Database expects**: Only `player_id` parameter (after latest migration)
- **Status**: This should now be working correctly

## Migration Script

```sql
-- Migration: Fix all database inconsistencies
-- Date: 2025-07-10

BEGIN;

-- 1. Fix play_dates table
ALTER TABLE play_dates 
ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Play Date';

ALTER TABLE play_dates 
RENAME COLUMN organizer_id TO created_by;

ALTER TABLE play_dates 
RENAME COLUMN num_courts TO court_count;

-- Update win_condition values to use hyphens
UPDATE play_dates 
SET win_condition = CASE 
    WHEN win_condition = 'first_to_target' THEN 'first-to-target'
    WHEN win_condition = 'win_by_2' THEN 'win-by-2'
    ELSE win_condition
END;

-- Update CHECK constraint
ALTER TABLE play_dates 
DROP CONSTRAINT play_dates_win_condition_check;

ALTER TABLE play_dates 
ADD CONSTRAINT play_dates_win_condition_check 
CHECK (win_condition IN ('first-to-target', 'win-by-2'));

-- 2. Fix players table
ALTER TABLE players 
RENAME COLUMN is_project_owner TO project_owner;

-- Note: Adding play_date_id would require major architectural change
-- Frontend should be updated to use global players model instead

-- 3. Fix player_claims table
ALTER TABLE player_claims 
ADD COLUMN id UUID DEFAULT gen_random_uuid();

ALTER TABLE player_claims 
RENAME COLUMN claimed_at TO created_at;

-- 4. Fix matches table
ALTER TABLE matches 
ADD COLUMN scheduled_at TIMESTAMPTZ;

ALTER TABLE matches 
ADD COLUMN court_number INTEGER;

-- Update court_number from court_id relationship
UPDATE matches m
SET court_number = c.court_number
FROM courts c
WHERE m.court_id = c.id;

ALTER TABLE matches 
RENAME COLUMN recorded_by TO updated_by;

-- 5. Fix courts table
ALTER TABLE courts 
RENAME COLUMN court_number TO number;

-- 6. Fix audit_log table (major restructuring)
ALTER TABLE audit_log 
RENAME COLUMN action_type TO change_type;

ALTER TABLE audit_log 
RENAME COLUMN created_at TO changed_at;

ALTER TABLE audit_log 
ADD COLUMN changed_by UUID REFERENCES players(id);

ALTER TABLE audit_log 
ADD COLUMN ip_address VARCHAR(45);

ALTER TABLE audit_log 
ADD COLUMN user_agent TEXT;

ALTER TABLE audit_log 
ADD COLUMN reason TEXT;

-- Update changed_by from metadata
UPDATE audit_log 
SET changed_by = (metadata->>'user_id')::UUID
WHERE metadata->>'user_id' IS NOT NULL;

-- 7. Update match_results materialized view
DROP MATERIALIZED VIEW IF EXISTS match_results;

CREATE MATERIALIZED VIEW match_results AS
SELECT 
    p.id AS player_id,
    p.name AS player_name,
    pd.id AS play_date_id,
    pd.date AS play_date,
    pd.status AS play_date_status,
    
    COUNT(m.id) AS games_played,
    
    -- Rename to match frontend expectations
    SUM(CASE 
        WHEN m.winning_partnership_id IN (
            SELECT id FROM partnerships 
            WHERE (player1_id = p.id OR player2_id = p.id) 
            AND play_date_id = pd.id
        ) THEN 1 
        ELSE 0 
    END) AS games_won,
    
    SUM(CASE 
        WHEN m.winning_partnership_id NOT IN (
            SELECT id FROM partnerships 
            WHERE (player1_id = p.id OR player2_id = p.id) 
            AND play_date_id = pd.id
        ) AND m.winning_partnership_id IS NOT NULL
        THEN 1 
        ELSE 0 
    END) AS games_lost,
    
    -- Rest of the columns remain the same
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
    END) AS points_against

FROM players p
CROSS JOIN play_dates pd
LEFT JOIN partnerships part ON (part.player1_id = p.id OR part.player2_id = p.id) 
    AND part.play_date_id = pd.id
LEFT JOIN matches m ON (m.partnership1_id = part.id OR m.partnership2_id = part.id)
    AND m.play_date_id = pd.id 
    AND m.status = 'completed'
GROUP BY p.id, p.name, pd.id, pd.date, pd.status;

-- Recreate index
CREATE UNIQUE INDEX idx_match_results_player_play_date ON match_results(player_id, play_date_id);

-- Update all RLS policies that reference renamed columns
-- (Implementation depends on existing policies)

COMMIT;
```

## Frontend Code Changes Needed

### 1. Update database.ts types:

```typescript
// Fix play_dates table type
play_dates: {
  Row: {
    // ... existing fields ...
    organizer_id: string; // Change from created_by
    num_courts: number; // Change from court_count
    win_condition: "first_to_target" | "win_by_2"; // Change to underscores
    // Remove 'name' field or add it to database
  };
};

// Fix players table type
players: {
  Row: {
    // Remove play_date_id field
    is_project_owner: boolean; // Change from project_owner
    // ... rest of fields ...
  };
};

// Fix player_claims table type
player_claims: {
  Row: {
    // Remove 'id' field as player_id is the primary key
    player_id: string; // This is the primary key
    auth_user_id: string;
    claimed_at: string; // Change from created_at
  };
};

// Fix matches table type
matches: {
  Row: {
    court_id: string; // Change from court_number
    recorded_by: string | null; // Change from updated_by
    // Remove scheduled_at unless adding to database
  };
};

// Fix courts table type
courts: {
  Row: {
    court_number: number; // Change from 'number'
    // ... rest of fields ...
  };
};

// Fix match_results view type
match_results: {
  Row: {
    wins: number; // Change from games_won
    losses: number; // Change from games_lost
    // ... rest of fields ...
  };
};
```

### 2. Update all queries that reference renamed columns

### 3. Update components to handle the architectural difference for players (global vs per-play-date)

## Recommendations

1. **Immediate Fix**: Update the frontend types to match the current database schema. This is the fastest solution to get the application working.

2. **Long-term Fix**: Run the migration script to align the database with frontend expectations, but this requires careful testing.

3. **Architecture Decision**: Decide whether players should be global (current database design) or per-play-date (frontend expectation). This is a fundamental design decision that affects the entire application.

4. **Testing**: After any changes, thoroughly test:
   - Player claim functionality
   - Play date creation
   - Score entry
   - Rankings calculation
   - Real-time updates

## Priority Actions

1. **Fix the claim_player RPC call** - ✅ Already fixed in latest migration
2. **Update frontend types to match database** - Critical for application to work
3. **Fix win_condition format mismatch** - Causing issues with play date creation
4. **Address the players table architecture** - Major decision needed
5. **Fix audit_log structure** - Important for tracking changes

## Conclusion

The application has significant misalignment between frontend expectations and database reality. The fastest path to a working application is updating the frontend types to match the current database schema. A more comprehensive solution would involve database migrations, but this requires careful planning and testing to avoid data loss.