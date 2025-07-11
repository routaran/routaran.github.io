import { supabase } from "./supabase";
import { logger } from "./logger";
import type { Player } from "../types/database";

/**
 * Auth service for managing authentication and player claims
 */
export const authService = {
  /**
   * Create the player claim RPC function in the database
   * This should be called during database setup/migration
   */
  createClaimPlayerFunction: `
    CREATE OR REPLACE FUNCTION claim_player(
      p_player_id UUID,
      p_user_id UUID
    ) RETURNS BOOLEAN AS $$
    DECLARE
      v_existing_claim UUID;
      v_player_exists BOOLEAN;
    BEGIN
      -- Check if player exists
      SELECT EXISTS(
        SELECT 1 FROM players WHERE id = p_player_id
      ) INTO v_player_exists;
      
      IF NOT v_player_exists THEN
        RAISE EXCEPTION 'Player not found' USING ERRCODE = 'P0001';
      END IF;
      
      -- Check if player is already claimed
      SELECT claim_user_id INTO v_existing_claim
      FROM players
      WHERE id = p_player_id;
      
      IF v_existing_claim IS NOT NULL THEN
        RAISE EXCEPTION 'This player has already been claimed' USING ERRCODE = 'P0001';
      END IF;
      
      -- Check if user already has a claim
      SELECT id INTO v_existing_claim
      FROM players
      WHERE claim_user_id = p_user_id;
      
      IF v_existing_claim IS NOT NULL THEN
        RAISE EXCEPTION 'You have already claimed a player' USING ERRCODE = 'P0001';
      END IF;
      
      -- Update the player with the claim
      UPDATE players
      SET 
        claim_user_id = p_user_id,
        updated_at = NOW()
      WHERE id = p_player_id;
      
      -- Log the claim in audit_log
      INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        user_id,
        changes
      ) VALUES (
        'players',
        p_player_id,
        'claim',
        p_user_id,
        jsonb_build_object(
          'claim_user_id', jsonb_build_object(
            'old', NULL,
            'new', p_user_id
          )
        )
      );
      
      RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `,

  /**
   * Get player by user ID
   */
  async getPlayerByUserId(userId: string): Promise<Player | null> {
    try {
      logger.debug("Fetching player by user ID", {
        component: "authService",
        action: "getPlayerByUserId",
        userId,
      });

      // First find the player claim for this auth user
      const { data: claim, error: claimError } = await supabase
        .from("player_claims")
        .select("player_id")
        .eq("auth_user_id", userId)
        .single();

      if (claimError) {
        if (claimError.code === "PGRST116") {
          // No rows found
          return null;
        }
        throw claimError;
      }

      // Now get the player data
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", claim.player_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      logger.error(
        "Failed to get player by user ID",
        {
          component: "authService",
          action: "getPlayerByUserId",
          userId,
        },
        error as Error
      );
      throw error;
    }
  },

  /**
   * Get unclaimed players
   */
  async getUnclaimedPlayers(): Promise<Player[]> {
    try {
      logger.debug("Fetching unclaimed players", {
        component: "authService",
        action: "getUnclaimedPlayers",
      });

      // First get all players
      const { data: allPlayers, error: playersError } = await supabase
        .from("players")
        .select("*")
        .order("name");

      if (playersError) throw playersError;

      // Then get all claimed player IDs
      const { data: claims, error: claimsError } = await supabase
        .from("player_claims")
        .select("player_id");

      if (claimsError) throw claimsError;

      // Filter out claimed players
      const claimedPlayerIds = new Set(claims?.map((c) => c.player_id) || []);
      const data = allPlayers?.filter((p) => !claimedPlayerIds.has(p.id)) || [];

      logger.info("Fetched unclaimed players", {
        component: "authService",
        action: "getUnclaimedPlayers",
        metadata: { count: data.length },
      });

      return data;
    } catch (error) {
      logger.error(
        "Failed to get unclaimed players",
        {
          component: "authService",
          action: "getUnclaimedPlayers",
        },
        error as Error
      );
      throw error;
    }
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Get redirect URL for magic link
   */
  getRedirectUrl(): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth/callback`;
  },

  /**
   * Handle auth callback (for magic link redirect)
   */
  async handleAuthCallback(): Promise<{ error: Error | null }> {
    try {
      logger.info("Handling auth callback", {
        component: "authService",
        action: "handleAuthCallback",
      });

      // Get the session from the URL
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      if (!data.session) {
        throw new Error("No session found in callback");
      }

      logger.info("Auth callback handled successfully", {
        component: "authService",
        action: "handleAuthCallback",
        userId: data.session.user.id,
      });

      return { error: null };
    } catch (error) {
      logger.error(
        "Failed to handle auth callback",
        {
          component: "authService",
          action: "handleAuthCallback",
        },
        error as Error
      );
      return { error: error as Error };
    }
  },

  /**
   * Check if user has required permissions
   */
  async checkPermissions(
    action: "create_play_date" | "manage_play_date" | "update_score",
    context?: {
      playDateId?: string;
      matchId?: string;
    }
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const player = await this.getPlayerByUserId(user.id);
      if (!player) return false;

      switch (action) {
        case "create_play_date":
          // Only project owners and organizers can create play dates
          return player.is_project_owner === true;

        case "manage_play_date":
          // Project owners can manage any play date
          if (player.is_project_owner) return true;

          // Organizers can only manage their own play dates
          if (context?.playDateId) {
            const { data } = await supabase
              .from("play_dates")
              .select("organizer_id")
              .eq("id", context.playDateId)
              .single();

            return data?.organizer_id === player.id;
          }
          return false;

        case "update_score":
          // Project owners can update any score
          if (player.is_project_owner) return true;

          // Players can only update scores for matches they're in
          if (context?.matchId) {
            const { data } = await supabase
              .from("matches")
              .select(
                `
                partnership1:partnerships!partnership1_id (player1_id, player2_id),
                partnership2:partnerships!partnership2_id (player1_id, player2_id)
              `
              )
              .eq("id", context.matchId)
              .single();

            if (data) {
              const playerIds = [
                data.partnership1.player1_id,
                data.partnership1.player2_id,
                data.partnership2.player1_id,
                data.partnership2.player2_id,
              ];
              return playerIds.includes(player.id);
            }
          }
          return false;

        default:
          return false;
      }
    } catch (error) {
      logger.error(
        "Failed to check permissions",
        {
          component: "authService",
          action: "checkPermissions",
          metadata: { action, context },
        },
        error as Error
      );
      return false;
    }
  },
};
