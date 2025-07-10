# Migration Summary - Player Claims Fix

## Database Changes Applied

### 1. Column Rename (20250710000003)
- Renamed `supabase_uid` to `auth_user_id` in the `player_claims` table
- Updated all constraints to use the new column name
- Updated the `claim_player` RPC function to use the new column

### 2. RLS Policy Updates (20250710000001 & 20250710000004)
- Allow anonymous users to SELECT from player_claims (for filtering)
- Allow authenticated users to SELECT all player_claims
- Allow authenticated users to INSERT only their own claims
- Allow authenticated users to DELETE only their own claims
- No UPDATE operations allowed on claims

### 3. RPC Function Creation (20250710000002)
- Created `claim_player(player_id, user_id)` function
- Validates player exists
- Prevents duplicate claims
- Adds audit log entry

## Code Changes Deployed
- Fixed all references from `supabase_uid` to `auth_user_id` in:
  - useAuth hook
  - PlayerClaim component
  - Auth services
  - Score services
- Fixed queries selecting non-existent `id` column
- Added error handling for permission issues
- Added retry logic for failed requests

## Result
The authentication and player claim process should now work correctly without any 400 or 406 errors.