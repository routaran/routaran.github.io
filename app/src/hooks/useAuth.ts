import { useEffect, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { auth, db } from "../lib/supabase";
import { logger } from "../lib/logger";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const {
    user,
    session,
    player,
    isLoading,
    isInitialized,
    setAuth,
    setPlayer,
    setLoading,
    setInitialized,
    reset,
    isAuthenticated,
  } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        logger.info("Initializing auth state", {
          component: "useAuth",
          action: "initialize",
        });

        // Get current session
        const { session: currentSession, error } = await auth.getSession();

        if (error) {
          logger.error(
            "Failed to get session",
            {
              component: "useAuth",
              action: "initialize",
            },
            error
          );
          throw error;
        }

        if (!mounted) return;

        if (currentSession) {
          setAuth(currentSession.user, currentSession);

          // Load player data if authenticated
          await loadPlayerData(currentSession.user);
        } else {
          setAuth(null, null);
        }
      } catch (error) {
        logger.error(
          "Auth initialization failed",
          {
            component: "useAuth",
            action: "initialize",
          },
          error as Error
        );

        if (mounted) {
          reset();
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      logger.info("Auth state changed", {
        component: "useAuth",
        action: "authStateChange",
        metadata: { event, hasSession: !!currentSession },
      });

      if (event === "SIGNED_IN" && currentSession) {
        setAuth(currentSession.user, currentSession);
        await loadPlayerData(currentSession.user);
      } else if (event === "SIGNED_OUT") {
        reset();
      } else if (event === "TOKEN_REFRESHED" && currentSession) {
        setAuth(currentSession.user, currentSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setAuth, setPlayer, setLoading, setInitialized, reset]);

  // Load player data for authenticated user
  const loadPlayerData = async (authUser: User) => {
    try {
      logger.info("Loading player data", {
        component: "useAuth",
        action: "loadPlayerData",
        userId: authUser.id,
      });

      // First find the player claim for this auth user
      const { data: claim, error: claimError } = await db.supabase
        .from("player_claims")
        .select("player_id")
        .eq("auth_user_id", authUser.id)
        .single();

      if (claimError) {
        if (claimError.code === "PGRST116") {
          // No player claimed yet
          logger.info("No player claimed for user", {
            component: "useAuth",
            action: "loadPlayerData",
            userId: authUser.id,
          });
          setPlayer(null);
          return;
        }
        throw claimError;
      }

      // Now get the player data
      const { data, error } = await db.supabase
        .from("players")
        .select("*")
        .eq("id", claim.player_id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No player claimed yet
          logger.info("No player claimed for user", {
            component: "useAuth",
            action: "loadPlayerData",
            userId: authUser.id,
          });
          setPlayer(null);
          return;
        }
        throw error;
      }

      logger.info("Player data loaded", {
        component: "useAuth",
        action: "loadPlayerData",
        userId: authUser.id,
        metadata: {
          playerName: data.name,
          isProjectOwner: data.project_owner,
        },
      });

      setPlayer(data);
    } catch (error) {
      logger.error(
        "Failed to load player data",
        {
          component: "useAuth",
          action: "loadPlayerData",
          userId: authUser.id,
        },
        error as Error
      );
      setPlayer(null);
    }
  };

  // Check if user has claimed a player
  const checkPlayerClaim = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await db.supabase
        .from("player_claims")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch (error) {
      logger.error(
        "Failed to check player claim",
        {
          component: "useAuth",
          action: "checkPlayerClaim",
          userId: user.id,
        },
        error as Error
      );
      return false;
    }
  }, [user]);

  // Claim a player
  const claimPlayer = useCallback(
    async (playerId: string) => {
      if (!user) {
        throw new Error("Must be logged in to claim a player");
      }

      logger.info("Attempting to claim player", {
        component: "useAuth",
        action: "claimPlayer",
        userId: user.id,
        metadata: { playerId },
      });

      // Call the RPC function to safely claim a player
      const { data, error } = await db.supabase.rpc("claim_player", {
        p_player_id: playerId,
        p_user_id: user.id,
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
        component: "useAuth",
        action: "claimPlayer",
        userId: user.id,
        metadata: { playerId },
      });

      // Reload player data
      await loadPlayerData(user);
    },
    [user, setPlayer]
  );

  // Sign out
  const signOut = useCallback(async () => {
    logger.info("Signing out", {
      component: "useAuth",
      action: "signOut",
      userId: user?.id,
    });

    const { error } = await auth.signOut();

    if (error) {
      logger.error(
        "Sign out failed",
        {
          component: "useAuth",
          action: "signOut",
          userId: user?.id,
        },
        error
      );
      throw error;
    }

    reset();
  }, [user, reset]);

  return {
    user,
    session,
    player,
    isLoading,
    isInitialized,
    isAuthenticated: isAuthenticated(),
    checkPlayerClaim,
    claimPlayer,
    signOut,
  };
}
