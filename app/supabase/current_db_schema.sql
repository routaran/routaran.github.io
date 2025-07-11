-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  play_date_id uuid,
  match_id uuid,
  player_id uuid,
  action_type character varying NOT NULL CHECK (length(action_type::text) >= 1),
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_play_date_id_fkey FOREIGN KEY (play_date_id) REFERENCES public.play_dates(id),
  CONSTRAINT audit_log_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT audit_log_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);
CREATE TABLE public.courts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  play_date_id uuid NOT NULL,
  court_number integer NOT NULL CHECK (court_number >= 1 AND court_number <= 4),
  court_name character varying NOT NULL CHECK (length(court_name::text) >= 1),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT courts_pkey PRIMARY KEY (id),
  CONSTRAINT courts_play_date_id_fkey FOREIGN KEY (play_date_id) REFERENCES public.play_dates(id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  play_date_id uuid NOT NULL,
  court_id uuid NOT NULL,
  round_number integer NOT NULL CHECK (round_number >= 1),
  partnership1_id uuid NOT NULL,
  partnership2_id uuid NOT NULL,
  team1_score integer CHECK (team1_score >= 0),
  team2_score integer CHECK (team2_score >= 0),
  winning_partnership_id uuid,
  status character varying NOT NULL DEFAULT 'waiting'::character varying CHECK (status::text = ANY (ARRAY['waiting'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'disputed'::character varying]::text[])),
  recorded_by uuid,
  recorded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_play_date_id_fkey FOREIGN KEY (play_date_id) REFERENCES public.play_dates(id),
  CONSTRAINT matches_court_id_fkey FOREIGN KEY (court_id) REFERENCES public.courts(id),
  CONSTRAINT matches_partnership1_id_fkey FOREIGN KEY (partnership1_id) REFERENCES public.partnerships(id),
  CONSTRAINT matches_partnership2_id_fkey FOREIGN KEY (partnership2_id) REFERENCES public.partnerships(id),
  CONSTRAINT matches_winning_partnership_id_fkey FOREIGN KEY (winning_partnership_id) REFERENCES public.partnerships(id),
  CONSTRAINT matches_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.players(id)
);
CREATE TABLE public.partnerships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  play_date_id uuid NOT NULL,
  player1_id uuid NOT NULL,
  player2_id uuid NOT NULL,
  partnership_name character varying NOT NULL CHECK (length(partnership_name::text) >= 1),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partnerships_pkey PRIMARY KEY (id),
  CONSTRAINT partnerships_play_date_id_fkey FOREIGN KEY (play_date_id) REFERENCES public.play_dates(id),
  CONSTRAINT partnerships_player1_id_fkey FOREIGN KEY (player1_id) REFERENCES public.players(id),
  CONSTRAINT partnerships_player2_id_fkey FOREIGN KEY (player2_id) REFERENCES public.players(id)
);
CREATE TABLE public.play_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL CHECK (date >= CURRENT_DATE),
  organizer_id uuid NOT NULL,
  num_courts integer NOT NULL CHECK (num_courts >= 1 AND num_courts <= 4),
  win_condition character varying NOT NULL CHECK (win_condition::text = ANY (ARRAY['first_to_target'::character varying, 'win_by_2'::character varying]::text[])),
  target_score integer NOT NULL DEFAULT 11 CHECK (target_score >= 5 AND target_score <= 21),
  status character varying NOT NULL DEFAULT 'scheduled'::character varying CHECK (status::text = ANY (ARRAY['scheduled'::character varying, 'active'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  schedule_locked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT play_dates_pkey PRIMARY KEY (id),
  CONSTRAINT play_dates_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.players(id)
);
CREATE TABLE public.player_claims (
  player_id uuid NOT NULL,
  auth_user_id uuid NOT NULL UNIQUE,
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT player_claims_pkey PRIMARY KEY (player_id),
  CONSTRAINT player_claims_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);
CREATE TABLE public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE CHECK (length(name::text) >= 2),
  email character varying NOT NULL UNIQUE CHECK (email::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text),
  is_project_owner boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT players_pkey PRIMARY KEY (id)
);
