import { supabase } from "../supabase";
import { logger } from "../logger";
import type { Player } from "../../types/database";

/**
 * Authentication utilities for Supabase Auth
 */

/**
 * Send magic link to user's email
 */
export async function sendMagicLink(email: string) {
  try {
    logger.info("Sending magic link", {
      component: "auth",
      action: "sendMagicLink",
      metadata: { email },
    });

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      logger.error(
        "Failed to send magic link",
        {
          component: "auth",
          action: "sendMagicLink",
          metadata: { email, errorCode: error.message },
        },
        error
      );
      throw error;
    }

    logger.info("Magic link sent successfully", {
      component: "auth",
      action: "sendMagicLink",
      metadata: { email },
    });

    return { data, error: null };
  } catch (error) {
    logger.error(
      "Unexpected error sending magic link",
      {
        component: "auth",
        action: "sendMagicLink",
        metadata: { email },
      },
      error as Error
    );
    return { data: null, error: error as Error };
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    logger.info("Signing out user", {
      component: "auth",
      action: "signOut",
    });

    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error(
        "Sign out failed",
        {
          component: "auth",
          action: "signOut",
        },
        error
      );
      throw error;
    }

    logger.info("Sign out successful", {
      component: "auth",
      action: "signOut",
    });

    return { error: null };
  } catch (error) {
    logger.error(
      "Unexpected error during sign out",
      {
        component: "auth",
        action: "signOut",
      },
      error as Error
    );
    return { error: error as Error };
  }
}

/**
 * Get the current session
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      logger.error(
        "Failed to get session",
        {
          component: "auth",
          action: "getSession",
        },
        error
      );
      throw error;
    }

    return { session: data.session, error: null };
  } catch (error) {
    logger.error(
      "Unexpected error getting session",
      {
        component: "auth",
        action: "getSession",
      },
      error as Error
    );
    return { session: null, error: error as Error };
  }
}

/**
 * Get the current user
 */
export async function getUser() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      logger.error(
        "Failed to get user",
        {
          component: "auth",
          action: "getUser",
        },
        error
      );
      throw error;
    }

    return { user: data.user, error: null };
  } catch (error) {
    logger.error(
      "Unexpected error getting user",
      {
        component: "auth",
        action: "getUser",
      },
      error as Error
    );
    return { user: null, error: error as Error };
  }
}

/**
 * Get player by user ID
 */
export async function getPlayerByUserId(
  userId: string
): Promise<Player | null> {
  try {
    logger.debug("Fetching player by user ID", {
      component: "auth",
      action: "getPlayerByUserId",
      userId,
    });

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("claim_user_id", userId)
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
        component: "auth",
        action: "getPlayerByUserId",
        userId,
      },
      error as Error
    );
    throw error;
  }
}

/**
 * Get unclaimed players
 */
export async function getUnclaimedPlayers(): Promise<Player[]> {
  try {
    logger.debug("Fetching unclaimed players", {
      component: "auth",
      action: "getUnclaimedPlayers",
    });

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .is("claim_user_id", null)
      .order("name");

    if (error) throw error;

    logger.info("Fetched unclaimed players", {
      component: "auth",
      action: "getUnclaimedPlayers",
      metadata: { count: data.length },
    });

    return data;
  } catch (error) {
    logger.error(
      "Failed to get unclaimed players",
      {
        component: "auth",
        action: "getUnclaimedPlayers",
      },
      error as Error
    );
    throw error;
  }
}

/**
 * Claim a player
 */
export async function claimPlayer(
  playerId: string,
  userId: string
): Promise<boolean> {
  try {
    logger.info("Attempting to claim player", {
      component: "auth",
      action: "claimPlayer",
      userId,
      metadata: { playerId },
    });

    // Call the RPC function to safely claim a player
    const { data, error } = await supabase.rpc("claim_player", {
      p_player_id: playerId,
      p_user_id: userId,
    });

    if (error) {
      if (error.code === "P0001") {
        // Custom error from our RPC function
        throw new Error(error.message);
      }
      throw error;
    }

    if (!data) {
      throw new Error("Failed to claim player");
    }

    logger.info("Player claimed successfully", {
      component: "auth",
      action: "claimPlayer",
      userId,
      metadata: { playerId },
    });

    return true;
  } catch (error) {
    logger.error(
      "Failed to claim player",
      {
        component: "auth",
        action: "claimPlayer",
        userId,
        metadata: { playerId },
      },
      error as Error
    );
    throw error;
  }
}

/**
 * Handle auth callback (for magic link redirect)
 */
export async function handleAuthCallback(): Promise<{ error: Error | null }> {
  try {
    logger.info("Handling auth callback", {
      component: "auth",
      action: "handleAuthCallback",
    });

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      window.location.search
    );

    if (error) throw error;

    if (!data.session) {
      throw new Error("No session found in callback");
    }

    logger.info("Auth callback handled successfully", {
      component: "auth",
      action: "handleAuthCallback",
      userId: data.session.user.id,
    });

    return { error: null };
  } catch (error) {
    logger.error(
      "Failed to handle auth callback",
      {
        component: "auth",
        action: "handleAuthCallback",
      },
      error as Error
    );
    return { error: error as Error };
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get redirect URL for magic link
 */
export function getRedirectUrl(): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/auth/callback`;
}
