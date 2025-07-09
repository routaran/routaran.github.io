# Supabase RLS Security Policies

## Overview

This document defines the complete Row Level Security (RLS) implementation for the Pickleball Tracker system. The security model supports four distinct user roles with appropriate access controls for each.

## User Roles

1. **Project Owner** - Full admin access to all Play Dates and system data
2. **Organizer** - Creates and manages their own Play Dates
3. **Player** - Updates scores for their matches only
4. **Visitor** - Read-only access without login

## 1. Helper Functions

These helper functions simplify policy definitions and improve query performance:

```sql
-- Get the current user's player ID from their auth session
CREATE OR REPLACE FUNCTION current_player_id()
RETURNS uuid AS $$
  SELECT player_id FROM player_claims WHERE supabase_uid = auth.uid()
$$ LANGUAGE sql STABLE;

-- Check if current user is a project owner
CREATE OR REPLACE FUNCTION is_project_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM players
    WHERE id = current_player_id()
    AND is_project_owner = TRUE
  )
$$ LANGUAGE sql STABLE;

-- Check if current user is the organizer of a specific play date
CREATE OR REPLACE FUNCTION is_organizer_of(play_date_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM play_dates
    WHERE id = $1
    AND organizer_id = current_player_id()
  )
$$ LANGUAGE sql STABLE;

-- Check if current user is a player in a specific match
CREATE OR REPLACE FUNCTION is_player_in_match(match_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches m
    JOIN partnerships p ON (p.id = m.partnership1_id OR p.id = m.partnership2_id)
    WHERE m.id = $1
    AND (p.player1_id = current_player_id() OR p.player2_id = current_player_id())
  )
$$ LANGUAGE sql STABLE;
```

## 2. Enable RLS on All Tables

```sql
-- Enable Row Level Security on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Enable RLS on the materialized view
ALTER MATERIALIZED VIEW match_results ENABLE ROW LEVEL SECURITY;
```

## 3. Policies by Table

### 3.1 players Table

```sql
-- Visitors can read all players (for displaying names)
CREATE POLICY "players_select_anon" ON players
  FOR SELECT TO anon
  USING (true);

-- Authenticated users can read all players
CREATE POLICY "players_select_authenticated" ON players
  FOR SELECT TO authenticated
  USING (true);

-- Only project owners can insert players
CREATE POLICY "players_insert_project_owner" ON players
  FOR INSERT TO authenticated
  WITH CHECK (is_project_owner());

-- Only project owners can update players
CREATE POLICY "players_update_project_owner" ON players
  FOR UPDATE TO authenticated
  USING (is_project_owner());

-- Only project owners can delete players
CREATE POLICY "players_delete_project_owner" ON players
  FOR DELETE TO authenticated
  USING (is_project_owner());
```

### 3.2 player_claims Table

```sql
-- Users can only view their own claims
CREATE POLICY "player_claims_select_own" ON player_claims
  FOR SELECT TO authenticated
  USING (supabase_uid = auth.uid());

-- Users can create their own claims (one-time only)
CREATE POLICY "player_claims_insert_own" ON player_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    supabase_uid = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM player_claims WHERE supabase_uid = auth.uid()
    )
  );

-- No updates allowed on claims
-- No deletes allowed on claims
```

### 3.3 play_dates Table

```sql
-- Visitors can read all play dates
CREATE POLICY "play_dates_select_anon" ON play_dates
  FOR SELECT TO anon
  USING (true);

-- Authenticated users can read all play dates
CREATE POLICY "play_dates_select_authenticated" ON play_dates
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can create play dates
CREATE POLICY "play_dates_insert_authenticated" ON play_dates
  FOR INSERT TO authenticated
  WITH CHECK (organizer_id = current_player_id());

-- Organizers can update their own play dates
CREATE POLICY "play_dates_update_organizer" ON play_dates
  FOR UPDATE TO authenticated
  USING (
    organizer_id = current_player_id()
    OR is_project_owner()
  )
  WITH CHECK (
    -- Prevent schedule regeneration after first score
    CASE 
      WHEN schedule_locked THEN OLD.* IS NOT DISTINCT FROM NEW.*
      ELSE true
    END
  );

-- Organizers can delete their own play dates
CREATE POLICY "play_dates_delete_organizer" ON play_dates
  FOR DELETE TO authenticated
  USING (
    organizer_id = current_player_id()
    OR is_project_owner()
  );
```

### 3.4 courts Table

```sql
-- Visitors can read all courts
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
  );

CREATE POLICY "courts_delete_organizer" ON courts
  FOR DELETE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );
```

### 3.5 partnerships Table

```sql
-- Visitors can read all partnerships
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
  );

CREATE POLICY "partnerships_delete_organizer" ON partnerships
  FOR DELETE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );
```

### 3.6 matches Table (Critical)

```sql
-- Visitors can read all matches
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
    -- Ensure optimistic locking
    version = OLD.version + 1
    AND recorded_by = current_player_id()
    AND recorded_at = NOW()
  );

-- Organizers can update any match in their play dates
CREATE POLICY "matches_update_organizer" ON matches
  FOR UPDATE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  )
  WITH CHECK (
    -- Ensure optimistic locking
    version = OLD.version + 1
    AND recorded_by = current_player_id()
    AND recorded_at = NOW()
  );

-- Organizers can delete matches from their play dates
CREATE POLICY "matches_delete_organizer" ON matches
  FOR DELETE TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );
```

### 3.7 audit_log Table

```sql
-- Organizers can view audit logs for their play dates
CREATE POLICY "audit_log_select_organizer" ON audit_log
  FOR SELECT TO authenticated
  USING (
    is_organizer_of(play_date_id)
    OR is_project_owner()
  );

-- System can insert audit logs via triggers
CREATE POLICY "audit_log_insert_system" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    player_id = current_player_id()
  );

-- No updates allowed on audit logs
-- No deletes allowed on audit logs
```

### 3.8 match_results Materialized View

```sql
-- Everyone can read match results (for rankings)
CREATE POLICY "match_results_select_all" ON match_results
  FOR SELECT TO anon, authenticated
  USING (true);

-- No inserts, updates, or deletes allowed (managed by system)
```

## 4. Authentication Flow

### 4.1 Magic Link Process

1. **User initiates login**
   - User selects their name from dropdown
   - User enters their email address
   - Frontend calls `supabase.auth.signInWithOtp({ email })`

2. **Supabase sends magic link**
   - Email contains secure one-time link
   - Link expires after 1 hour
   - Link contains JWT token

3. **User clicks magic link**
   - Browser opens with token in URL
   - Frontend extracts token
   - Frontend calls `supabase.auth.verifyOtp({ token })`

4. **Session established**
   - Supabase creates authenticated session
   - Frontend receives `auth.uid()`
   - Session persists for 7 days (configurable)

### 4.2 Player Claim Mechanism

```sql
-- Function to claim a player name (called after first login)
CREATE OR REPLACE FUNCTION claim_player(player_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if user already has a claim
  IF EXISTS (SELECT 1 FROM player_claims WHERE supabase_uid = auth.uid()) THEN
    RAISE EXCEPTION 'User has already claimed a player';
  END IF;
  
  -- Check if player is already claimed
  IF EXISTS (SELECT 1 FROM player_claims WHERE player_id = $1) THEN
    RAISE EXCEPTION 'Player has already been claimed';
  END IF;
  
  -- Create the claim
  INSERT INTO player_claims (player_id, supabase_uid, claimed_at)
  VALUES ($1, auth.uid(), NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.3 Session Management

```javascript
// Check if user is logged in
const { data: { session } } = await supabase.auth.getSession()

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Check if user has claimed a player
    checkPlayerClaim(session.user.id)
  }
})

// Sign out
await supabase.auth.signOut()
```

## 5. Audit Trail Implementation

### 5.1 Trigger Functions

```sql
-- Function to log match changes
CREATE OR REPLACE FUNCTION audit_match_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if scores actually changed
  IF (OLD.team1_score IS DISTINCT FROM NEW.team1_score) 
     OR (OLD.team2_score IS DISTINCT FROM NEW.team2_score) THEN
    
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
        'user_agent', current_setting('request.headers')::json->>'user-agent',
        'ip_address', current_setting('request.headers')::json->>'x-forwarded-for'
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for match updates
CREATE TRIGGER audit_match_update
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION audit_match_change();
```

### 5.2 What Gets Logged

- All score changes with before/after values
- Player who made the change
- Timestamp of change
- Client metadata (IP, user agent)
- Match status transitions
- Version number changes

### 5.3 Audit Log Access

- **Project Owners**: Can view all audit logs
- **Organizers**: Can view audit logs for their Play Dates only
- **Players**: No access to audit logs
- **Visitors**: No access to audit logs

## 6. CSP Headers for GitHub Pages

Since GitHub Pages doesn't allow custom headers, implement CSP via meta tags:

```html
<!-- Add to index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https://*.supabase.co; 
               connect-src 'self' https://*.supabase.co wss://*.supabase.co; 
               font-src 'self'; 
               object-src 'none'; 
               media-src 'self'; 
               frame-src 'none';">
```

### CSP Directives Explained

- **default-src 'self'**: Only allow resources from same origin by default
- **script-src**: Allow Supabase SDK, disable inline scripts in production
- **style-src**: Allow inline styles for Tailwind
- **connect-src**: Allow API calls to Supabase
- **wss://**: Allow WebSocket connections for real-time features
- **object-src 'none'**: Block plugins like Flash
- **frame-src 'none'**: Prevent clickjacking attacks

## 7. Security Best Practices

### 7.1 Database Constraints

```sql
-- Prevent duplicate claims
ALTER TABLE player_claims 
ADD CONSTRAINT unique_player_claim UNIQUE (player_id);

ALTER TABLE player_claims 
ADD CONSTRAINT unique_supabase_uid UNIQUE (supabase_uid);

-- Ensure partnerships are unique per play date
ALTER TABLE partnerships
ADD CONSTRAINT unique_partnership_players 
UNIQUE (play_date_id, player1_id, player2_id);

-- Ensure matches are unique per round and court
ALTER TABLE matches
ADD CONSTRAINT unique_match_round_court
UNIQUE (play_date_id, round_number, court_id);
```

### 7.2 Input Validation

- Sanitize all user inputs at the application level
- Use parameterized queries (Supabase client handles this)
- Validate email formats before authentication
- Limit player names to alphanumeric + spaces
- Validate scores are within valid ranges (0-21)

### 7.3 Rate Limiting

Configure Supabase rate limits:
- Authentication attempts: 5 per hour per IP
- API calls: 1000 per hour per user
- Real-time connections: 100 concurrent per project

### 7.4 Monitoring

- Enable Supabase audit logs
- Monitor failed authentication attempts
- Track unusual score entry patterns
- Alert on mass data modifications

## 8. Testing RLS Policies

```sql
-- Test as anonymous user
SET LOCAL role TO anon;
SELECT * FROM players; -- Should work
UPDATE players SET name = 'Test' WHERE id = '...'; -- Should fail

-- Test as authenticated user without claims
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "test-uid"}';
SELECT * FROM matches; -- Should work
UPDATE matches SET team1_score = 10 WHERE id = '...'; -- Should fail

-- Test as player with claims
SET LOCAL request.jwt.claims TO '{"sub": "player-uid"}';
-- Run various queries to test permissions
```

## 9. Deployment Checklist

- [ ] Create all helper functions
- [ ] Enable RLS on all tables
- [ ] Create all policies in correct order
- [ ] Add database constraints
- [ ] Create audit trigger functions
- [ ] Test with different user roles
- [ ] Configure Supabase project settings
- [ ] Add CSP meta tags to frontend
- [ ] Document API endpoints for frontend team
- [ ] Set up monitoring and alerts

---

This security implementation ensures that:
1. Each user role has appropriate access levels
2. Data integrity is maintained through constraints
3. All changes are audited for accountability
4. The system is protected against common attacks
5. Performance is optimized through helper functions