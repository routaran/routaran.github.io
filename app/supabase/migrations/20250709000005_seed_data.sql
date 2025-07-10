-- ============================================================================
-- Migration: Comprehensive Seed Data for Development Testing
-- Description: Creates realistic test data supporting all 4 user roles
-- Author: Generated for Pickleball Tracker development
-- Date: 2025-07-09
-- ============================================================================

BEGIN;

-- ============================================================================
-- PLAYERS - Mix of roles with realistic data
-- ============================================================================

-- Project Owner (1 player)
INSERT INTO players (id, name, email, is_project_owner, created_at, updated_at) VALUES
('01234567-0123-4567-8901-123456789001', 'Admin Sarah', 'admin@pickleballtracker.com', true, '2025-01-01 10:00:00+00', '2025-01-01 10:00:00+00');

-- Organizers (3 players)
INSERT INTO players (id, name, email, is_project_owner, created_at, updated_at) VALUES
('01234567-0123-4567-8901-123456789002', 'Mike Johnson', 'mike.johnson@email.com', false, '2025-01-02 11:00:00+00', '2025-01-02 11:00:00+00'),
('01234567-0123-4567-8901-123456789003', 'Lisa Chen', 'lisa.chen@email.com', false, '2025-01-03 12:00:00+00', '2025-01-03 12:00:00+00'),
('01234567-0123-4567-8901-123456789004', 'David Rodriguez', 'david.rodriguez@email.com', false, '2025-01-04 13:00:00+00', '2025-01-04 13:00:00+00');

-- Regular Players (12 players)
INSERT INTO players (id, name, email, is_project_owner, created_at, updated_at) VALUES
('01234567-0123-4567-8901-123456789005', 'Emma Wilson', 'emma.wilson@email.com', false, '2025-01-05 14:00:00+00', '2025-01-05 14:00:00+00'),
('01234567-0123-4567-8901-123456789006', 'James Thompson', 'james.thompson@email.com', false, '2025-01-06 15:00:00+00', '2025-01-06 15:00:00+00'),
('01234567-0123-4567-8901-123456789007', 'Olivia Martinez', 'olivia.martinez@email.com', false, '2025-01-07 16:00:00+00', '2025-01-07 16:00:00+00'),
('01234567-0123-4567-8901-123456789008', 'Robert Davis', 'robert.davis@email.com', false, '2025-01-08 17:00:00+00', '2025-01-08 17:00:00+00'),
('01234567-0123-4567-8901-123456789009', 'Sophia Anderson', 'sophia.anderson@email.com', false, '2025-01-09 18:00:00+00', '2025-01-09 18:00:00+00'),
('01234567-0123-4567-8901-123456789010', 'Michael Brown', 'michael.brown@email.com', false, '2025-01-10 19:00:00+00', '2025-01-10 19:00:00+00'),
('01234567-0123-4567-8901-123456789011', 'Isabella Garcia', 'isabella.garcia@email.com', false, '2025-01-11 20:00:00+00', '2025-01-11 20:00:00+00'),
('01234567-0123-4567-8901-123456789012', 'William Taylor', 'william.taylor@email.com', false, '2025-01-12 21:00:00+00', '2025-01-12 21:00:00+00'),
('01234567-0123-4567-8901-123456789013', 'Ava Johnson', 'ava.johnson@email.com', false, '2025-01-13 22:00:00+00', '2025-01-13 22:00:00+00'),
('01234567-0123-4567-8901-123456789014', 'Alexander Lee', 'alex.lee@email.com', false, '2025-01-14 23:00:00+00', '2025-01-14 23:00:00+00'),
('01234567-0123-4567-8901-123456789015', 'Charlotte White', 'charlotte.white@email.com', false, '2025-01-15 10:30:00+00', '2025-01-15 10:30:00+00'),
('01234567-0123-4567-8901-123456789016', 'Daniel Harris', 'daniel.harris@email.com', false, '2025-01-16 11:30:00+00', '2025-01-16 11:30:00+00');

-- ============================================================================
-- PLAYER CLAIMS - Link some players to auth UIDs for testing
-- ============================================================================

-- Claims for testing different roles
INSERT INTO player_claims (player_id, supabase_uid, claimed_at) VALUES
-- Project Owner
('01234567-0123-4567-8901-123456789001', 'a1234567-0123-4567-8901-123456789001', '2025-01-01 10:15:00+00'),
-- Organizers
('01234567-0123-4567-8901-123456789002', 'a1234567-0123-4567-8901-123456789002', '2025-01-02 11:15:00+00'),
('01234567-0123-4567-8901-123456789003', 'a1234567-0123-4567-8901-123456789003', '2025-01-03 12:15:00+00'),
('01234567-0123-4567-8901-123456789004', 'a1234567-0123-4567-8901-123456789004', '2025-01-04 13:15:00+00'),
-- Regular Players
('01234567-0123-4567-8901-123456789005', 'a1234567-0123-4567-8901-123456789005', '2025-01-05 14:15:00+00'),
('01234567-0123-4567-8901-123456789006', 'a1234567-0123-4567-8901-123456789006', '2025-01-06 15:15:00+00'),
('01234567-0123-4567-8901-123456789007', 'a1234567-0123-4567-8901-123456789007', '2025-01-07 16:15:00+00'),
('01234567-0123-4567-8901-123456789008', 'a1234567-0123-4567-8901-123456789008', '2025-01-08 17:15:00+00');

-- ============================================================================
-- PLAY DATES - Different configurations for testing
-- ============================================================================

-- Play Date 1: Recent completed tournament (Mike Johnson organizer)
INSERT INTO play_dates (id, date, organizer_id, num_courts, win_condition, target_score, status, schedule_locked, created_at, updated_at, version) VALUES
('02234567-0123-4567-8901-123456789001', '2025-07-20', '01234567-0123-4567-8901-123456789002', 4, 'first_to_target', 11, 'completed', true, '2025-07-05 09:00:00+00', '2025-07-09 18:00:00+00', 3);

-- Play Date 2: Active tournament (Lisa Chen organizer)
INSERT INTO play_dates (id, date, organizer_id, num_courts, win_condition, target_score, status, schedule_locked, created_at, updated_at, version) VALUES
('02234567-0123-4567-8901-123456789002', '2025-08-15', '01234567-0123-4567-8901-123456789003', 3, 'win_by_2', 15, 'active', true, '2025-07-01 10:00:00+00', '2025-07-09 14:30:00+00', 2);

-- Play Date 3: Upcoming tournament (David Rodriguez organizer)
INSERT INTO play_dates (id, date, organizer_id, num_courts, win_condition, target_score, status, schedule_locked, created_at, updated_at, version) VALUES
('02234567-0123-4567-8901-123456789003', '2025-09-01', '01234567-0123-4567-8901-123456789004', 2, 'first_to_target', 21, 'scheduled', false, '2025-07-10 11:00:00+00', '2025-07-10 11:00:00+00', 1);

-- Play Date 4: Future tournament with odd players (Admin Sarah organizer)
INSERT INTO play_dates (id, date, organizer_id, num_courts, win_condition, target_score, status, schedule_locked, created_at, updated_at, version) VALUES
('02234567-0123-4567-8901-123456789004', '2025-10-12', '01234567-0123-4567-8901-123456789001', 3, 'win_by_2', 11, 'scheduled', false, '2025-07-01 12:00:00+00', '2025-07-01 12:00:00+00', 1);

-- ============================================================================
-- COURTS - Different configurations per play date
-- ============================================================================

-- Courts for Play Date 1 (4 courts)
INSERT INTO courts (id, play_date_id, court_number, court_name, created_at) VALUES
('03234567-0123-4567-8901-123456789001', '02234567-0123-4567-8901-123456789001', 1, 'Court A', '2025-07-05 09:15:00+00'),
('03234567-0123-4567-8901-123456789002', '02234567-0123-4567-8901-123456789001', 2, 'Court B', '2025-07-05 09:15:00+00'),
('03234567-0123-4567-8901-123456789003', '02234567-0123-4567-8901-123456789001', 3, 'Court C', '2025-07-05 09:15:00+00'),
('03234567-0123-4567-8901-123456789004', '02234567-0123-4567-8901-123456789001', 4, 'Court D', '2025-07-05 09:15:00+00');

-- Courts for Play Date 2 (3 courts)
INSERT INTO courts (id, play_date_id, court_number, court_name, created_at) VALUES
('03234567-0123-4567-8901-123456789005', '02234567-0123-4567-8901-123456789002', 1, 'North Court', '2025-07-01 10:15:00+00'),
('03234567-0123-4567-8901-123456789006', '02234567-0123-4567-8901-123456789002', 2, 'South Court', '2025-07-01 10:15:00+00'),
('03234567-0123-4567-8901-123456789007', '02234567-0123-4567-8901-123456789002', 3, 'East Court', '2025-07-01 10:15:00+00');

-- Courts for Play Date 3 (2 courts)
INSERT INTO courts (id, play_date_id, court_number, court_name, created_at) VALUES
('03234567-0123-4567-8901-123456789008', '02234567-0123-4567-8901-123456789003', 1, 'Main Court', '2025-07-10 11:15:00+00'),
('03234567-0123-4567-8901-123456789009', '02234567-0123-4567-8901-123456789003', 2, 'Practice Court', '2025-07-10 11:15:00+00');

-- Courts for Play Date 4 (3 courts)
INSERT INTO courts (id, play_date_id, court_number, court_name, created_at) VALUES
('03234567-0123-4567-8901-123456789010', '02234567-0123-4567-8901-123456789004', 1, 'Center Court', '2025-07-01 12:15:00+00'),
('03234567-0123-4567-8901-123456789011', '02234567-0123-4567-8901-123456789004', 2, 'Side Court', '2025-07-01 12:15:00+00'),
('03234567-0123-4567-8901-123456789012', '02234567-0123-4567-8901-123456789004', 3, 'Back Court', '2025-07-01 12:15:00+00');

-- ============================================================================
-- PARTNERSHIPS - Realistic pairings for each play date
-- ============================================================================

-- Play Date 1 Partnerships (8 players, 4 partnerships)
INSERT INTO partnerships (id, play_date_id, player1_id, player2_id, partnership_name, created_at) VALUES
('04234567-0123-4567-8901-123456789001', '02234567-0123-4567-8901-123456789001', '01234567-0123-4567-8901-123456789002', '01234567-0123-4567-8901-123456789005', 'Team Alpha', '2025-01-15 09:30:00+00'),
('04234567-0123-4567-8901-123456789002', '02234567-0123-4567-8901-123456789001', '01234567-0123-4567-8901-123456789003', '01234567-0123-4567-8901-123456789006', 'Team Beta', '2025-01-15 09:30:00+00'),
('04234567-0123-4567-8901-123456789003', '02234567-0123-4567-8901-123456789001', '01234567-0123-4567-8901-123456789004', '01234567-0123-4567-8901-123456789007', 'Team Gamma', '2025-01-15 09:30:00+00'),
('04234567-0123-4567-8901-123456789004', '02234567-0123-4567-8901-123456789001', '01234567-0123-4567-8901-123456789008', '01234567-0123-4567-8901-123456789009', 'Team Delta', '2025-01-15 09:30:00+00');

-- Play Date 2 Partnerships (6 players, 3 partnerships)
INSERT INTO partnerships (id, play_date_id, player1_id, player2_id, partnership_name, created_at) VALUES
('04234567-0123-4567-8901-123456789005', '02234567-0123-4567-8901-123456789002', '01234567-0123-4567-8901-123456789010', '01234567-0123-4567-8901-123456789011', 'Team Eagles', '2025-07-01 10:30:00+00'),
('04234567-0123-4567-8901-123456789006', '02234567-0123-4567-8901-123456789002', '01234567-0123-4567-8901-123456789012', '01234567-0123-4567-8901-123456789013', 'Team Hawks', '2025-07-01 10:30:00+00'),
('04234567-0123-4567-8901-123456789007', '02234567-0123-4567-8901-123456789002', '01234567-0123-4567-8901-123456789014', '01234567-0123-4567-8901-123456789015', 'Team Falcons', '2025-07-01 10:30:00+00');

-- Play Date 3 Partnerships (4 players, 2 partnerships)
INSERT INTO partnerships (id, play_date_id, player1_id, player2_id, partnership_name, created_at) VALUES
('04234567-0123-4567-8901-123456789008', '02234567-0123-4567-8901-123456789003', '01234567-0123-4567-8901-123456789001', '01234567-0123-4567-8901-123456789016', 'Team Thunder', '2025-07-10 11:30:00+00'),
('04234567-0123-4567-8901-123456789009', '02234567-0123-4567-8901-123456789003', '01234567-0123-4567-8901-123456789002', '01234567-0123-4567-8901-123456789003', 'Team Lightning', '2025-07-10 11:30:00+00');

-- Play Date 4 Partnerships (5 players, 5 partnerships for odd number testing)
INSERT INTO partnerships (id, play_date_id, player1_id, player2_id, partnership_name, created_at) VALUES
('04234567-0123-4567-8901-123456789010', '02234567-0123-4567-8901-123456789004', '01234567-0123-4567-8901-123456789004', '01234567-0123-4567-8901-123456789005', 'Team Phoenix', '2025-07-01 12:30:00+00'),
('04234567-0123-4567-8901-123456789011', '02234567-0123-4567-8901-123456789004', '01234567-0123-4567-8901-123456789006', '01234567-0123-4567-8901-123456789007', 'Team Dragon', '2025-07-01 12:30:00+00'),
('04234567-0123-4567-8901-123456789012', '02234567-0123-4567-8901-123456789004', '01234567-0123-4567-8901-123456789008', '01234567-0123-4567-8901-123456789009', 'Team Griffin', '2025-07-01 12:30:00+00'),
('04234567-0123-4567-8901-123456789013', '02234567-0123-4567-8901-123456789004', '01234567-0123-4567-8901-123456789010', '01234567-0123-4567-8901-123456789011', 'Team Unicorn', '2025-07-01 12:30:00+00'),
('04234567-0123-4567-8901-123456789014', '02234567-0123-4567-8901-123456789004', '01234567-0123-4567-8901-123456789012', '01234567-0123-4567-8901-123456789013', 'Team Pegasus', '2025-07-01 12:30:00+00');

-- ============================================================================
-- MATCHES - Mix of completed, in-progress, and waiting matches
-- ============================================================================

-- Play Date 1 Matches (All completed - round robin with 4 teams = 6 matches)
INSERT INTO matches (id, play_date_id, court_id, round_number, partnership1_id, partnership2_id, team1_score, team2_score, winning_partnership_id, status, recorded_by, recorded_at, created_at, updated_at, version) VALUES
-- Round 1
('05234567-0123-4567-8901-123456789001', '02234567-0123-4567-8901-123456789001', '03234567-0123-4567-8901-123456789001', 1, '04234567-0123-4567-8901-123456789001', '04234567-0123-4567-8901-123456789002', 11, 8, '04234567-0123-4567-8901-123456789001', 'completed', '01234567-0123-4567-8901-123456789005', '2025-07-20 10:30:00+00', '2025-07-20 10:00:00+00', '2025-07-20 10:30:00+00', 2),
('05234567-0123-4567-8901-123456789002', '02234567-0123-4567-8901-123456789001', '03234567-0123-4567-8901-123456789002', 1, '04234567-0123-4567-8901-123456789003', '04234567-0123-4567-8901-123456789004', 9, 11, '04234567-0123-4567-8901-123456789004', 'completed', '01234567-0123-4567-8901-123456789008', '2025-07-20 10:25:00+00', '2025-07-20 10:00:00+00', '2025-07-20 10:25:00+00', 2),
-- Round 2
('05234567-0123-4567-8901-123456789003', '02234567-0123-4567-8901-123456789001', '03234567-0123-4567-8901-123456789001', 2, '04234567-0123-4567-8901-123456789001', '04234567-0123-4567-8901-123456789003', 11, 13, '04234567-0123-4567-8901-123456789003', 'completed', '01234567-0123-4567-8901-123456789007', '2025-07-20 11:15:00+00', '2025-07-20 11:00:00+00', '2025-07-20 11:15:00+00', 2),
('05234567-0123-4567-8901-123456789004', '02234567-0123-4567-8901-123456789001', '03234567-0123-4567-8901-123456789002', 2, '04234567-0123-4567-8901-123456789002', '04234567-0123-4567-8901-123456789004', 11, 6, '04234567-0123-4567-8901-123456789002', 'completed', '01234567-0123-4567-8901-123456789003', '2025-07-20 11:10:00+00', '2025-07-20 11:00:00+00', '2025-07-20 11:10:00+00', 2),
-- Round 3
('05234567-0123-4567-8901-123456789005', '02234567-0123-4567-8901-123456789001', '03234567-0123-4567-8901-123456789001', 3, '04234567-0123-4567-8901-123456789001', '04234567-0123-4567-8901-123456789004', 11, 9, '04234567-0123-4567-8901-123456789001', 'completed', '01234567-0123-4567-8901-123456789005', '2025-07-20 12:00:00+00', '2025-07-20 11:45:00+00', '2025-07-20 12:00:00+00', 2),
('05234567-0123-4567-8901-123456789006', '02234567-0123-4567-8901-123456789001', '03234567-0123-4567-8901-123456789002', 3, '04234567-0123-4567-8901-123456789002', '04234567-0123-4567-8901-123456789003', 8, 11, '04234567-0123-4567-8901-123456789003', 'completed', '01234567-0123-4567-8901-123456789004', '2025-07-20 12:05:00+00', '2025-07-20 11:45:00+00', '2025-07-20 12:05:00+00', 2);

-- Play Date 2 Matches (Mix of completed and in-progress - round robin with 3 teams = 3 matches)
INSERT INTO matches (id, play_date_id, court_id, round_number, partnership1_id, partnership2_id, team1_score, team2_score, winning_partnership_id, status, recorded_by, recorded_at, created_at, updated_at, version) VALUES
-- Round 1 - Completed
('05234567-0123-4567-8901-123456789007', '02234567-0123-4567-8901-123456789002', '03234567-0123-4567-8901-123456789005', 1, '04234567-0123-4567-8901-123456789005', '04234567-0123-4567-8901-123456789006', 15, 12, '04234567-0123-4567-8901-123456789005', 'completed', '01234567-0123-4567-8901-123456789010', '2025-08-15 10:30:00+00', '2025-08-15 10:00:00+00', '2025-08-15 10:30:00+00', 2),
-- Round 2 - In progress
('05234567-0123-4567-8901-123456789008', '02234567-0123-4567-8901-123456789002', '03234567-0123-4567-8901-123456789006', 2, '04234567-0123-4567-8901-123456789005', '04234567-0123-4567-8901-123456789007', 8, 6, NULL, 'in_progress', NULL, NULL, '2025-08-15 11:00:00+00', '2025-08-15 14:30:00+00', 1),
-- Round 3 - Waiting
('05234567-0123-4567-8901-123456789009', '02234567-0123-4567-8901-123456789002', '03234567-0123-4567-8901-123456789007', 3, '04234567-0123-4567-8901-123456789006', '04234567-0123-4567-8901-123456789007', NULL, NULL, NULL, 'waiting', NULL, NULL, '2025-08-15 12:00:00+00', '2025-08-15 12:00:00+00', 1);

-- Play Date 3 Matches (All waiting - round robin with 2 teams = 1 match)
INSERT INTO matches (id, play_date_id, court_id, round_number, partnership1_id, partnership2_id, team1_score, team2_score, winning_partnership_id, status, recorded_by, recorded_at, created_at, updated_at, version) VALUES
('05234567-0123-4567-8901-123456789010', '02234567-0123-4567-8901-123456789003', '03234567-0123-4567-8901-123456789008', 1, '04234567-0123-4567-8901-123456789008', '04234567-0123-4567-8901-123456789009', NULL, NULL, NULL, 'waiting', NULL, NULL, '2025-07-10 11:45:00+00', '2025-07-10 11:45:00+00', 1);

-- Play Date 4 Matches (All waiting - round robin with 5 teams = 10 matches, showing bye rounds)
INSERT INTO matches (id, play_date_id, court_id, round_number, partnership1_id, partnership2_id, team1_score, team2_score, winning_partnership_id, status, recorded_by, recorded_at, created_at, updated_at, version) VALUES
-- Round 1 (Team Phoenix has bye - only 2 matches on courts)
('05234567-0123-4567-8901-123456789011', '02234567-0123-4567-8901-123456789004', '03234567-0123-4567-8901-123456789010', 1, '04234567-0123-4567-8901-123456789011', '04234567-0123-4567-8901-123456789012', NULL, NULL, NULL, 'waiting', NULL, NULL, '2025-07-01 12:45:00+00', '2025-07-01 12:45:00+00', 1),
('05234567-0123-4567-8901-123456789012', '02234567-0123-4567-8901-123456789004', '03234567-0123-4567-8901-123456789011', 1, '04234567-0123-4567-8901-123456789013', '04234567-0123-4567-8901-123456789014', NULL, NULL, NULL, 'waiting', NULL, NULL, '2025-07-01 12:45:00+00', '2025-07-01 12:45:00+00', 1),
-- Round 2 (Team Dragon has bye)
('05234567-0123-4567-8901-123456789013', '02234567-0123-4567-8901-123456789004', '03234567-0123-4567-8901-123456789010', 2, '04234567-0123-4567-8901-123456789010', '04234567-0123-4567-8901-123456789012', NULL, NULL, NULL, 'waiting', NULL, NULL, '2025-07-01 13:00:00+00', '2025-07-01 13:00:00+00', 1),
('05234567-0123-4567-8901-123456789014', '02234567-0123-4567-8901-123456789004', '03234567-0123-4567-8901-123456789011', 2, '04234567-0123-4567-8901-123456789013', '04234567-0123-4567-8901-123456789014', NULL, NULL, NULL, 'waiting', NULL, NULL, '2025-07-01 13:00:00+00', '2025-07-01 13:00:00+00', 1);

-- ============================================================================
-- AUDIT LOG - Sample entries showing different scenarios
-- ============================================================================

INSERT INTO audit_log (id, play_date_id, match_id, player_id, action_type, old_values, new_values, metadata, created_at) VALUES
-- Score updates from Play Date 1
('06234567-0123-4567-8901-123456789001', '02234567-0123-4567-8901-123456789001', '05234567-0123-4567-8901-123456789001', '01234567-0123-4567-8901-123456789005', 'UPDATE', 
 '{"team1_score": null, "team2_score": null, "status": "waiting", "version": 1}', 
 '{"team1_score": 11, "team2_score": 8, "status": "completed", "version": 2}', 
 '{"user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", "ip_address": "192.168.1.100", "timestamp": "2025-07-20T10:30:00Z"}', 
 '2025-07-20 10:30:00+00'),

('06234567-0123-4567-8901-123456789002', '02234567-0123-4567-8901-123456789001', '05234567-0123-4567-8901-123456789002', '01234567-0123-4567-8901-123456789008', 'UPDATE', 
 '{"team1_score": null, "team2_score": null, "status": "waiting", "version": 1}', 
 '{"team1_score": 9, "team2_score": 11, "status": "completed", "version": 2}', 
 '{"user_agent": "Mozilla/5.0 (Android 14; Mobile; rv:123.0)", "ip_address": "192.168.1.101", "timestamp": "2025-07-20T10:25:00Z"}', 
 '2025-07-20 10:25:00+00'),

-- Score correction example
('06234567-0123-4567-8901-123456789003', '02234567-0123-4567-8901-123456789001', '05234567-0123-4567-8901-123456789003', '01234567-0123-4567-8901-123456789007', 'UPDATE', 
 '{"team1_score": 10, "team2_score": 13, "status": "completed", "version": 2}', 
 '{"team1_score": 11, "team2_score": 13, "status": "completed", "version": 3}', 
 '{"user_agent": "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", "ip_address": "192.168.1.102", "timestamp": "2025-07-20T11:15:00Z", "correction_reason": "Miscount corrected"}', 
 '2025-07-20 11:15:00+00'),

-- Play Date 2 score update
('06234567-0123-4567-8901-123456789004', '02234567-0123-4567-8901-123456789002', '05234567-0123-4567-8901-123456789007', '01234567-0123-4567-8901-123456789010', 'UPDATE', 
 '{"team1_score": null, "team2_score": null, "status": "waiting", "version": 1}', 
 '{"team1_score": 15, "team2_score": 12, "status": "completed", "version": 2}', 
 '{"user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "ip_address": "192.168.1.103", "timestamp": "2025-08-15T10:30:00Z"}', 
 '2025-08-15 10:30:00+00'),

-- System-generated audit entries
('06234567-0123-4567-8901-123456789005', '02234567-0123-4567-8901-123456789001', NULL, NULL, 'SYSTEM', 
 '{"schedule_locked": false}', 
 '{"schedule_locked": true}', 
 '{"trigger": "first_score_entered", "match_id": "05234567-0123-4567-8901-123456789001", "timestamp": "2025-07-20T10:25:00Z"}', 
 '2025-07-20 10:25:00+00'),

('06234567-0123-4567-8901-123456789006', '02234567-0123-4567-8901-123456789001', NULL, '01234567-0123-4567-8901-123456789002', 'PLAY_DATE_STATUS', 
 '{"status": "active"}', 
 '{"status": "completed"}', 
 '{"trigger": "all_matches_completed", "completion_time": "2025-07-20T12:05:00Z"}', 
 '2025-07-20 12:05:00+00'),

-- Player claim audit
('06234567-0123-4567-8901-123456789007', NULL, NULL, '01234567-0123-4567-8901-123456789005', 'PLAYER_CLAIM', 
 '{"claimed": false}', 
 '{"claimed": true, "supabase_uid": "auth-uuid-player-0000000005"}', 
 '{"claim_method": "magic_link", "timestamp": "2025-01-05T14:15:00Z"}', 
 '2025-01-05 14:15:00+00'),

-- Disputed score example
('06234567-0123-4567-8901-123456789008', '02234567-0123-4567-8901-123456789002', '05234567-0123-4567-8901-123456789008', '01234567-0123-4567-8901-123456789003', 'DISPUTE', 
 '{"status": "in_progress"}', 
 '{"status": "disputed"}', 
 '{"dispute_reason": "Score disagreement", "reported_by": "01234567-0123-4567-8901-123456789014", "timestamp": "2025-08-15T14:30:00Z"}', 
 '2025-08-15 14:30:00+00');

-- ============================================================================
-- REFRESH MATERIALIZED VIEW
-- ============================================================================

-- Refresh the materialized view to include new data
REFRESH MATERIALIZED VIEW match_results;

-- ============================================================================
-- DATA VALIDATION CHECKS
-- ============================================================================

-- Validate that all foreign key relationships are correct
DO $$
DECLARE
    error_count INTEGER := 0;
    check_result TEXT;
BEGIN
    -- Check players count
    SELECT COUNT(*) INTO error_count FROM players;
    IF error_count != 16 THEN
        RAISE EXCEPTION 'Expected 16 players, found %', error_count;
    END IF;
    
    -- Check play dates count
    SELECT COUNT(*) INTO error_count FROM play_dates;
    IF error_count != 4 THEN
        RAISE EXCEPTION 'Expected 4 play dates, found %', error_count;
    END IF;
    
    -- Check partnerships count
    SELECT COUNT(*) INTO error_count FROM partnerships;
    IF error_count != 17 THEN
        RAISE EXCEPTION 'Expected 17 partnerships, found %', error_count;
    END IF;
    
    -- Check matches count
    SELECT COUNT(*) INTO error_count FROM matches;
    IF error_count != 12 THEN
        RAISE EXCEPTION 'Expected 12 matches, found %', error_count;
    END IF;
    
    -- Check audit log count
    SELECT COUNT(*) INTO error_count FROM audit_log;
    IF error_count != 8 THEN
        RAISE EXCEPTION 'Expected 8 audit log entries, found %', error_count;
    END IF;
    
    -- Validate foreign key integrity
    SELECT COUNT(*) INTO error_count FROM partnerships p
    LEFT JOIN players p1 ON p.player1_id = p1.id
    LEFT JOIN players p2 ON p.player2_id = p2.id
    WHERE p1.id IS NULL OR p2.id IS NULL;
    
    IF error_count > 0 THEN
        RAISE EXCEPTION 'Foreign key integrity violation in partnerships: % invalid references', error_count;
    END IF;
    
    -- Validate match partnerships
    SELECT COUNT(*) INTO error_count FROM matches m
    LEFT JOIN partnerships p1 ON m.partnership1_id = p1.id
    LEFT JOIN partnerships p2 ON m.partnership2_id = p2.id
    WHERE p1.id IS NULL OR p2.id IS NULL;
    
    IF error_count > 0 THEN
        RAISE EXCEPTION 'Foreign key integrity violation in matches: % invalid partnership references', error_count;
    END IF;
    
    RAISE NOTICE 'All data validation checks passed successfully';
    RAISE NOTICE 'Created seed data for 4 user roles across 4 play dates';
    RAISE NOTICE 'Includes completed, in-progress, and waiting matches for comprehensive testing';
END;
$$;

-- ============================================================================
-- TESTING SCENARIOS DOCUMENTATION
-- ============================================================================

-- Document the test scenarios created by this seed data
COMMENT ON TABLE players IS 'Seed data includes 16 players: 1 project owner, 3 organizers, 12 regular players. 8 players have auth claims for role testing.';
COMMENT ON TABLE play_dates IS 'Seed data includes 4 play dates: 1 completed, 1 active, 2 scheduled. Different court counts and win conditions for comprehensive testing.';
COMMENT ON TABLE partnerships IS 'Seed data includes partnerships for all play dates, including odd-number scenarios with bye rounds.';
COMMENT ON TABLE matches IS 'Seed data includes matches in all states: completed (Play Date 1), in-progress (Play Date 2), waiting (Play Dates 3-4).';
COMMENT ON TABLE audit_log IS 'Seed data includes score updates, corrections, disputes, and system-generated entries for testing audit functionality.';

-- ============================================================================
-- ROLE-BASED TESTING INSTRUCTIONS
-- ============================================================================

/*
TESTING INSTRUCTIONS:

1. PROJECT OWNER TESTING (Admin Sarah - auth-uuid-admin-000000000001):
   - Can view/edit all Play Dates
   - Can manage all players
   - Can view all audit logs
   - Test with Play Date 4 (organizer)

2. ORGANIZER TESTING:
   - Mike Johnson (auth-uuid-organizer-000000002): Organizer of Play Date 1 (completed)
   - Lisa Chen (auth-uuid-organizer-000000003): Organizer of Play Date 2 (active)
   - David Rodriguez (auth-uuid-organizer-000000004): Organizer of Play Date 3 (scheduled)
   - Can only edit their own Play Dates
   - Can view audit logs for their Play Dates

3. PLAYER TESTING:
   - Emma Wilson (auth-uuid-player-0000000005): Player in Play Date 1 (Team Alpha)
   - James Thompson (auth-uuid-player-0000000006): Player in Play Date 1 (Team Beta)
   - Olivia Martinez (auth-uuid-player-0000000007): Player in Play Date 1 (Team Gamma)
   - Robert Davis (auth-uuid-player-0000000008): Player in Play Date 1 (Team Delta)
   - Can only update scores for their own matches
   - Cannot edit Play Date settings

4. VISITOR TESTING:
   - Use unauthenticated requests
   - Can view all public data (players, play dates, matches, rankings)
   - Cannot edit anything

5. EDGE CASE TESTING:
   - Play Date 4 has 5 teams (odd number) with bye rounds
   - Play Date 2 has disputed match for conflict resolution testing
   - Audit log includes score corrections for testing dispute resolution
   - Different win conditions (first_to_target vs win_by_2) for rules testing

6. REALTIME TESTING:
   - Subscribe to matches table for live score updates
   - Subscribe to play_dates table for status changes
   - Subscribe to audit_log table for real-time audit trail

7. OPTIMISTIC LOCKING TESTING:
   - Use version field in matches table
   - Test concurrent update scenarios
   - Verify version increments on each update
*/

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETION
-- ============================================================================

-- Final success message
SELECT 'Seed data migration completed successfully at ' || NOW() || 
       '. Created comprehensive test data for all 4 user roles across 4 play dates.' AS status;