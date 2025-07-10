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
          name: string;
          date: string;
          win_condition: "first-to-target" | "win-by-2";
          target_score: number;
          court_count: number;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          date: string;
          win_condition?: "first-to-target" | "win-by-2";
          target_score?: number;
          court_count?: number;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          date?: string;
          win_condition?: "first-to-target" | "win-by-2";
          target_score?: number;
          court_count?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      players: {
        Row: {
          id: string;
          play_date_id: string;
          name: string;
          email: string;
          project_owner: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          play_date_id: string;
          name: string;
          email: string;
          project_owner?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          play_date_id?: string;
          name?: string;
          email?: string;
          project_owner?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_claims: {
        Row: {
          id: string;
          player_id: string;
          auth_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          auth_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          auth_user_id?: string;
          created_at?: string;
        };
      };
      partnerships: {
        Row: {
          id: string;
          play_date_id: string;
          player1_id: string;
          player2_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          play_date_id: string;
          player1_id: string;
          player2_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          play_date_id?: string;
          player1_id?: string;
          player2_id?: string;
          created_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          play_date_id: string;
          partnership1_id: string;
          partnership2_id: string;
          team1_score: number | null;
          team2_score: number | null;
          court_number: number;
          round_number: number;
          scheduled_at: string | null;
          version: number;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          play_date_id: string;
          partnership1_id: string;
          partnership2_id: string;
          team1_score?: number | null;
          team2_score?: number | null;
          court_number: number;
          round_number: number;
          scheduled_at?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          play_date_id?: string;
          partnership1_id?: string;
          partnership2_id?: string;
          team1_score?: number | null;
          team2_score?: number | null;
          court_number?: number;
          round_number?: number;
          scheduled_at?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
      };
      courts: {
        Row: {
          id: string;
          play_date_id: string;
          number: number;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          play_date_id: string;
          number: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          play_date_id?: string;
          number?: number;
          name?: string;
          created_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          match_id: string;
          change_type: string;
          old_values: Json;
          new_values: Json;
          changed_by: string;
          changed_at: string;
          ip_address: string | null;
          user_agent: string | null;
          reason: string | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          change_type: string;
          old_values: Json;
          new_values: Json;
          changed_by: string;
          changed_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          reason?: string | null;
        };
        Update: {
          id?: string;
          match_id?: string;
          change_type?: string;
          old_values?: Json;
          new_values?: Json;
          changed_by?: string;
          changed_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          reason?: string | null;
        };
      };
    };
    Views: {
      match_results: {
        Row: {
          play_date_id: string;
          player_id: string;
          player_name: string;
          games_played: number;
          games_won: number;
          games_lost: number;
          points_for: number;
          points_against: number;
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
export type MatchResultWithCalculations = MatchResult & {
  win_percentage: number;
  point_differential: number;
};

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
export type WinCondition = "first-to-target" | "win-by-2";

// Match status
export type MatchStatus = "pending" | "in_progress" | "completed";

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
// Additional type exports
export interface MatchResult {
  match_id: string;
  play_date_id: string;
  winning_partnership_id: string | null;
  player_id: string;
  team_number: number;
  team_score: number | null;
  opponent_score: number | null;
}
