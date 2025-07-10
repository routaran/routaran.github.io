# Database Fix Action Plan

## Immediate Actions (Quick Fixes)

### Step 1: Update Frontend Types (Priority: CRITICAL)

The frontend types in `src/types/database.ts` need to be updated to match the actual database schema. This is the fastest way to get the application working.

### Step 2: Fix Win Condition Format (Priority: HIGH)

Update all frontend code that uses win conditions to use underscores instead of hyphens:
- Change `"first-to-target"` to `"first_to_target"`
- Change `"win-by-2"` to `"win_by_2"`

### Step 3: Update Component Queries (Priority: HIGH)

Update all queries and components that reference the old column names:
- `created_by` → `organizer_id`
- `court_count` → `num_courts`
- `project_owner` → `is_project_owner`
- `updated_by` → `recorded_by`
- `games_won` → `wins`
- `games_lost` → `losses`

## Long-term Actions (Database Migrations)

### Option A: Update Database to Match Frontend (Recommended)

Run the migration script provided in the report to align the database with frontend expectations. This maintains consistency with the original design.

### Option B: Fully Update Frontend to Match Database

Complete overhaul of frontend to match the current database design. This is more work but avoids database migrations.

## Testing Checklist

After implementing fixes, test these critical paths:

1. **Authentication Flow**
   - [ ] Magic link email sending
   - [ ] Auth callback handling
   - [ ] Session persistence

2. **Player Claims**
   - [ ] List unclaimed players
   - [ ] Claim a player
   - [ ] Prevent duplicate claims

3. **Play Date Management**
   - [ ] Create new play date
   - [ ] List play dates
   - [ ] View play date details

4. **Score Entry**
   - [ ] Enter match scores
   - [ ] Update existing scores
   - [ ] Handle optimistic locking

5. **Rankings**
   - [ ] View player rankings
   - [ ] Calculate win percentages
   - [ ] Show point differentials

6. **Real-time Updates**
   - [ ] Score updates broadcast
   - [ ] Rankings refresh
   - [ ] Presence indicators

## Implementation Order

1. **Phase 1: Get Application Working (Today)**
   - Fix frontend types to match database
   - Update win condition format
   - Test authentication and player claims

2. **Phase 2: Fix Critical Features (Tomorrow)**
   - Update all component queries
   - Fix score entry functionality
   - Test rankings calculations

3. **Phase 3: Database Alignment (Next Week)**
   - Review and finalize migration script
   - Test migrations on development database
   - Deploy to production with backup

## Risk Mitigation

1. **Database Backup**: Before any migrations, create full database backup
2. **Staged Rollout**: Test on development environment first
3. **Feature Flags**: Consider feature flags for gradual rollout
4. **Monitoring**: Set up error tracking for migration issues

## Success Criteria

- [ ] Users can authenticate and claim players
- [ ] Play dates can be created and managed
- [ ] Scores can be entered and updated
- [ ] Rankings display correctly
- [ ] Real-time updates work
- [ ] No console errors in browser
- [ ] All tests pass