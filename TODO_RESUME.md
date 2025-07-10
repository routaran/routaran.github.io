# TODO: Resume Session - Authentication Issues

## Current Issue
User is authenticated (can see the player claim screen) but when trying to claim a player, getting error:
- **Error**: "User must be authenticated to claim a player" 
- **Code**: P0001
- **Endpoint**: POST /rest/v1/rpc/claim_player

## Root Cause Analysis
The `claim_player` RPC function uses `auth.uid()` internally, which appears to be returning NULL even though the user is logged in. This suggests:
1. The authentication token might not be passed correctly in RPC calls
2. The session might not be properly established in Supabase
3. There could be a timing issue where the auth state isn't ready

## Next Steps
1. **Check RPC Authentication**
   - Verify that the Supabase client is passing the auth token in RPC calls
   - Check if RPC calls need different auth handling than regular queries

2. **Debug Auth State**
   - Add logging to see if `auth.getUser()` returns a user before the claim
   - Check if the session is properly established after magic link redirect
   - Verify the auth token is valid and not expired

3. **Test Alternative Approaches**
   - Try using a regular INSERT instead of RPC function
   - Consider implementing claim logic client-side with proper auth checks
   - Test if other authenticated operations work (like creating a play date)

4. **Review Auth Flow**
   - Magic link redirect → Auth callback → Session establishment → Player claim
   - Ensure each step completes before the next

## Quick Test
When resuming, first check if the user can perform other authenticated actions to isolate if this is RPC-specific or a general auth issue.