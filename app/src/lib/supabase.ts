import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { logger } from "./logger";
import { monitor } from "./monitoring";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "implicit", // Use implicit flow for magic links (PKCE doesn't work well with SPA redirects)
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Optimize for real-time performance
    },
  },
});

// Auth helpers
export const auth = {
  signIn: async (email: string) => {
    return await logger.time(
      "auth.signIn",
      async () => {
        logger.info("Attempting sign in", {
          component: "supabase",
          action: "signIn",
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
            "Sign in failed",
            {
              component: "supabase",
              action: "signIn",
              metadata: { email, errorCode: error.message },
            },
            error
          );
          monitor.recordError(error, { component: "supabase" });
        } else {
          logger.info("Sign in successful", {
            component: "supabase",
            action: "signIn",
            metadata: { email },
          });
        }

        return { data, error };
      },
      { component: "supabase" }
    );
  },

  signOut: async () => {
    return await logger.time(
      "auth.signOut",
      async () => {
        logger.info("Attempting sign out", {
          component: "supabase",
          action: "signOut",
        });

        const { error } = await supabase.auth.signOut();

        if (error) {
          logger.error(
            "Sign out failed",
            {
              component: "supabase",
              action: "signOut",
            },
            error
          );
          monitor.recordError(error, { component: "supabase" });
        } else {
          logger.info("Sign out successful", {
            component: "supabase",
            action: "signOut",
          });
        }

        return { error };
      },
      { component: "supabase" }
    );
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers with error handling
export const db = {
  // Play Dates
  getPlayDates: async () => {
    return await monitor.measureApiCall(
      "getPlayDates",
      async () => {
        logger.debug("Fetching play dates", {
          component: "supabase",
          action: "getPlayDates",
        });

        const { data, error } = await supabase
          .from("play_dates")
          .select("*")
          .order("date", { ascending: false });

        if (error) {
          logger.error(
            "Failed to fetch play dates",
            {
              component: "supabase",
              action: "getPlayDates",
            },
            error
          );
          throw new Error(`Failed to fetch play dates: ${error.message}`);
        }

        logger.info("Successfully fetched play dates", {
          component: "supabase",
          action: "getPlayDates",
          metadata: { count: data.length },
        });

        return data;
      },
      { component: "supabase" }
    );
  },

  getPlayDate: async (id: string) => {
    return await monitor.measureApiCall(
      "getPlayDate",
      async () => {
        logger.debug("Fetching play date", {
          component: "supabase",
          action: "getPlayDate",
          playDateId: id,
        });

        const { data, error } = await supabase
          .from("play_dates")
          .select(
            `
          *,
          players (*),
          partnerships (*),
          matches (*)
        `
          )
          .eq("id", id)
          .single();

        if (error) {
          logger.error(
            "Failed to fetch play date",
            {
              component: "supabase",
              action: "getPlayDate",
              playDateId: id,
            },
            error
          );
          throw new Error(`Failed to fetch play date: ${error.message}`);
        }

        logger.info("Successfully fetched play date", {
          component: "supabase",
          action: "getPlayDate",
          playDateId: id,
          metadata: {
            playDateName: data.name,
            playerCount: data.players?.length || 0,
            matchCount: data.matches?.length || 0,
          },
        });

        return data;
      },
      { component: "supabase", playDateId: id }
    );
  },

  // Players
  getPlayers: async (playDateId: string) => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("play_date_id", playDateId)
      .order("name");

    if (error) throw new Error(`Failed to fetch players: ${error.message}`);
    return data;
  },

  // Matches
  getMatches: async (playDateId: string) => {
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        partnership1:partnerships!partnership1_id (*),
        partnership2:partnerships!partnership2_id (*)
      `
      )
      .eq("play_date_id", playDateId)
      .order("round_number", { ascending: true })
      .order("court_number", { ascending: true });

    if (error) throw new Error(`Failed to fetch matches: ${error.message}`);
    return data;
  },

  updateMatchScore: async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    currentVersion: number
  ) => {
    return await monitor.measureApiCall(
      "updateMatchScore",
      async () => {
        logger.info("Updating match score", {
          component: "supabase",
          action: "updateMatchScore",
          matchId,
          metadata: {
            team1Score,
            team2Score,
            version: currentVersion,
          },
        });

        const { data, error } = await supabase
          .from("matches")
          .update({
            team1_score: team1Score,
            team2_score: team2Score,
            version: currentVersion + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchId)
          .eq("version", currentVersion) // Optimistic locking
          .select()
          .single();

        if (error) {
          logger.error(
            "Failed to update match score",
            {
              component: "supabase",
              action: "updateMatchScore",
              matchId,
              metadata: {
                team1Score,
                team2Score,
                version: currentVersion,
                errorCode: error.code,
              },
            },
            error
          );

          if (error.code === "PGRST116") {
            throw new Error(
              "Match was updated by another user. Please refresh and try again."
            );
          }
          throw new Error(`Failed to update match score: ${error.message}`);
        }

        logger.info("Successfully updated match score", {
          component: "supabase",
          action: "updateMatchScore",
          matchId,
          metadata: {
            team1Score,
            team2Score,
            newVersion: currentVersion + 1,
          },
        });

        return data;
      },
      { component: "supabase", matchId }
    );
  },

  // Enhanced score-specific functions
  updateMatchScoreWithValidation: async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    currentVersion: number,
    playDateId: string,
    reason?: string
  ) => {
    // This function will be imported from the new scores module
    const { updateMatchScore } = await import("./supabase/scores");
    const { validateMatchScore, DEFAULT_SCORE_CONFIG } = await import(
      "./validation/scoreValidation"
    );

    // Get play date for validation config
    const playDate = await db.getPlayDate(playDateId);
    const validationConfig = {
      ...DEFAULT_SCORE_CONFIG,
      winCondition: playDate.win_condition,
      targetScore: playDate.target_score,
    };

    return await updateMatchScore(
      {
        matchId,
        team1Score,
        team2Score,
        currentVersion,
        playDateId,
        reason,
      },
      validationConfig
    );
  },

  // Rankings
  getRankings: async (playDateId: string) => {
    const { data, error } = await supabase
      .from("match_results")
      .select("*")
      .eq("play_date_id", playDateId)
      .order("games_won", { ascending: false })
      .order("points_for", { ascending: false });

    if (error) throw new Error(`Failed to fetch rankings: ${error.message}`);
    return data;
  },
};

// Real-time subscriptions
export const realtime = {
  subscribeToMatches: (
    playDateId: string,
    callback: (payload: any) => void
  ) => {
    logger.info("Subscribing to matches", {
      component: "supabase",
      action: "subscribeToMatches",
      playDateId,
    });

    const enhancedCallback = (payload: any) => {
      logger.debug("Match update received", {
        component: "supabase",
        action: "matchUpdate",
        playDateId,
        metadata: {
          event: payload.eventType,
          matchId: payload.new?.id || payload.old?.id,
        },
      });

      // Record latency if we have timing info
      if (payload.commit_timestamp) {
        const latency =
          Date.now() - new Date(payload.commit_timestamp).getTime();
        monitor.recordLatency(latency, { component: "supabase", playDateId });
      }

      callback(payload);
    };

    return supabase
      .channel(`matches:${playDateId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `play_date_id=eq.${playDateId}`,
        },
        enhancedCallback
      )
      .subscribe();
  },

  subscribeToRankings: (
    playDateId: string,
    callback: (payload: any) => void
  ) => {
    logger.info("Subscribing to rankings", {
      component: "supabase",
      action: "subscribeToRankings",
      playDateId,
    });

    const enhancedCallback = (payload: any) => {
      logger.debug("Rankings update received", {
        component: "supabase",
        action: "rankingsUpdate",
        playDateId,
        metadata: {
          event: payload.eventType,
          playerId: payload.new?.player_id || payload.old?.player_id,
        },
      });

      // Record latency if we have timing info
      if (payload.commit_timestamp) {
        const latency =
          Date.now() - new Date(payload.commit_timestamp).getTime();
        monitor.recordLatency(latency, { component: "supabase", playDateId });
      }

      callback(payload);
    };

    return supabase
      .channel(`rankings:${playDateId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
          filter: `play_date_id=eq.${playDateId}`,
        },
        enhancedCallback
      )
      .subscribe();
  },

  unsubscribe: (channel: any) => {
    logger.info("Unsubscribing from channel", {
      component: "supabase",
      action: "unsubscribe",
      metadata: { channelTopic: channel?.topic },
    });
    return supabase.removeChannel(channel);
  },
};

export default supabase;
