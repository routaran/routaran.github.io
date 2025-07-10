# Quick Fix: Update Frontend Types

## Critical Type Updates Needed

These are the minimal changes needed to get the application working with the current database
schema:

### 1. Update src/types/database.ts

```typescript
// Change win condition to use underscores
export type WinCondition = "first_to_target" | "win_by_2";

// Update play_dates table
play_dates: {
  Row: {
    id: string;
    date: string;
    organizer_id: string; // was: created_by
    num_courts: number; // was: court_count
    win_condition: "first_to_target" | "win_by_2"; // underscores!
    target_score: number;
    status: "scheduled" | "active" | "completed" | "cancelled";
    schedule_locked: boolean;
    created_at: string;
    updated_at: string;
    version: number;
    // REMOVE: name field doesn't exist in database
  }
}

// Update players table (remove play_date_id)
players: {
  Row: {
    id: string;
    name: string;
    email: string;
    is_project_owner: boolean; // was: project_owner
    created_at: string;
    updated_at: string;
    // REMOVE: play_date_id
  }
}

// Update player_claims table
player_claims: {
  Row: {
    player_id: string; // This is the primary key
    auth_user_id: string;
    claimed_at: string; // was: created_at
    // REMOVE: id field
  }
}

// Update matches table
matches: {
  Row: {
    id: string;
    play_date_id: string;
    court_id: string; // was: court_number
    round_number: number;
    partnership1_id: string;
    partnership2_id: string;
    team1_score: number | null;
    team2_score: number | null;
    winning_partnership_id: string | null;
    status: "waiting" | "in_progress" | "completed" | "disputed";
    recorded_by: string | null; // was: updated_by
    recorded_at: string | null;
    created_at: string;
    updated_at: string;
    version: number;
    // REMOVE: scheduled_at
  }
}

// Update courts table
courts: {
  Row: {
    id: string;
    play_date_id: string;
    court_number: number; // was: number
    court_name: string; // was: name
    created_at: string;
  }
}

// Update match_results view
match_results: {
  Row: {
    player_id: string;
    player_name: string;
    play_date_id: string;
    play_date: string;
    play_date_status: string;
    games_played: number;
    wins: number; // was: games_won
    losses: number; // was: games_lost
    points_for: number;
    points_against: number;
    win_percentage: number;
    point_differential: number;
  }
}
```

### 2. Update Component Imports

Search and replace these patterns in all .ts and .tsx files:

```bash
# Win conditions
"first-to-target" → "first_to_target"
"win-by-2" → "win_by_2"

# Column names
created_by → organizer_id
court_count → num_courts
project_owner → is_project_owner
updated_by → recorded_by
games_won → wins
games_lost → losses
```

### 3. Update Queries

Example query updates needed:

```typescript
// Before
const { data } = await supabase.from("play_dates").select("*, created_by").eq("created_by", userId);

// After
const { data } = await supabase
  .from("play_dates")
  .select("*, organizer_id")
  .eq("organizer_id", userId);
```

### 4. Update Form Validations

```typescript
// Before
win_condition: z.enum(["first-to-target", "win-by-2"]);

// After
win_condition: z.enum(["first_to_target", "win_by_2"]);
```

## Files That Need Updates

Based on the codebase analysis, these files likely need updates:

1. `src/types/database.ts` - Type definitions
2. `src/lib/supabase/playDates.ts` - Play date queries
3. `src/lib/supabase/players.ts` - Player queries
4. `src/lib/supabase/rankings.ts` - Rankings queries
5. `src/components/playdate/PlayDateForm.tsx` - Form fields
6. `src/pages/PlayDateCreatePage.tsx` - Create page
7. `src/components/rankings/RankingsTable.tsx` - Column names
8. `src/lib/validation/*` - Validation schemas

## Testing After Updates

1. Run TypeScript compiler to check for type errors:

   ```bash
   npm run type-check
   ```

2. Run tests to ensure nothing breaks:

   ```bash
   npm test
   ```

3. Test key user flows:
   - Create a play date
   - Claim a player
   - Enter scores
   - View rankings

## Notes

- The `claim_player` RPC function should now work correctly with just the `player_id` parameter
- Players are global, not per-play-date - update UI accordingly
- The database uses optimistic locking with version fields - ensure updates increment version
