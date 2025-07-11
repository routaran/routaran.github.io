-- Migration: Update index to use auth_user_id
-- Description: Renames the index on player_claims to reflect the new column name
-- This ensures optimal query performance with the renamed column

BEGIN;

-- Drop the old index if it exists
DROP INDEX IF EXISTS idx_player_claims_supabase_uid;

-- Create the new index with the correct column name
-- This index is crucial for authentication performance
CREATE UNIQUE INDEX idx_player_claims_auth_user_id ON player_claims(auth_user_id);

-- Verify the index was created correctly
DO $$
DECLARE
  index_exists boolean;
BEGIN
  -- Check if the new index exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'player_claims' 
    AND indexname = 'idx_player_claims_auth_user_id'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    RAISE EXCEPTION 'Failed to create index idx_player_claims_auth_user_id';
  END IF;
  
  -- Check if the old index still exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'player_claims' 
    AND indexname = 'idx_player_claims_supabase_uid'
  ) INTO index_exists;
  
  IF index_exists THEN
    RAISE EXCEPTION 'Old index idx_player_claims_supabase_uid still exists';
  END IF;
  
  RAISE NOTICE 'Index successfully updated to use auth_user_id';
END
$$;

COMMIT;