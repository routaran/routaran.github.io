-- Migration: Fix ambiguous column reference in claim_player function
-- Description: Fixes the "column reference player_id is ambiguous" error
-- by properly qualifying column references in the function

BEGIN;

-- Drop and recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION claim_player(player_id uuid)
RETURNS void AS $$
DECLARE
  v_player_id uuid := player_id;  -- Store parameter in local variable to avoid ambiguity
BEGIN
  -- Validate input
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Player ID cannot be null';
  END IF;

  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to claim a player';
  END IF;

  -- Check if user already has a claim
  IF EXISTS (SELECT 1 FROM player_claims pc WHERE pc.auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User has already claimed a player';
  END IF;
  
  -- Check if player exists
  IF NOT EXISTS (SELECT 1 FROM players p WHERE p.id = v_player_id) THEN
    RAISE EXCEPTION 'Player with ID % does not exist', v_player_id;
  END IF;
  
  -- Check if player is already claimed
  IF EXISTS (SELECT 1 FROM player_claims pc WHERE pc.player_id = v_player_id) THEN
    RAISE EXCEPTION 'Player has already been claimed';
  END IF;
  
  -- Create the claim
  INSERT INTO player_claims (player_id, auth_user_id, claimed_at)
  VALUES (v_player_id, auth.uid(), NOW());
  
  -- Log to audit table
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    user_id,
    changes
  ) VALUES (
    'player_claims',
    v_player_id,
    'claim',
    auth.uid()::text,
    jsonb_build_object(
      'player_id', v_player_id,
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