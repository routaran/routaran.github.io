import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PlayDate, Match, Player, MatchResult } from "../types/database";
import { logger } from "../lib/logger";
import { monitor } from "../lib/monitoring";

interface AppState {
  // Current play date state
  currentPlayDate: PlayDate | null;
  players: Player[];
  matches: Match[];
  rankings: MatchResult[];

  // UI state
  isLoading: boolean;
  error: string | null;
  selectedMatch: Match | null;

  // Real-time connection state
  isConnected: boolean;
  lastUpdate: Date | null;

  // Actions
  setCurrentPlayDate: (playDate: PlayDate | null) => void;
  setPlayers: (players: Player[]) => void;
  setMatches: (matches: Match[]) => void;
  setRankings: (rankings: MatchResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedMatch: (match: Match | null) => void;
  setConnected: (connected: boolean) => void;
  updateLastUpdate: () => void;
  reset: () => void;

  // Computed
  getMatchById: (id: string) => Match | undefined;
  getPlayerById: (id: string) => Player | undefined;
  getMatchesForRound: (round: number) => Match[];
  getCurrentRound: () => number;
  getTotalRounds: () => number;
  getCompletedMatches: () => Match[];
  getPendingMatches: () => Match[];
}

const initialState = {
  currentPlayDate: null,
  players: [],
  matches: [],
  rankings: [],
  isLoading: false,
  error: null,
  selectedMatch: null,
  isConnected: false,
  lastUpdate: null,
};

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setCurrentPlayDate: (currentPlayDate) => {
        logger.info("Current play date updated", {
          component: "appStore",
          action: "setCurrentPlayDate",
          playDateId: currentPlayDate?.id,
          metadata: {
            hasPlayDate: !!currentPlayDate,
            playDateName: currentPlayDate?.name,
            date: currentPlayDate?.date,
          },
        });
        set({ currentPlayDate }, false, "setCurrentPlayDate");
      },

      setPlayers: (players) => {
        logger.info("Players updated", {
          component: "appStore",
          action: "setPlayers",
          playDateId: get().currentPlayDate?.id,
          metadata: {
            playerCount: players.length,
            playerNames: players.map((p) => p.name),
          },
        });
        set({ players }, false, "setPlayers");
      },

      setMatches: (matches) => {
        const completedMatches = matches.filter(
          (m) => m.team1_score !== null && m.team2_score !== null
        );
        logger.info("Matches updated", {
          component: "appStore",
          action: "setMatches",
          playDateId: get().currentPlayDate?.id,
          metadata: {
            totalMatches: matches.length,
            completedMatches: completedMatches.length,
            pendingMatches: matches.length - completedMatches.length,
          },
        });
        set({ matches }, false, "setMatches");
      },

      setRankings: (rankings) => {
        logger.info("Rankings updated", {
          component: "appStore",
          action: "setRankings",
          playDateId: get().currentPlayDate?.id,
          metadata: {
            playerCount: rankings.length,
            topPlayer: rankings[0]?.player_name,
          },
        });
        set({ rankings }, false, "setRankings");
      },

      setLoading: (isLoading) => {
        set({ isLoading }, false, "setLoading");
      },

      setError: (error) => {
        if (error) {
          logger.error("App error set", {
            component: "appStore",
            action: "setError",
            playDateId: get().currentPlayDate?.id,
            metadata: { errorMessage: error },
          });
          monitor.recordError(new Error(error), { component: "appStore" });
        }
        set({ error }, false, "setError");
      },

      setSelectedMatch: (selectedMatch) => {
        set({ selectedMatch }, false, "setSelectedMatch");
      },

      setConnected: (isConnected) => {
        const status = isConnected ? "connected" : "disconnected";
        logger.info(`Connection status changed to ${status}`, {
          component: "appStore",
          action: "setConnected",
          playDateId: get().currentPlayDate?.id,
          metadata: { isConnected },
        });
        monitor.updateConnectionStatus(status, { component: "appStore" });
        set({ isConnected }, false, "setConnected");
      },

      updateLastUpdate: () => {
        const now = new Date();
        logger.debug("Last update timestamp updated", {
          component: "appStore",
          action: "updateLastUpdate",
          playDateId: get().currentPlayDate?.id,
          metadata: { timestamp: now.toISOString() },
        });
        set({ lastUpdate: now }, false, "updateLastUpdate");
      },

      reset: () => {
        logger.info("App store reset", {
          component: "appStore",
          action: "reset",
          playDateId: get().currentPlayDate?.id,
        });
        set(initialState, false, "reset");
      },

      // Computed properties
      getMatchById: (id: string) => {
        return get().matches.find((match) => match.id === id);
      },

      getPlayerById: (id: string) => {
        return get().players.find((player) => player.id === id);
      },

      getMatchesForRound: (round: number) => {
        return get().matches.filter((match) => match.round_number === round);
      },

      getCurrentRound: () => {
        const matches = get().matches;
        if (matches.length === 0) return 1;

        // Find the first round with incomplete matches
        const rounds = [...new Set(matches.map((m) => m.round_number))].sort();

        for (const round of rounds) {
          const roundMatches = matches.filter((m) => m.round_number === round);
          const incompleteMatches = roundMatches.filter(
            (m) => m.team1_score === null || m.team2_score === null
          );

          if (incompleteMatches.length > 0) {
            return round;
          }
        }

        // All matches complete, return last round + 1
        return Math.max(...rounds) + 1;
      },

      getTotalRounds: () => {
        const matches = get().matches;
        if (matches.length === 0) return 0;
        return Math.max(...matches.map((m) => m.round_number));
      },

      getCompletedMatches: () => {
        return get().matches.filter(
          (match) => match.team1_score !== null && match.team2_score !== null
        );
      },

      getPendingMatches: () => {
        return get().matches.filter(
          (match) => match.team1_score === null || match.team2_score === null
        );
      },
    }),
    {
      name: "app-store",
    }
  )
);
