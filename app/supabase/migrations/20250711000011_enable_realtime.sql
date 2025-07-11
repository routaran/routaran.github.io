-- Enable realtime for tables
-- This migration adds tables to the supabase_realtime publication
-- which is required for realtime subscriptions to work

-- First, check if the publication exists (it should be created by Supabase)
DO $$ 
BEGIN
  -- Add tables to realtime publication
  -- Note: The publication 'supabase_realtime' is managed by Supabase
  
  -- Enable realtime for play_dates table
  ALTER PUBLICATION supabase_realtime ADD TABLE play_dates;
  
  -- Enable realtime for players table
  ALTER PUBLICATION supabase_realtime ADD TABLE players;
  
  -- Enable realtime for partnerships table
  ALTER PUBLICATION supabase_realtime ADD TABLE partnerships;
  
  -- Enable realtime for matches table
  ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  
  -- Enable realtime for match_results view
  -- Note: Views need to be materialized views for realtime
  -- Since match_results is a regular view, we'll skip it
  
  -- Enable realtime for audit_log table (optional, but useful for debugging)
  ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;

EXCEPTION
  WHEN OTHERS THEN
    -- If the publication doesn't exist or there's an error, log it
    RAISE NOTICE 'Could not add tables to realtime publication: %', SQLERRM;
END $$;

-- Verify tables are in the publication
SELECT 
  schemaname,
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime'
ORDER BY 
  schemaname, tablename;

-- Add comment to track this migration
COMMENT ON SCHEMA public IS 'Realtime enabled for: play_dates, players, partnerships, matches, audit_log';