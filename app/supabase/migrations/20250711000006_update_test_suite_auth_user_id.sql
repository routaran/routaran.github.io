-- Migration: Update test suite to use auth_user_id
-- Description: Updates all test functions and queries to use the new column name
-- This ensures the test suite continues to work after the column rename

BEGIN;

-- Update the simulate_user_auth function to have a more descriptive parameter name
-- Note: We keep the function signature the same to avoid breaking existing calls
CREATE OR REPLACE FUNCTION simulate_user_auth(p_auth_user_id TEXT) RETURNS VOID AS $$
BEGIN
    -- Set the request.jwt.claims for testing
    PERFORM set_config('request.jwt.claims', 
        json_build_object('sub', p_auth_user_id)::text, 
        true);
END;
$$ LANGUAGE plpgsql;

-- Update test_player_claims_policies to use auth_user_id
CREATE OR REPLACE FUNCTION test_player_claims_policies() RETURNS VOID AS $$
DECLARE
    claim_count INTEGER;
    error_msg TEXT;
BEGIN
    -- Test 16: User can view only their own claim
    BEGIN
        PERFORM simulate_user_auth('a1234567-0123-4567-8901-123456789005');
        SELECT COUNT(*) INTO claim_count FROM player_claims WHERE auth_user_id = 'a1234567-0123-4567-8901-123456789005';
        PERFORM log_test_result(
            'User view own claim',
            'Table Access',
            'Player',
            '1',
            claim_count::TEXT,
            claim_count = 1,
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        PERFORM log_test_result(
            'User view own claim',
            'Table Access',
            'Player',
            '1',
            'ERROR',
            FALSE,
            SQLERRM
        );
    END;

    -- Test 17: User cannot view other claims
    BEGIN
        PERFORM simulate_user_auth('a1234567-0123-4567-8901-123456789005');
        SELECT COUNT(*) INTO claim_count FROM player_claims;
        PERFORM log_test_result(
            'User view all claims',
            'Table Access',
            'Player',
            '1',
            claim_count::TEXT,
            claim_count = 1,
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        PERFORM log_test_result(
            'User view all claims',
            'Table Access',
            'Player',
            '1',
            'ERROR',
            FALSE,
            SQLERRM
        );
    END;

    -- Test 18: User cannot create duplicate claims
    BEGIN
        PERFORM simulate_user_auth('a1234567-0123-4567-8901-123456789005');
        INSERT INTO player_claims (player_id, auth_user_id) 
        VALUES ('01234567-0123-4567-8901-123456789016', 'a1234567-0123-4567-8901-123456789005');
        PERFORM log_test_result(
            'User create duplicate claim',
            'Table Access',
            'Player',
            'BLOCKED',
            'ALLOWED',
            FALSE,
            'Duplicate claim should have been blocked'
        );
    EXCEPTION WHEN OTHERS THEN
        PERFORM log_test_result(
            'User create duplicate claim',
            'Table Access',
            'Player',
            'BLOCKED',
            'BLOCKED',
            TRUE,
            NULL
        );
    END;

    -- Test 19: Unclaimed player can create claim
    BEGIN
        PERFORM simulate_user_auth('auth-uuid-unclaimed-test');
        INSERT INTO player_claims (player_id, auth_user_id) 
        VALUES ('01234567-0123-4567-8901-123456789016', 'auth-uuid-unclaimed-test');
        PERFORM log_test_result(
            'Unclaimed user create claim',
            'Table Access',
            'Player',
            'ALLOWED',
            'ALLOWED',
            TRUE,
            NULL
        );
        -- Clean up
        DELETE FROM player_claims WHERE auth_user_id = 'auth-uuid-unclaimed-test';
    EXCEPTION WHEN OTHERS THEN
        PERFORM log_test_result(
            'Unclaimed user create claim',
            'Table Access',
            'Player',
            'ALLOWED',
            'ERROR',
            FALSE,
            SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;

-- Update test_player_access_policies to use auth_user_id
CREATE OR REPLACE FUNCTION test_player_access_policies() RETURNS VOID AS $$
DECLARE
    test_result INTEGER;
    error_msg TEXT;
BEGIN
    -- Test access to other player claims
    BEGIN
        PERFORM simulate_user_auth('a1234567-0123-4567-8901-123456789005');
        SELECT COUNT(*) INTO test_result FROM player_claims 
        WHERE auth_user_id != 'a1234567-0123-4567-8901-123456789005';
        PERFORM log_test_result(
            'Player access other player claims',
            'Table Access',
            'Player',
            '0',
            test_result::TEXT,
            test_result = 0,
            NULL
        );
    EXCEPTION WHEN OTHERS THEN
        PERFORM log_test_result(
            'Player access other player claims',
            'Table Access',
            'Player',
            '0',
            'ERROR',
            FALSE,
            SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;

-- Verify all test functions are updated
DO $$
DECLARE
  func_count integer;
  func_names text;
BEGIN
  -- Find any functions that still reference supabase_uid
  SELECT 
    COUNT(*),
    string_agg(p.proname, ', ')
  INTO func_count, func_names
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname LIKE 'test_%'
  AND p.prosrc LIKE '%supabase_uid%';
  
  IF func_count > 0 THEN
    RAISE WARNING 'Found % test functions still using supabase_uid: %', func_count, func_names;
  ELSE
    RAISE NOTICE 'All test functions updated to use auth_user_id';
  END IF;
END
$$;

COMMIT;