-- Migration: Rename supabase_uid to auth_user_id
-- Description: Renames the column in player_claims table to match the code
-- This fixes the 400 errors where queries are looking for auth_user_id

BEGIN;

-- Rename the column
ALTER TABLE player_claims 
RENAME COLUMN supabase_uid TO auth_user_id;

-- Update the constraint names to match
ALTER TABLE player_claims 
DROP CONSTRAINT player_claims_unique_supabase_uid;

ALTER TABLE player_claims 
ADD CONSTRAINT player_claims_unique_auth_user_id UNIQUE (auth_user_id);

-- Update the claim_player function to use the new column name
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

-- Update RLS policies to use the new column name
DROP POLICY IF EXISTS "player_claims_select_own" ON player_claims;
DROP POLICY IF EXISTS "player_claims_insert_own" ON player_claims;

-- Recreate policies with new column name
CREATE POLICY "player_claims_select_own" ON player_claims
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "player_claims_insert_own" ON player_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM player_claims WHERE auth_user_id = auth.uid()
    )
  );

COMMIT;