export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      play_dates: {
        Row: {
          id: string;
          date: string;
          organizer_id: string;
          num_courts: number;
          win_condition: "first_to_target" | "win_by_2";
          target_score: number;
          status: "scheduled" | "active" | "completed" | "cancelled";
          schedule_locked: boolean;
          created_at: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          id?: string;
          date: string;
          organizer_id: string;
          num_courts?: number;
          win_condition?: "first_to_target" | "win_by_2";
          target_score?: number;
          status?: "scheduled" | "active" | "completed" | "cancelled";
          schedule_locked?: boolean;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          id?: string;
          date?: string;
          organizer_id?: string;
          num_courts?: number;
          win_condition?: "first_to_target" | "win_by_2";
          target_score?: number;
          status?: "scheduled" | "active" | "completed" | "cancelled";
          schedule_locked?: boolean;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
      };
      players: {
        Row: {
          id: string;
          name: string;
          email: string;
          is_project_owner: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          is_project_owner?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          is_project_owner?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_claims: {
        Row: {
          player_id: string;
          auth_user_id: string;
          claimed_at: string;
        };
        Insert: {
          player_id: string;
          auth_user_id: string;
          claimed_at?: string;
        };
        Update: {
          player_id?: string;
          auth_user_id?: string;
          claimed_at?: string;
        };
      };
      partnerships: {
        Row: {
          id: string;
          play_date_id: string;
          player1_id: string;
          player2_id: string;
          partnership_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          play_date_id: string;
          player1_id: string;
          player2_id: string;
          partnership_name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          play_date_id?: string;
          player1_id?: string;
          player2_id?: string;
          partnership_name?: string;
          created_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          play_date_id: string;
          court_id: string;
          round_number: number;
          partnership1_id: string;
          partnership2_id: string;
          team1_score: number | null;
          team2_score: number | null;
          winning_partnership_id: string | null;
          status: "waiting" | "in_progress" | "completed" | "disputed";
          recorded_by: string | null;
          recorded_at: string | null;
          created_at: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          id?: string;
          play_date_id: string;
          court_id: string;
          round_number: number;
          partnership1_id: string;
          partnership2_id: string;
          team1_score?: number | null;
          team2_score?: number | null;
          winning_partnership_id?: string | null;
          status?: "waiting" | "in_progress" | "completed" | "disputed";
          recorded_by?: string | null;
          recorded_at?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          id?: string;
          play_date_id?: string;
          court_id?: string;
          round_number?: number;
          partnership1_id?: string;
          partnership2_id?: string;
          team1_score?: number | null;
          team2_score?: number | null;
          winning_partnership_id?: string | null;
          status?: "waiting" | "in_progress" | "completed" | "disputed";
          recorded_by?: string | null;
          recorded_at?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
      };
      courts: {
        Row: {
          id: string;
          play_date_id: string;
          court_number: number;
          court_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          play_date_id: string;
          court_number: number;
          court_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          play_date_id?: string;
          court_number?: number;
          court_name?: string;
          created_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          play_date_id: string;
          match_id: string;
          player_id: string;
          action_type: string;
          old_values: Json;
          new_values: Json;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          play_date_id: string;
          match_id: string;
          player_id: string;
          action_type: string;
          old_values: Json;
          new_values: Json;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          play_date_id?: string;
          match_id?: string;
          player_id?: string;
          action_type?: string;
          old_values?: Json;
          new_values?: Json;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Views: {
      match_results: {
        Row: {
          player_id: string;
          player_name: string;
          play_date_id: string;
          play_date: string;
          play_date_status: string;
          games_played: number;
          wins: number;
          losses: number;
          points_for: number;
          points_against: number;
          win_percentage: number;
          point_differential: number;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Application-specific types
export type PlayDate = Database["public"]["Tables"]["play_dates"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type PlayerClaim = Database["public"]["Tables"]["player_claims"]["Row"];
export type Partnership = Database["public"]["Tables"]["partnerships"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Court = Database["public"]["Tables"]["courts"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_log"]["Row"];
export type MatchResult = Database["public"]["Views"]["match_results"]["Row"];

// Extended match result with calculated fields
export type MatchResultWithCalculations = MatchResult;

// Insert types
export type PlayDateInsert =
  Database["public"]["Tables"]["play_dates"]["Insert"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type PartnershipInsert =
  Database["public"]["Tables"]["partnerships"]["Insert"];
export type MatchInsert = Database["public"]["Tables"]["matches"]["Insert"];

// Update types
export type PlayDateUpdate =
  Database["public"]["Tables"]["play_dates"]["Update"];
export type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];
export type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];

// User roles derived from business logic
export type UserRole = "project_owner" | "organizer" | "player" | "visitor";

// Win condition types
export type WinCondition = "first_to_target" | "win_by_2";

// Match status
export type MatchStatus = "waiting" | "in_progress" | "completed" | "disputed";

// Partnership with player details
export type PartnershipWithPlayers = Partnership & {
  player1: Player;
  player2: Player;
};

// Match with partnership details
export type MatchWithPartnerships = Match & {
  partnership1: PartnershipWithPlayers;
  partnership2: PartnershipWithPlayers;
};

// Play date with related data
export type PlayDateWithDetails = PlayDate & {
  players: Player[];
  partnerships: Partnership[];
  matches: Match[];
};
