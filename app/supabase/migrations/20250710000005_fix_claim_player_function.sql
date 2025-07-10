-- Migration: Fix claim_player function to use correct column name
-- Description: Updates the claim_player function to use auth_user_id instead of supabase_uid
-- This fixes the authentication error when claiming players

BEGIN;

-- Drop the incorrect version from earlier migration
DROP FUNCTION IF EXISTS claim_player(UUID, UUID);

-- Create the correct version that matches what the frontend expects
CREATE OR REPLACE FUNCTION claim_player(player_id uuid)
RETURNS void AS $$
BEGIN
  -- Validate input
  IF player_id IS NULL THEN
    RAISE EXCEPTION 'Player ID cannot be null';
  END IF;

  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to claim a player';
  END IF;

  -- Check if user already has a claim (using new column name)
  IF EXISTS (SELECT 1 FROM player_claims WHERE auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User has already claimed a player';
  END IF;
  
  -- Check if player exists
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = player_id) THEN
    RAISE EXCEPTION 'Player with ID % does not exist', player_id;
  END IF;
  
  -- Check if player is already claimed
  IF EXISTS (SELECT 1 FROM player_claims WHERE player_id = claim_player.player_id) THEN
    RAISE EXCEPTION 'Player has already been claimed';
  END IF;
  
  -- Create the claim (using new column name)
  INSERT INTO player_claims (player_id, auth_user_id, claimed_at)
  VALUES (player_id, auth.uid(), NOW());
  
  -- Log to audit table
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    user_id,
    changes
  ) VALUES (
    'player_claims',
    player_id,
    'claim',
    auth.uid()::text,
    jsonb_build_object(
      'player_id', player_id,
      'auth_user_id', auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_player(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION claim_player(UUID) IS 'Safely claim a player for the authenticated user with validation and audit logging';

COMMIT;