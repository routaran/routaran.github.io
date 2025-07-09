# Round-Robin Tournament Algorithm Specification

*Version: 1.0*  
*Date: 2025-07-09*  
*Author: Development Team*

## Overview

This document specifies the algorithm for generating round-robin tournaments in the Pickleball Tracker application. The algorithm handles partnership-based doubles tournaments with 4-16 players, ensuring fair play distribution across multiple courts.

## Core Requirements

### Tournament Parameters
- **Players**: 4-16 participants
- **Format**: Doubles (2 players per team)
- **Courts**: 1-4 available courts
- **Scheduling**: Round-robin (each partnership plays all others exactly once)
- **Fairness**: Equal play distribution when possible

### Key Constraints
- Each player must be paired with every other player exactly once
- All partnerships must play against all other partnerships exactly once
- Maximum wait time between matches should be minimized
- For odd player counts, bye rounds must be distributed fairly

## Algorithm Components

### 1. Partnership Generation

**Input**: Array of n players  
**Output**: Array of C(n,2) partnerships

```typescript
// Mathematical foundation: C(n,2) = n! / (2! * (n-2)!)
// For n=8: C(8,2) = 28 partnerships
// For n=12: C(12,2) = 66 partnerships  
// For n=16: C(16,2) = 120 partnerships
```

**Algorithm Steps**:
1. Generate all possible 2-player combinations
2. Assign unique IDs to each partnership
3. Store partnerships in database for consistent reference
4. Index partnerships by player for efficient lookup

**Example (8 players: A,B,C,D,E,F,G,H)**:
```
Partnerships: AB, AC, AD, AE, AF, AG, AH, BC, BD, BE, BF, BG, BH, 
              CD, CE, CF, CG, CH, DE, DF, DG, DH, EF, EG, EH, 
              FG, FH, GH
Total: 28 partnerships
```

### 2. Match Scheduling

**Input**: Array of partnerships, number of courts  
**Output**: Ordered array of rounds with court assignments

**Core Principle**: Each partnership plays every other partnership exactly once

**Algorithm Steps**:
1. Create match matrix: partnership × partnership
2. Remove diagonal (partnership cannot play itself)
3. Use symmetry to eliminate duplicates (AB vs CD = CD vs AB)
4. Group matches into rounds ensuring no player appears twice per round
5. Assign matches to courts within each round

**Scheduling Constraints**:
- No player can play in multiple matches simultaneously
- Minimize idle time between matches for each player
- Distribute matches evenly across available courts

### 3. Court Assignment Logic

**Input**: Array of matches for a round, number of courts  
**Output**: Court assignments for each match

**Priority Rules**:
1. **Player Rest**: Prioritize players who have been idle longest
2. **Court Utilization**: Distribute matches evenly across courts
3. **Consecutive Play**: Avoid back-to-back matches for same players when possible

**Algorithm**:
```typescript
function assignCourts(matches: Match[], courtCount: number): CourtAssignment[] {
  const assignments: CourtAssignment[] = [];
  const playerLastPlayed = new Map<string, number>();
  
  // Sort matches by player rest time (longest idle first)
  matches.sort((a, b) => {
    const aRestTime = getMinRestTime(a.players, playerLastPlayed);
    const bRestTime = getMinRestTime(b.players, playerLastPlayed);
    return bRestTime - aRestTime;
  });
  
  // Assign to courts in order
  for (let i = 0; i < matches.length; i++) {
    const courtNumber = (i % courtCount) + 1;
    assignments.push({
      match: matches[i],
      court: courtNumber,
      roundNumber: getCurrentRound()
    });
    
    // Update player last played time
    updatePlayerTimes(matches[i].players, playerLastPlayed);
  }
  
  return assignments;
}
```

### 4. Bye Round Handling (Odd Player Counts)

**Problem**: With odd player counts, some partnerships will have fewer total matches

**Solution**: Rotate bye assignments to ensure fairness

**Algorithm**:
1. Calculate total matches per partnership in ideal scenario
2. Identify partnerships that will have fewer matches
3. Rotate bye assignments across rounds
4. Ensure all partnerships play same number of matches ±1

**Example (15 players = 105 partnerships)**:
- Some partnerships will play 13 matches
- Others will play 14 matches  
- Bye rotation ensures fair distribution

## Worked Examples

### Example 1: 8 Players (Simple Case)

**Players**: A, B, C, D, E, F, G, H  
**Partnerships**: 28 total  
**Matches**: 28 × 27 ÷ 2 = 378 total matches  
**Courts**: 2 courts available

**Round Structure**:
- **Round 1**: Court 1: AB vs CD, Court 2: EF vs GH
- **Round 2**: Court 1: AC vs BD, Court 2: EG vs FH  
- **Round 3**: Court 1: AD vs BC, Court 2: EH vs FG
- *...continues for all 189 rounds*

**Key Metrics**:
- Total rounds: 189
- Matches per partnership: 27
- Average wait time: 3.5 rounds between matches

### Example 2: 12 Players (Medium Complexity)

**Players**: A, B, C, D, E, F, G, H, I, J, K, L  
**Partnerships**: 66 total  
**Matches**: 66 × 65 ÷ 2 = 2,145 total matches  
**Courts**: 4 courts available

**Scheduling Challenges**:
- Higher complexity in avoiding player conflicts
- More opportunities for parallel matches
- Greater court utilization efficiency

**Key Metrics**:
- Total rounds: 537 (2,145 matches ÷ 4 courts)
- Matches per partnership: 65
- Average wait time: 8.2 rounds between matches

### Example 3: 15 Players (Odd Count with Byes)

**Players**: A, B, C, D, E, F, G, H, I, J, K, L, M, N, O  
**Partnerships**: 105 total  
**Matches**: Complex due to bye rotation  
**Courts**: 4 courts available

**Bye Handling**:
- Some partnerships play 13 matches
- Others play 14 matches
- Bye rounds distributed to balance total play time

**Key Metrics**:
- Total rounds: Variable (depends on bye distribution)
- Matches per partnership: 13-14
- Bye frequency: Every 7-8 rounds per partnership

## Edge Cases and Error Handling

### 1. Insufficient Courts
**Problem**: More simultaneous matches than available courts  
**Solution**: Queue matches and optimize court rotation

### 2. Player Dropout Mid-Tournament
**Problem**: Existing partnerships become invalid  
**Solution**: Regeneration blocked once scoring begins (per FR-12)

### 3. Uneven Player Distribution
**Problem**: Some players get more rest time than others  
**Solution**: Track individual player statistics and balance in court assignments

### 4. Maximum Match Limits
**Problem**: Very large tournaments may exceed reasonable match counts  
**Solution**: Validate player count limits (4-16) at tournament creation

## Performance Considerations

### Time Complexity
- Partnership generation: O(n²)
- Match scheduling: O(n⁴) 
- Court assignment: O(m log m) where m = matches per round

### Space Complexity
- Partnership storage: O(n²)
- Match matrix: O(n⁴)
- Court assignments: O(total matches)

### Optimization Strategies
1. **Pre-computation**: Generate partnerships once and store
2. **Indexing**: Create lookup tables for player-to-partnership mapping
3. **Caching**: Cache court assignments for repeated tournaments
4. **Lazy Loading**: Generate matches on-demand for large tournaments

## Database Integration

### Partnership Storage
```sql
CREATE TABLE partnerships (
  id UUID PRIMARY KEY,
  play_date_id UUID REFERENCES play_dates(id),
  player1_id UUID REFERENCES players(id),
  player2_id UUID REFERENCES players(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Match Scheduling
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  play_date_id UUID REFERENCES play_dates(id),
  partnership1_id UUID REFERENCES partnerships(id),
  partnership2_id UUID REFERENCES partnerships(id),
  court_number INTEGER,
  round_number INTEGER,
  scheduled_at TIMESTAMP,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Notes

### Frontend Considerations
- Show scheduling progress for large tournaments
- Provide tournament preview before finalization
- Enable schedule regeneration only before first score entry

### Backend Considerations
- Implement as database RPC functions for consistency
- Use transactions for atomic schedule generation
- Add logging for debugging complex tournaments

### Testing Requirements
- Unit tests for each algorithm component
- Integration tests with real player data
- Performance tests for maximum tournament size (16 players)
- Edge case validation for all odd player counts

## 5. Score Entry and Validation Algorithm

### Win Condition Validation

**Input**: Score pair (team1_score, team2_score), win condition settings  
**Output**: Boolean (valid/invalid) + error message if invalid

**Win Condition Types**:
1. **First-to-Target**: First team to reach target score wins
2. **Win-by-2**: Must win by at least 2 points, minimum target score

**Validation Algorithm**:
```typescript
interface WinCondition {
  type: 'first-to-target' | 'win-by-2';
  targetScore: number; // 5-21 points
}

function validateScore(
  team1Score: number, 
  team2Score: number, 
  winCondition: WinCondition
): ValidationResult {
  // Basic range validation
  if (team1Score < 0 || team2Score < 0) {
    return { valid: false, error: 'Scores cannot be negative' };
  }
  
  if (team1Score > 50 || team2Score > 50) {
    return { valid: false, error: 'Scores cannot exceed 50' };
  }
  
  // No winner validation
  if (team1Score === team2Score) {
    return { valid: false, error: 'Match must have a winner' };
  }
  
  const winningScore = Math.max(team1Score, team2Score);
  const losingScore = Math.min(team1Score, team2Score);
  
  switch (winCondition.type) {
    case 'first-to-target':
      return validateFirstToTarget(winningScore, losingScore, winCondition.targetScore);
    
    case 'win-by-2':
      return validateWinBy2(winningScore, losingScore, winCondition.targetScore);
  }
}

function validateFirstToTarget(
  winningScore: number, 
  losingScore: number, 
  targetScore: number
): ValidationResult {
  if (winningScore < targetScore) {
    return { 
      valid: false, 
      error: `Winning score must be at least ${targetScore}` 
    };
  }
  
  return { valid: true };
}

function validateWinBy2(
  winningScore: number, 
  losingScore: number, 
  targetScore: number
): ValidationResult {
  if (winningScore < targetScore) {
    return { 
      valid: false, 
      error: `Winning score must be at least ${targetScore}` 
    };
  }
  
  const margin = winningScore - losingScore;
  if (margin < 2) {
    return { 
      valid: false, 
      error: 'Must win by at least 2 points' 
    };
  }
  
  return { valid: true };
}
```

### Input Sanitization

**Algorithm**:
```typescript
function sanitizeScoreInput(input: string): number | null {
  // Remove whitespace
  const trimmed = input.trim();
  
  // Check for empty input
  if (!trimmed) return null;
  
  // Parse as integer
  const parsed = parseInt(trimmed, 10);
  
  // Validate parsed result
  if (isNaN(parsed)) return null;
  
  // Range check
  if (parsed < 0 || parsed > 50) return null;
  
  return parsed;
}
```

### Optimistic Locking Algorithm

**Purpose**: Prevent conflicting score updates from multiple users

**Implementation**:
```typescript
interface MatchUpdate {
  matchId: string;
  team1Score: number;
  team2Score: number;
  currentVersion: number;
  updatedBy: string;
}

async function updateMatchScore(update: MatchUpdate): Promise<UpdateResult> {
  const transaction = await db.transaction();
  
  try {
    // 1. Lock and read current match state
    const currentMatch = await transaction
      .select('*')
      .from('matches')
      .where('id', update.matchId)
      .forUpdate()
      .first();
    
    // 2. Version conflict check
    if (currentMatch.version !== update.currentVersion) {
      throw new OptimisticLockError(
        `Match was updated by another user. Current version: ${currentMatch.version}, Your version: ${update.currentVersion}`
      );
    }
    
    // 3. Validate scores
    const validation = validateScore(
      update.team1Score, 
      update.team2Score, 
      currentMatch.winCondition
    );
    
    if (!validation.valid) {
      throw new ValidationError(validation.error);
    }
    
    // 4. Update match with version increment
    const updatedMatch = await transaction
      .update('matches')
      .set({
        team1_score: update.team1Score,
        team2_score: update.team2Score,
        version: currentMatch.version + 1,
        updated_at: new Date(),
        updated_by: update.updatedBy
      })
      .where('id', update.matchId)
      .returning('*');
    
    // 5. Log the change for audit
    await logScoreChange(transaction, currentMatch, updatedMatch[0], update.updatedBy);
    
    await transaction.commit();
    
    return { success: true, match: updatedMatch[0] };
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

## 6. Audit Logging Algorithm

### Audit Trail Structure

**Purpose**: Track all score changes for dispute resolution

**Database Schema**:
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id),
  change_type VARCHAR(50) NOT NULL, -- 'score_update', 'score_correction'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  reason TEXT -- Optional reason for manual corrections
);
```

### Logging Algorithm

```typescript
interface ScoreChange {
  matchId: string;
  oldScore: { team1: number; team2: number };
  newScore: { team1: number; team2: number };
  changedBy: string;
  changeType: 'score_update' | 'score_correction';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

async function logScoreChange(
  transaction: Transaction,
  oldMatch: Match,
  newMatch: Match,
  changedBy: string,
  changeType: 'score_update' | 'score_correction' = 'score_update',
  reason?: string
): Promise<void> {
  const auditEntry = {
    match_id: oldMatch.id,
    change_type: changeType,
    old_values: {
      team1_score: oldMatch.team1_score,
      team2_score: oldMatch.team2_score,
      version: oldMatch.version
    },
    new_values: {
      team1_score: newMatch.team1_score,
      team2_score: newMatch.team2_score,
      version: newMatch.version
    },
    changed_by: changedBy,
    reason: reason,
    ip_address: getCurrentIpAddress(),
    user_agent: getCurrentUserAgent()
  };
  
  await transaction
    .insert(auditEntry)
    .into('audit_log');
}
```

### Audit Query Functions

```typescript
// Get full change history for a match
async function getMatchAuditHistory(matchId: string): Promise<AuditEntry[]> {
  return db
    .select('*')
    .from('audit_log')
    .where('match_id', matchId)
    .orderBy('changed_at', 'desc');
}

// Get recent changes by user
async function getUserRecentChanges(userId: string, limit: number = 10): Promise<AuditEntry[]> {
  return db
    .select('*')
    .from('audit_log')
    .where('changed_by', userId)
    .orderBy('changed_at', 'desc')
    .limit(limit);
}

// Detect suspicious activity (multiple rapid changes)
async function detectSuspiciousActivity(timeWindow: number = 300): Promise<SuspiciousActivity[]> {
  return db
    .select('changed_by')
    .count('* as change_count')
    .from('audit_log')
    .where('changed_at', '>', new Date(Date.now() - timeWindow * 1000))
    .groupBy('changed_by')
    .having('change_count', '>', 10);
}
```

## 7. Ranking Calculation Algorithm

### Individual Player Rankings

**Metrics Calculated**:
1. **Games Won Percentage**: (Games Won / Total Games) × 100
2. **Points Differential**: Total Points Scored - Total Points Conceded
3. **Head-to-Head Record**: Win/loss record against each opponent

**Algorithm**:
```typescript
interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  winPercentage: number;
  pointsDifferential: number;
  headToHeadRecord: Map<string, HeadToHeadStats>;
}

interface HeadToHeadStats {
  opponentId: string;
  gamesPlayed: number;
  gamesWon: number;
  pointsFor: number;
  pointsAgainst: number;
}

async function calculatePlayerRankings(playDateId: string): Promise<PlayerStats[]> {
  // Use materialized view for performance
  const playerStats = await db
    .select('*')
    .from('match_results')
    .where('play_date_id', playDateId);
  
  const rankings: PlayerStats[] = [];
  
  for (const stats of playerStats) {
    const winPercentage = stats.games_played > 0 
      ? (stats.games_won / stats.games_played) * 100 
      : 0;
    
    const pointsDifferential = stats.points_for - stats.points_against;
    
    rankings.push({
      playerId: stats.player_id,
      gamesPlayed: stats.games_played,
      gamesWon: stats.games_won,
      gamesLost: stats.games_lost,
      pointsFor: stats.points_for,
      pointsAgainst: stats.points_against,
      winPercentage,
      pointsDifferential,
      headToHeadRecord: await getHeadToHeadRecord(stats.player_id, playDateId)
    });
  }
  
  return sortPlayerRankings(rankings);
}
```

### Partnership Rankings

**Algorithm**:
```typescript
interface PartnershipStats {
  partnershipId: string;
  player1Id: string;
  player2Id: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  winPercentage: number;
  pointsDifferential: number;
}

async function calculatePartnershipRankings(playDateId: string): Promise<PartnershipStats[]> {
  const partnershipStats = await db
    .select([
      'p.id as partnership_id',
      'p.player1_id',
      'p.player2_id',
      'COUNT(m.id) as games_played',
      'SUM(CASE WHEN m.team1_score > m.team2_score THEN 1 ELSE 0 END) as games_won',
      'SUM(CASE WHEN m.team1_score < m.team2_score THEN 1 ELSE 0 END) as games_lost',
      'SUM(m.team1_score) as points_for',
      'SUM(m.team2_score) as points_against'
    ])
    .from('partnerships as p')
    .leftJoin('matches as m', 'p.id', 'm.partnership1_id')
    .where('p.play_date_id', playDateId)
    .groupBy('p.id', 'p.player1_id', 'p.player2_id');
  
  return partnershipStats.map(stats => ({
    partnershipId: stats.partnership_id,
    player1Id: stats.player1_id,
    player2Id: stats.player2_id,
    gamesPlayed: stats.games_played,
    gamesWon: stats.games_won,
    gamesLost: stats.games_lost,
    pointsFor: stats.points_for,
    pointsAgainst: stats.points_against,
    winPercentage: stats.games_played > 0 ? (stats.games_won / stats.games_played) * 100 : 0,
    pointsDifferential: stats.points_for - stats.points_against
  }));
}
```

### Ranking Sort Algorithm

**Tiebreaker Rules** (in priority order):
1. Win percentage (higher is better)
2. Points differential (higher is better)
3. Head-to-head record (if applicable)
4. Total points scored (higher is better)
5. Alphabetical by player name (last resort)

**Algorithm**:
```typescript
function sortPlayerRankings(rankings: PlayerStats[]): PlayerStats[] {
  return rankings.sort((a, b) => {
    // 1. Win percentage (descending)
    if (a.winPercentage !== b.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }
    
    // 2. Points differential (descending)
    if (a.pointsDifferential !== b.pointsDifferential) {
      return b.pointsDifferential - a.pointsDifferential;
    }
    
    // 3. Head-to-head record (if both players played each other)
    const headToHead = getHeadToHeadTiebreaker(a.playerId, b.playerId, a.headToHeadRecord);
    if (headToHead !== 0) {
      return headToHead;
    }
    
    // 4. Total points scored (descending)
    if (a.pointsFor !== b.pointsFor) {
      return b.pointsFor - a.pointsFor;
    }
    
    // 5. Alphabetical by player name (ascending)
    return a.playerId.localeCompare(b.playerId);
  });
}

function getHeadToHeadTiebreaker(
  player1Id: string, 
  player2Id: string, 
  headToHeadRecord: Map<string, HeadToHeadStats>
): number {
  const record = headToHeadRecord.get(player2Id);
  if (!record || record.gamesPlayed === 0) {
    return 0; // No head-to-head games
  }
  
  const player1Wins = record.gamesWon;
  const player2Wins = record.gamesPlayed - record.gamesWon;
  
  if (player1Wins > player2Wins) return -1; // Player 1 wins tiebreaker
  if (player2Wins > player1Wins) return 1;  // Player 2 wins tiebreaker
  
  return 0; // Head-to-head is tied
}
```

### Materialized View for Performance

**Database View**:
```sql
CREATE MATERIALIZED VIEW match_results AS
SELECT 
  pd.id as play_date_id,
  p.id as player_id,
  p.name as player_name,
  COUNT(DISTINCT m.id) as games_played,
  SUM(
    CASE 
      WHEN (part1.player1_id = p.id OR part1.player2_id = p.id) AND m.team1_score > m.team2_score THEN 1
      WHEN (part2.player1_id = p.id OR part2.player2_id = p.id) AND m.team2_score > m.team1_score THEN 1
      ELSE 0 
    END
  ) as games_won,
  COUNT(DISTINCT m.id) - SUM(
    CASE 
      WHEN (part1.player1_id = p.id OR part1.player2_id = p.id) AND m.team1_score > m.team2_score THEN 1
      WHEN (part2.player1_id = p.id OR part2.player2_id = p.id) AND m.team2_score > m.team1_score THEN 1
      ELSE 0 
    END
  ) as games_lost,
  SUM(
    CASE 
      WHEN part1.player1_id = p.id OR part1.player2_id = p.id THEN m.team1_score
      WHEN part2.player1_id = p.id OR part2.player2_id = p.id THEN m.team2_score
      ELSE 0 
    END
  ) as points_for,
  SUM(
    CASE 
      WHEN part1.player1_id = p.id OR part1.player2_id = p.id THEN m.team2_score
      WHEN part2.player1_id = p.id OR part2.player2_id = p.id THEN m.team1_score
      ELSE 0 
    END
  ) as points_against
FROM play_dates pd
JOIN players p ON p.play_date_id = pd.id
LEFT JOIN partnerships part1 ON part1.play_date_id = pd.id AND (part1.player1_id = p.id OR part1.player2_id = p.id)
LEFT JOIN partnerships part2 ON part2.play_date_id = pd.id AND (part2.player1_id = p.id OR part2.player2_id = p.id)
LEFT JOIN matches m ON (m.partnership1_id = part1.id OR m.partnership2_id = part1.id OR m.partnership1_id = part2.id OR m.partnership2_id = part2.id)
WHERE m.team1_score IS NOT NULL AND m.team2_score IS NOT NULL
GROUP BY pd.id, p.id, p.name;

-- Refresh trigger
CREATE OR REPLACE FUNCTION refresh_match_results()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY match_results;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_match_results
AFTER INSERT OR UPDATE OR DELETE ON matches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_match_results();
```

## Future Enhancements

### Potential Improvements
1. **Seeding**: Allow manual partnership seeding for balanced competition
2. **Rest Optimization**: Advanced algorithms for minimizing player wait times
3. **Court Preferences**: Allow players to specify preferred courts
4. **Time Estimates**: Predict tournament duration based on historical data
5. **Advanced Analytics**: Momentum tracking, performance trends, prediction models

### Scalability Considerations
- Support for larger tournaments (16+ players)
- Multiple tournament formats (single elimination, swiss system)
- Tournament bracketing for playoff rounds
- Real-time ranking updates with WebSocket optimization

---

*This specification serves as the authoritative reference for implementing all core algorithms in the Pickleball Tracker application. All implementation decisions should align with the principles and constraints outlined in this document.*