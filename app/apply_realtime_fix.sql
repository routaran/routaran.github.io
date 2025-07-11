-- Fix Realtime Connection Issues
-- This script enables realtime for all necessary tables

-- Step 1: Add tables to realtime publication only if they're not already members
BEGIN;

-- For each table, check if it's already in the publication before adding it
DO $$
DECLARE
  tables_to_add text[] := ARRAY['play_dates', 'players', 'partnerships', 'matches', 'audit_log'];
  t text;
BEGIN
  FOREACH t IN ARRAY tables_to_add
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Added table % to supabase_realtime publication', t;
    ELSE
      RAISE NOTICE 'Table % is already in supabase_realtime publication', t;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Step 2: Verify tables are in the publication
SELECT
  'Realtime enabled for:' as status,
  string_agg(tablename, ', ') as tables
FROM
  pg_publication_tables
WHERE
  pubname = 'supabase_realtime'
  AND schemaname = 'public';

-- Step 3: Check if RLS is enabled on tables
SELECT
  'RLS Status:' as check_type,
  tablename,
  CASE
    WHEN rowsecurity THEN 'RLS Enabled ✓'
    ELSE 'RLS Disabled ✗'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('play_dates', 'players', 'partnerships', 'matches', 'audit_log')
ORDER BY tablename;

-- Step 4: Verify SELECT policies exist for anon role
SELECT
  'SELECT Policies for anon:' as check_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('play_dates', 'players', 'partnerships', 'matches')
  AND policyname LIKE '%select%'
  AND cmd = 'SELECT'
  AND roles @> '{anon}'::name[]
GROUP BY tablename
ORDER BY tablename;