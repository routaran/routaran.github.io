# API Reference

This document provides comprehensive reference for the Pickleball Tracker database schema, API endpoints, and real-time subscriptions.

## Table of Contents

- [Database Schema](#database-schema)
- [Row Level Security](#row-level-security)
- [API Endpoints](#api-endpoints)
- [Real-Time Subscriptions](#real-time-subscriptions)
- [Authentication](#authentication)
- [Data Types](#data-types)
- [Common Queries](#common-queries)

## Database Schema

### Tables Overview

```sql
play_dates          # Tournament events
players             # All registered players  
player_claims       # Links players to auth UIDs
partnerships        # Doubles pairings
matches             # Games between partnerships
match_results       # Materialized view for stats
audit_log          # Score change history
```

### play_dates

Tournament events with configuration and metadata.

```sql
CREATE TABLE play_dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    location TEXT,
    description TEXT,
    max_players INTEGER DEFAULT 16 CHECK (max_players >= 4 AND max_players <= 16),
    max_courts INTEGER DEFAULT 4 CHECK (max_courts >= 1 AND max_courts <= 4),
    target_score INTEGER DEFAULT 11 CHECK (target_score BETWEEN 5 AND 21),
    win_by_two BOOLEAN DEFAULT true,
    creator_uid UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_play_dates_date` on `date`
- `idx_play_dates_creator` on `creator_uid`

### players

All players in the system with contact information.

```sql
CREATE TABLE players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    is_project_owner BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Constraints:**
- `name` must be unique across all players
- `email` must be unique if provided

### player_claims

Links authenticated users to player records.

```sql
CREATE TABLE player_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    user_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(player_id),
    UNIQUE(user_uid)
);
```

**Business Rules:**
- Each player can only be claimed by one user
- Each user can only claim one player
- First person to claim becomes the organizer for play dates they create

### partnerships

Pre-generated doubles pairings for tournament scheduling.

```sql
CREATE TABLE partnerships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    play_date_id UUID NOT NULL REFERENCES play_dates(id) ON DELETE CASCADE,
    player1_id UUID NOT NULL REFERENCES players(id),
    player2_id UUID NOT NULL REFERENCES players(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK (player1_id != player2_id),
    UNIQUE(play_date_id, player1_id, player2_id)
);
```

**Constraints:**
- Partners must be different players
- Each pairing is unique within a play date

### matches

Games between partnerships with scores and metadata.

```sql
CREATE TABLE matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    play_date_id UUID NOT NULL REFERENCES play_dates(id) ON DELETE CASCADE,
    partnership1_id UUID NOT NULL REFERENCES partnerships(id),
    partnership2_id UUID NOT NULL REFERENCES partnerships(id),
    round_number INTEGER NOT NULL,
    court_number INTEGER,
    partnership1_score INTEGER DEFAULT 0 CHECK (partnership1_score >= 0),
    partnership2_score INTEGER DEFAULT 0 CHECK (partnership2_score >= 0),
    is_complete BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (partnership1_id != partnership2_id)
);
```

**Key Features:**
- `version` field enables optimistic locking
- `is_complete` tracks match completion
- `court_number` can be null for unscheduled matches

**Indexes:**
- `idx_matches_play_date` on `play_date_id`
- `idx_matches_round` on `(play_date_id, round_number)`

### match_results (Materialized View)

Pre-calculated player statistics for performance.

```sql
CREATE MATERIALIZED VIEW match_results AS
SELECT 
    p.id as player_id,
    pd.id as play_date_id,
    COUNT(DISTINCT m.id) as matches_played,
    SUM(CASE WHEN winner_partnership_id IS NOT NULL 
             AND (pt1.player1_id = p.id OR pt1.player2_id = p.id 
                  OR pt2.player1_id = p.id OR pt2.player2_id = p.id)
             AND winner_partnership_id = CASE 
                 WHEN pt1.player1_id = p.id OR pt1.player2_id = p.id 
                 THEN pt1.id 
                 ELSE pt2.id 
             END
        THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN m.is_complete THEN m.partnership1_score + m.partnership2_score ELSE 0 END) as total_points
FROM players p
CROSS JOIN play_dates pd
-- Complex joins for match participation
GROUP BY p.id, pd.id;
```

**Refresh Strategy:**
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY match_results;
```

### audit_log

Complete history of score changes for dispute resolution.

```sql
CREATE TABLE audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    changed_by_uid UUID REFERENCES auth.users(id),
    old_partnership1_score INTEGER,
    old_partnership2_score INTEGER,
    new_partnership1_score INTEGER,
    new_partnership2_score INTEGER,
    old_is_complete BOOLEAN,
    new_is_complete BOOLEAN,
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Row Level Security

### Authentication Helpers

```sql
-- Get current user's player ID
CREATE OR REPLACE FUNCTION get_current_player_id() 
RETURNS UUID AS $$
    SELECT player_id FROM player_claims WHERE user_uid = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is project owner
CREATE OR REPLACE FUNCTION is_project_owner() 
RETURNS BOOLEAN AS $$
    SELECT EXISTS(
        SELECT 1 FROM players p
        JOIN player_claims pc ON p.id = pc.player_id
        WHERE pc.user_uid = auth.uid() AND p.is_project_owner = true
    );
$$ LANGUAGE SQL SECURITY DEFINER;
```

### RLS Policies

#### play_dates Policies

```sql
-- SELECT: Anyone can view play dates
CREATE POLICY "play_dates_select" ON play_dates FOR SELECT USING (true);

-- INSERT: Authenticated users can create
CREATE POLICY "play_dates_insert" ON play_dates FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Creator or project owner can modify
CREATE POLICY "play_dates_update" ON play_dates FOR UPDATE 
    USING (creator_uid = auth.uid() OR is_project_owner());

-- DELETE: Only project owner can delete
CREATE POLICY "play_dates_delete" ON play_dates FOR DELETE 
    USING (is_project_owner());
```

#### matches Policies

```sql
-- SELECT: Anyone can view matches
CREATE POLICY "matches_select" ON matches FOR SELECT USING (true);

-- UPDATE: Players can update their own match scores
CREATE POLICY "matches_update_score" ON matches FOR UPDATE 
    USING (
        -- Player is in partnership1 or partnership2
        EXISTS(
            SELECT 1 FROM partnerships p1 
            WHERE p1.id = partnership1_id 
            AND (p1.player1_id = get_current_player_id() 
                 OR p1.player2_id = get_current_player_id())
        ) OR EXISTS(
            SELECT 1 FROM partnerships p2 
            WHERE p2.id = partnership2_id 
            AND (p2.player1_id = get_current_player_id() 
                 OR p2.player2_id = get_current_player_id())
        ) OR is_project_owner()
    );
```

## API Endpoints

### Base Configuration

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)
```

### Play Dates

#### Get All Play Dates

```typescript
const { data: playDates, error } = await supabase
  .from('play_dates')
  .select(`
    *,
    creator:players!creator_uid(name),
    player_count:partnerships(count)
  `)
  .order('date', { ascending: false })
```

#### Create Play Date

```typescript
const { data, error } = await supabase
  .from('play_dates')
  .insert({
    name: 'Tournament Name',
    date: '2024-01-15',
    location: 'Local Courts',
    max_players: 16,
    target_score: 11,
    win_by_two: true
  })
  .select()
```

### Matches

#### Get Matches for Play Date

```typescript
const { data: matches, error } = await supabase
  .from('matches')
  .select(`
    *,
    partnership1:partnerships!partnership1_id(
      player1:players!player1_id(name),
      player2:players!player2_id(name)
    ),
    partnership2:partnerships!partnership2_id(
      player1:players!player1_id(name),
      player2:players!player2_id(name)
    )
  `)
  .eq('play_date_id', playDateId)
  .order('round_number')
```

#### Update Match Score

```typescript
const { data, error } = await supabase
  .from('matches')
  .update({
    partnership1_score: 11,
    partnership2_score: 8,
    is_complete: true,
    completed_at: new Date().toISOString(),
    version: currentVersion + 1
  })
  .eq('id', matchId)
  .eq('version', currentVersion) // Optimistic locking
```

### Rankings

#### Get Player Rankings

```typescript
const { data: rankings, error } = await supabase
  .from('match_results')
  .select(`
    *,
    player:players(name)
  `)
  .eq('play_date_id', playDateId)
  .order('wins', { ascending: false })
  .order('total_points', { ascending: false })
```

## Real-Time Subscriptions

### Match Updates

```typescript
const matchSubscription = supabase
  .channel('match-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'matches',
      filter: `play_date_id=eq.${playDateId}`
    },
    (payload) => {
      console.log('Match updated:', payload.new)
      // Update local state
    }
  )
  .subscribe()
```

### Play Date Changes

```typescript
const playDateSubscription = supabase
  .channel('play-date-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'play_dates'
    },
    (payload) => {
      console.log('Play date changed:', payload)
    }
  )
  .subscribe()
```

### Connection Management

```typescript
const subscription = supabase
  .channel('matches')
  .on('postgres_changes', config, handler)
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Connected to realtime')
    }
  })

// Cleanup
useEffect(() => {
  return () => {
    subscription.unsubscribe()
  }
}, [])
```

## Authentication

### Magic Link Login

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://yourapp.com/auth/callback'
  }
})
```

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser()
```

### Player Claiming

```typescript
// First-time user claims a player
const { error } = await supabase
  .from('player_claims')
  .insert({
    player_id: selectedPlayerId,
    user_uid: user.id
  })
```

## Data Types

### TypeScript Interfaces

```typescript
interface PlayDate {
  id: string
  name: string
  date: string
  location?: string
  description?: string
  max_players: number
  max_courts: number
  target_score: number
  win_by_two: boolean
  creator_uid?: string
  created_at: string
  updated_at: string
}

interface Match {
  id: string
  play_date_id: string
  partnership1_id: string
  partnership2_id: string
  round_number: number
  court_number?: number
  partnership1_score: number
  partnership2_score: number
  is_complete: boolean
  completed_at?: string
  version: number
  created_at: string
  updated_at: string
}

interface Partnership {
  id: string
  play_date_id: string
  player1_id: string
  player2_id: string
  created_at: string
}

interface Player {
  id: string
  name: string
  email?: string
  is_project_owner: boolean
  created_at: string
  updated_at: string
}
```

## Common Queries

### Get Tournament Standings

```sql
WITH player_stats AS (
  SELECT 
    p.id,
    p.name,
    COUNT(CASE WHEN m.is_complete THEN 1 END) as matches_played,
    COUNT(CASE WHEN m.is_complete AND winner.partnership_id IS NOT NULL THEN 1 END) as wins,
    SUM(CASE WHEN m.is_complete THEN 
      CASE WHEN pt1.player1_id = p.id OR pt1.player2_id = p.id 
           THEN m.partnership1_score 
           ELSE m.partnership2_score 
      END
    ELSE 0 END) as points_for,
    SUM(CASE WHEN m.is_complete THEN 
      CASE WHEN pt1.player1_id = p.id OR pt1.player2_id = p.id 
           THEN m.partnership2_score 
           ELSE m.partnership1_score 
      END
    ELSE 0 END) as points_against
  FROM players p
  JOIN partnerships pt1 ON (pt1.player1_id = p.id OR pt1.player2_id = p.id)
  JOIN matches m ON (m.partnership1_id = pt1.id OR m.partnership2_id = pt1.id)
  WHERE m.play_date_id = $1
  GROUP BY p.id, p.name
)
SELECT *, (points_for - points_against) as point_differential
FROM player_stats
ORDER BY wins DESC, point_differential DESC, points_for DESC;
```

### Generate Round-Robin Schedule

```sql
-- This is handled in application code due to complexity
-- See: app/src/lib/scheduling.ts
```

### Find Available Courts

```sql
SELECT DISTINCT court_number
FROM matches
WHERE play_date_id = $1 
  AND round_number = $2 
  AND court_number IS NOT NULL;
```