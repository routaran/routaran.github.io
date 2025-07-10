/**
 * Custom hook for managing rankings data and real-time updates
 *
 * Provides comprehensive ranking calculations with automatic updates
 * when scores change, optimized for performance and user experience
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/useToast";
import {
  getRankingsData,
  subscribeToRankingsUpdates,
  getTournamentCompletionStats,
  refreshMatchResultsView,
} from "@/lib/supabase/rankings";
import {
  calculateRankings,
  calculateTournamentSummary,
  calculateRankingChanges,
  type PlayerRanking,
  type TournamentSummary,
} from "../lib/calculations/rankings";
import type { MatchResult } from "../types/database";

export interface UseRankingsReturn {
  // Data
  rankings: PlayerRanking[];
  tournamentSummary: TournamentSummary | null;
  rankingChanges: Map<string, number>;

  // Loading states
  loading: boolean;
  refreshing: boolean;

  // Error handling
  error: string | null;

  // Actions
  refresh: () => Promise<void>;

  // Real-time status
  isConnected: boolean;
  lastUpdated: Date | null;
}

export function useRankings(playDateId: string): UseRankingsReturn {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [tournamentSummary, setTournamentSummary] =
    useState<TournamentSummary | null>(null);
  const [rankingChanges, setRankingChanges] = useState<Map<string, number>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { addToast } = useToast();

  // Store previous rankings for change detection
  const [previousRankings, setPreviousRankings] = useState<PlayerRanking[]>([]);

  /**
   * Calculate rankings from match results data
   */
  const calculateRankingsFromData = useCallback(
    async (matchResults: MatchResult[]) => {
      try {
        // Get additional data needed for head-to-head calculations
        const rankingsData = await getRankingsData(playDateId);

        // Calculate new rankings
        const newRankings = calculateRankings(matchResults, playDateId, {
          matches: rankingsData.matches,
          partnerships: rankingsData.partnerships,
        });

        // Calculate tournament summary
        const summary = calculateTournamentSummary(
          rankingsData.matches,
          newRankings
        );

        // Calculate ranking changes
        const changes = calculateRankingChanges(previousRankings, newRankings);

        // Update state
        setRankings(newRankings);
        setTournamentSummary(summary);
        setRankingChanges(changes);
        setLastUpdated(new Date());
        setError(null);

        // Store current rankings as previous for next comparison
        setPreviousRankings(newRankings);

        return newRankings;
      } catch (err) {
        console.error("Error calculating rankings:", err);
        setError(
          err instanceof Error ? err.message : "Failed to calculate rankings"
        );
        throw err;
      }
    },
    [playDateId, previousRankings]
  );

  /**
   * Load initial rankings data
   */
  const loadRankings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getRankingsData(playDateId);
      await calculateRankingsFromData(data.matchResults);
    } catch (err) {
      console.error("Error loading rankings:", err);
      setError(err instanceof Error ? err.message : "Failed to load rankings");
      addToast({
        type: "error",
        title: "Error Loading Rankings",
        message: "Failed to load tournament rankings. Please try again.",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [playDateId, calculateRankingsFromData, addToast]);

  /**
   * Refresh rankings data
   */
  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Refresh materialized view to ensure latest data
      await refreshMatchResultsView();

      // Reload rankings
      await loadRankings();

      addToast({
        type: "success",
        title: "Rankings Updated",
        message: "Tournament rankings have been refreshed.",
        duration: 3000,
      });
    } catch (err) {
      console.error("Error refreshing rankings:", err);
      setError(
        err instanceof Error ? err.message : "Failed to refresh rankings"
      );
      addToast({
        type: "error",
        title: "Refresh Failed",
        message: "Failed to refresh rankings. Please try again.",
        duration: 5000,
      });
    } finally {
      setRefreshing(false);
    }
  }, [loadRankings, addToast]);

  /**
   * Handle real-time updates
   */
  const handleRankingsUpdate = useCallback(
    async (matchResults: MatchResult[]) => {
      try {
        await calculateRankingsFromData(matchResults);
        setIsConnected(true);
      } catch (err) {
        console.error("Error handling rankings update:", err);
        setError(
          err instanceof Error ? err.message : "Failed to update rankings"
        );
      }
    },
    [calculateRankingsFromData]
  );

  /**
   * Handle real-time errors
   */
  const handleRankingsError = useCallback(
    (err: Error) => {
      console.error("Real-time rankings error:", err);
      setError(err.message);
      setIsConnected(false);

      addToast({
        type: "error",
        title: "Connection Error",
        message:
          "Lost connection to rankings updates. Some data may be outdated.",
        duration: 5000,
      });
    },
    [addToast]
  );

  /**
   * Set up real-time subscriptions
   */
  useEffect(() => {
    if (!playDateId) return;

    const unsubscribe = subscribeToRankingsUpdates(
      playDateId,
      handleRankingsUpdate,
      handleRankingsError
    );

    setIsConnected(true);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [playDateId, handleRankingsUpdate, handleRankingsError]);

  /**
   * Load initial data
   */
  useEffect(() => {
    if (playDateId) {
      loadRankings();
    }
  }, [playDateId, loadRankings]);

  /**
   * Memoized values for performance
   */
  const memoizedReturn = useMemo(
    () => ({
      rankings,
      tournamentSummary,
      rankingChanges,
      loading,
      refreshing,
      error,
      refresh,
      isConnected,
      lastUpdated,
    }),
    [
      rankings,
      tournamentSummary,
      rankingChanges,
      loading,
      refreshing,
      error,
      refresh,
      isConnected,
      lastUpdated,
    ]
  );

  return memoizedReturn;
}

/**
 * Hook for getting ranking changes notifications
 */
export function useRankingChanges(rankings: PlayerRanking[]) {
  const [previousRankings, setPreviousRankings] = useState<PlayerRanking[]>([]);
  const [significantChanges, setSignificantChanges] = useState<
    {
      playerId: string;
      playerName: string;
      oldRank: number;
      newRank: number;
      change: number;
    }[]
  >([]);

  useEffect(() => {
    if (rankings.length === 0) return;

    const changes = calculateRankingChanges(previousRankings, rankings);
    const significant = Array.from(changes.entries())
      .filter(([_, change]) => Math.abs(change) >= 2) // Significant change threshold
      .map(([playerId, change]) => {
        const player = rankings.find((r) => r.player_id === playerId);
        const oldRank = player ? player.rank - change : 0;

        return {
          playerId,
          playerName: player?.player_name || "",
          oldRank,
          newRank: player?.rank || 0,
          change,
        };
      });

    setSignificantChanges(significant);
    setPreviousRankings([...rankings]);
  }, [rankings, previousRankings]);

  return significantChanges;
}

/**
 * Hook for tournament completion tracking
 */
export function useTournamentProgress(playDateId: string) {
  const [progress, setProgress] = useState({
    totalMatches: 0,
    completedMatches: 0,
    completionPercentage: 0,
    remainingMatches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await getTournamentCompletionStats(playDateId);
      setProgress(stats);
      setError(null);
    } catch (err) {
      console.error("Error loading tournament progress:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load tournament progress"
      );
    } finally {
      setLoading(false);
    }
  }, [playDateId]);

  useEffect(() => {
    if (playDateId) {
      loadProgress();
    }
  }, [playDateId, loadProgress]);

  return {
    progress,
    loading,
    error,
    refresh: loadProgress,
  };
}
