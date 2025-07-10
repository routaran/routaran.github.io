-- Migration: Create claim_player RPC function
-- Description: Creates the RPC function for claiming players
-- This function safely handles player claims with proper validation and audit logging

BEGIN;

-- Create the claim_player RPC function
CREATE OR REPLACE FUNCTION claim_player(
  p_player_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_existing_claim UUID;
  v_player_exists BOOLEAN;
BEGIN
  -- Check if player exists
  SELECT EXISTS(
    SELECT 1 FROM players WHERE id = p_player_id
  ) INTO v_player_exists;
  
  IF NOT v_player_exists THEN
    RAISE EXCEPTION 'Player not found' USING ERRCODE = 'P0001';
  END IF;
  
  -- Check if player is already claimed
  SELECT auth_user_id INTO v_existing_claim
  FROM player_claims
  WHERE player_id = p_player_id;
  
  IF v_existing_claim IS NOT NULL THEN
    RAISE EXCEPTION 'This player has already been claimed' USING ERRCODE = 'P0001';
  END IF;
  
  -- Check if user already has a claim
  SELECT player_id INTO v_existing_claim
  FROM player_claims
  WHERE auth_user_id = p_user_id;
  
  IF v_existing_claim IS NOT NULL THEN
    RAISE EXCEPTION 'You have already claimed a player' USING ERRCODE = 'P0001';
  END IF;
  
  -- Insert the claim
  INSERT INTO player_claims (player_id, auth_user_id)
  VALUES (p_player_id, p_user_id);
  
  -- Log the claim in audit_log
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    user_id,
    changes
  ) VALUES (
    'player_claims',
    p_player_id,
    'claim',
    p_user_id,
    jsonb_build_object(
      'player_id', p_player_id,
      'auth_user_id', p_user_id
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_player(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION claim_player(UUID, UUID) IS 'Safely claim a player for an authenticated user with validation and audit logging';

COMMIT;