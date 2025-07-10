/**
 * Custom hook for managing individual player statistics
 *
 * Provides comprehensive player statistics including historical data,
 * performance trends, and partnership analysis
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/useToast";
import {
  getPlayerHistoricalStats,
  getPlayerPerformanceTrends,
  getPartnershipStats,
} from "@/lib/supabase/rankings";
import {
  calculatePartnershipStats,
  calculateWinningStreak,
  PlayerRanking,
  PartnershipStats,
} from "@/lib/calculations/rankings";
import type {
  MatchResult,
  PlayDate,
  Player,
  MatchResultWithCalculations,
} from "@/types/database";

export interface PlayerPerformanceTrend {
  playDate: PlayDate;
  matchResult: MatchResultWithCalculations;
  rank?: number;
  rankChange?: number;
}

export interface PlayerStatistics {
  // Current tournament stats
  currentStats: MatchResultWithCalculations | null;
  currentRank: number | null;

  // Historical performance
  historicalStats: PlayerPerformanceTrend[];
  totalTournaments: number;
  averageWinPercentage: number;
  bestWinPercentage: number;
  worstWinPercentage: number;

  // Partnership analysis
  partnershipStats: PartnershipStats[];
  bestPartnership: PartnershipStats | null;

  // Streaks and trends
  currentWinningStreak: number;
  longestWinningStreak: number;

  // Performance metrics
  averagePointsPerGame: number;
  bestPointDifferential: number;
  consistencyRating: number;
  improvementTrend: "improving" | "declining" | "stable";
}

export interface UsePlayerStatsReturn {
  // Data
  playerStats: PlayerStatistics | null;

  // Loading states
  loading: boolean;
  refreshing: boolean;

  // Error handling
  error: string | null;

  // Actions
  refresh: () => Promise<void>;

  // Status
  lastUpdated: Date | null;
}

export function usePlayerStats(
  playerId: string,
  playDateId?: string,
  currentRankings?: PlayerRanking[]
): UsePlayerStatsReturn {
  const [playerStats, setPlayerStats] = useState<PlayerStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { addToast } = useToast();

  /**
   * Calculate comprehensive player statistics
   */
  const calculatePlayerStats = useCallback(
    async (
      historicalData: MatchResult[],
      playDates: PlayDate[]
    ): Promise<PlayerStatistics> => {
      // Convert MatchResult to MatchResultWithCalculations
      const historicalDataWithCalcs: MatchResultWithCalculations[] =
        historicalData.map((result) => ({
          ...result,
          win_percentage:
            result.games_played > 0
              ? Math.round((result.games_won / result.games_played) * 100)
              : 0,
          point_differential: result.points_for - result.points_against,
        }));
      // Get current tournament stats
      const currentStats = playDateId
        ? historicalDataWithCalcs.find(
            (result) => result.play_date_id === playDateId
          )
        : null;

      // Get current rank
      const currentRank =
        currentRankings?.find((r) => r.player_id === playerId)?.rank || null;

      // Calculate historical performance trends
      const historicalStats: PlayerPerformanceTrend[] = historicalDataWithCalcs
        .map((result) => {
          const playDate = playDates.find(
            (pd) => pd.id === result.play_date_id
          );
          return {
            playDate: playDate!,
            matchResult: result,
          };
        })
        .filter((item) => item.playDate);

      // Calculate averages and extremes
      const winPercentages = historicalDataWithCalcs.map(
        (r) => r.win_percentage
      );
      const averageWinPercentage =
        winPercentages.length > 0
          ? Math.round(
              winPercentages.reduce((sum, wp) => sum + wp, 0) /
                winPercentages.length
            )
          : 0;
      const bestWinPercentage =
        winPercentages.length > 0 ? Math.max(...winPercentages) : 0;
      const worstWinPercentage =
        winPercentages.length > 0 ? Math.min(...winPercentages) : 0;

      // Calculate partnership stats if we have current play date
      let partnershipStats: PartnershipStats[] = [];
      let bestPartnership: PartnershipStats | null = null;

      if (playDateId) {
        try {
          const partnershipData = await getPartnershipStats(playDateId);
          const playerPartnerships = partnershipData.partnerships.filter(
            (p) => p.player1_id === playerId || p.player2_id === playerId
          );

          partnershipStats = calculatePartnershipStats(
            playerPartnerships,
            partnershipData.matches
          );

          // Fill in player names
          partnershipStats.forEach((stats) => {
            const partnership = partnershipData.partnerships.find(
              (p) => p.id === stats.partnership_id
            );
            if (partnership) {
              const player1 = partnershipData.players.find(
                (p) => p.id === partnership.player1_id
              );
              const player2 = partnershipData.players.find(
                (p) => p.id === partnership.player2_id
              );
              stats.player1_name = player1?.name || "";
              stats.player2_name = player2?.name || "";
            }
          });

          bestPartnership =
            partnershipStats.length > 0
              ? partnershipStats.reduce((best, current) =>
                  current.win_percentage > best.win_percentage ? current : best
                )
              : null;
        } catch (err) {
          console.error("Error calculating partnership stats:", err);
        }
      }

      // Calculate streaks (simplified for now - would need match history)
      const currentWinningStreak = 0; // TODO: Implement with match history
      const longestWinningStreak = 0; // TODO: Implement with match history

      // Calculate performance metrics
      const totalGames = historicalDataWithCalcs.reduce(
        (sum, r) => sum + r.games_played,
        0
      );
      const totalPoints = historicalDataWithCalcs.reduce(
        (sum, r) => sum + r.points_for,
        0
      );
      const averagePointsPerGame =
        totalGames > 0 ? Math.round(totalPoints / totalGames) : 0;

      const pointDifferentials = historicalDataWithCalcs.map(
        (r) => r.point_differential
      );
      const bestPointDifferential =
        pointDifferentials.length > 0 ? Math.max(...pointDifferentials) : 0;

      // Calculate consistency rating (inverse of standard deviation of win percentages)
      const consistencyRating = calculateConsistencyRating(winPercentages);

      // Calculate improvement trend
      const improvementTrend = calculateImprovementTrend(historicalStats);

      return {
        currentStats,
        currentRank,
        historicalStats,
        totalTournaments: historicalDataWithCalcs.length,
        averageWinPercentage,
        bestWinPercentage,
        worstWinPercentage,
        partnershipStats,
        bestPartnership,
        currentWinningStreak,
        longestWinningStreak,
        averagePointsPerGame,
        bestPointDifferential,
        consistencyRating,
        improvementTrend,
      };
    },
    [playerId, playDateId, currentRankings]
  );

  /**
   * Load player statistics
   */
  const loadPlayerStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { matchResults, playDates } =
        await getPlayerHistoricalStats(playerId);
      const stats = await calculatePlayerStats(matchResults, playDates);

      setPlayerStats(stats);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading player stats:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load player statistics"
      );
      addToast({
        type: "error",
        title: "Error Loading Player Stats",
        message: "Failed to load player statistics. Please try again.",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [playerId, calculatePlayerStats, addToast]);

  /**
   * Refresh player statistics
   */
  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadPlayerStats();

      addToast({
        type: "success",
        title: "Stats Updated",
        message: "Player statistics have been refreshed.",
        duration: 3000,
      });
    } catch (err) {
      console.error("Error refreshing player stats:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to refresh player statistics"
      );
    } finally {
      setRefreshing(false);
    }
  }, [loadPlayerStats, addToast]);

  /**
   * Load initial data
   */
  useEffect(() => {
    if (playerId) {
      loadPlayerStats();
    }
  }, [playerId, loadPlayerStats]);

  /**
   * Memoized return value
   */
  const memoizedReturn = useMemo(
    () => ({
      playerStats,
      loading,
      refreshing,
      error,
      refresh,
      lastUpdated,
    }),
    [playerStats, loading, refreshing, error, refresh, lastUpdated]
  );

  return memoizedReturn;
}

/**
 * Calculate consistency rating based on win percentage variance
 */
function calculateConsistencyRating(winPercentages: number[]): number {
  if (winPercentages.length < 2) return 100;

  const mean =
    winPercentages.reduce((sum, wp) => sum + wp, 0) / winPercentages.length;
  const variance =
    winPercentages.reduce((sum, wp) => sum + Math.pow(wp - mean, 2), 0) /
    winPercentages.length;
  const standardDeviation = Math.sqrt(variance);

  // Convert to 0-100 scale where lower standard deviation = higher consistency
  const maxStdDev = 50; // Assume max possible std dev is 50%
  const consistencyScore = Math.max(
    0,
    Math.min(100, 100 - (standardDeviation / maxStdDev) * 100)
  );

  return Math.round(consistencyScore);
}

/**
 * Calculate improvement trend based on recent performance
 */
function calculateImprovementTrend(
  historicalStats: PlayerPerformanceTrend[]
): "improving" | "declining" | "stable" {
  if (historicalStats.length < 3) return "stable";

  // Sort by date (most recent first)
  const sortedStats = [...historicalStats].sort(
    (a, b) =>
      new Date(b.playDate.date).getTime() - new Date(a.playDate.date).getTime()
  );

  // Compare recent performance to earlier performance
  const recentGames = sortedStats.slice(0, Math.ceil(sortedStats.length / 2));
  const earlierGames = sortedStats.slice(Math.ceil(sortedStats.length / 2));

  const recentAverage =
    recentGames.reduce(
      (sum, stat) => sum + stat.matchResult.win_percentage,
      0
    ) / recentGames.length;

  const earlierAverage =
    earlierGames.reduce(
      (sum, stat) => sum + stat.matchResult.win_percentage,
      0
    ) / earlierGames.length;

  const improvement = recentAverage - earlierAverage;
  const threshold = 5; // 5% threshold for significant change

  if (improvement > threshold) return "improving";
  if (improvement < -threshold) return "declining";
  return "stable";
}

/**
 * Hook for comparing two players' statistics
 */
export function usePlayerComparison(
  player1Id: string,
  player2Id: string,
  playDateId?: string
) {
  const player1Stats = usePlayerStats(player1Id, playDateId);
  const player2Stats = usePlayerStats(player2Id, playDateId);

  const comparison = useMemo(() => {
    if (!player1Stats.playerStats || !player2Stats.playerStats) {
      return null;
    }

    const p1 = player1Stats.playerStats;
    const p2 = player2Stats.playerStats;

    return {
      winPercentage: {
        player1: p1.currentStats?.win_percentage || 0,
        player2: p2.currentStats?.win_percentage || 0,
        winner:
          (p1.currentStats?.win_percentage || 0) >
          (p2.currentStats?.win_percentage || 0)
            ? 1
            : 2,
      },
      pointDifferential: {
        player1: p1.currentStats?.point_differential || 0,
        player2: p2.currentStats?.point_differential || 0,
        winner:
          (p1.currentStats?.point_differential || 0) >
          (p2.currentStats?.point_differential || 0)
            ? 1
            : 2,
      },
      consistency: {
        player1: p1.consistencyRating,
        player2: p2.consistencyRating,
        winner: p1.consistencyRating > p2.consistencyRating ? 1 : 2,
      },
      experience: {
        player1: p1.totalTournaments,
        player2: p2.totalTournaments,
        winner: p1.totalTournaments > p2.totalTournaments ? 1 : 2,
      },
    };
  }, [player1Stats.playerStats, player2Stats.playerStats]);

  return {
    player1Stats,
    player2Stats,
    comparison,
    loading: player1Stats.loading || player2Stats.loading,
    error: player1Stats.error || player2Stats.error,
  };
}
