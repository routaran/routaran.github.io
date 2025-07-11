-- Enable the Realtime extension
-- This is required for realtime subscriptions to work

-- Enable the extension
CREATE EXTENSION IF NOT EXISTS "realtime";

-- Verify it's enabled
SELECT 
  'Realtime extension status:' as check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'realtime') 
    THEN '✓ Realtime extension is now enabled'
    ELSE '✗ Realtime extension still NOT enabled'
  END as status;

-- After enabling the extension, you may need to re-run the table publication script
-- The tables need to be added to the publication AFTER the extension is enabled