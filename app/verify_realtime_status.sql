-- Verify Realtime Status
-- Run this to confirm tables are properly configured for realtime

-- 1. Check which tables are in the realtime publication
SELECT 
  'Tables in realtime publication:' as check,
  array_agg(tablename ORDER BY tablename) as tables
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND schemaname = 'public';

-- 2. Check if our specific tables are in the publication
SELECT 
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND pg_publication_tables.tablename = pg_tables.tablename
    ) THEN '✓ In realtime publication'
    ELSE '✗ NOT in realtime publication'
  END as realtime_status,
  CASE 
    WHEN rowsecurity THEN '✓ RLS enabled'
    ELSE '✗ RLS disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('play_dates', 'players', 'partnerships', 'matches', 'audit_log')
ORDER BY tablename;

-- 3. Check if the Supabase Realtime extension is enabled
SELECT 
  'Realtime extension status:' as check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'realtime') 
    THEN '✓ Realtime extension enabled'
    ELSE '✗ Realtime extension NOT enabled'
  END as status;