import { useState, useEffect, useCallback } from "react";
import { useToast } from "./useToast";
import {
  getScoreHistory,
  type ScoreHistoryEntry,
} from "../lib/supabase/scores";
import { logger } from "../lib/logger";

export interface UseScoreHistoryProps {
  matchId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface ScoreHistoryState {
  history: ScoreHistoryEntry[];
  loading: boolean;
  error: string | null;
  hasHistory: boolean;
}

export interface ScoreHistoryActions {
  refreshHistory: () => Promise<void>;
  clearError: () => void;
}

export function useScoreHistory({
  matchId,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
}: UseScoreHistoryProps): ScoreHistoryState & ScoreHistoryActions {
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.debug("Fetching score history", {
        component: "useScoreHistory",
        matchId,
      });

      const historyData = await getScoreHistory(matchId);
      setHistory(historyData);

      logger.info("Score history loaded successfully", {
        component: "useScoreHistory",
        matchId,
        metadata: { entryCount: historyData.length },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load score history";
      setError(errorMessage);

      logger.error(
        "Failed to fetch score history",
        {
          component: "useScoreHistory",
          matchId,
        },
        err
      );

      showToast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [matchId, showToast]);

  const refreshHistory = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial load
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHistory, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchHistory]);

  return {
    history,
    loading,
    error,
    hasHistory: history.length > 0,
    refreshHistory,
    clearError,
  };
}

// Helper hook for formatted history display
export function useFormattedScoreHistory(matchId: string) {
  const { history, loading, error, hasHistory, refreshHistory, clearError } =
    useScoreHistory({
      matchId,
      autoRefresh: true,
    });

  const formattedHistory = history.map((entry) => ({
    ...entry,
    // Format timestamps
    formattedDate: new Date(entry.changedAt).toLocaleDateString(),
    formattedTime: new Date(entry.changedAt).toLocaleTimeString(),
    relativeTime: getRelativeTime(entry.changedAt),

    // Format score changes
    scoreChange: {
      from:
        entry.oldValues.team1Score !== null &&
        entry.oldValues.team2Score !== null
          ? `${entry.oldValues.team1Score}-${entry.oldValues.team2Score}`
          : "No score",
      to:
        entry.newValues.team1Score !== null &&
        entry.newValues.team2Score !== null
          ? `${entry.newValues.team1Score}-${entry.newValues.team2Score}`
          : "No score",
    },

    // Determine change type
    changeDescription: getChangeDescription(entry),
  }));

  return {
    history: formattedHistory,
    loading,
    error,
    hasHistory,
    refreshHistory,
    clearError,
  };
}

// Helper function to get relative time
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// Helper function to get change description
function getChangeDescription(entry: ScoreHistoryEntry): string {
  switch (entry.changeType) {
    case "score_update":
      if (
        entry.oldValues.team1Score === null &&
        entry.oldValues.team2Score === null
      ) {
        return "Score entered";
      }
      return "Score updated";
    case "score_correction":
      return "Score corrected";
    case "score_reset":
      return "Score reset";
    default:
      return "Score changed";
  }
}

// Hook for real-time score history updates
export function useRealtimeScoreHistory(matchId: string) {
  const historyHook = useScoreHistory({
    matchId,
    autoRefresh: true,
    refreshInterval: 5000, // 5 seconds for real-time feel
  });

  // Listen for real-time updates from match changes
  useEffect(() => {
    const handleMatchUpdate = () => {
      // Refresh history when match is updated
      historyHook.refreshHistory();
    };

    // This would integrate with your real-time subscription system
    // For now, we're using polling with auto-refresh

    return () => {
      // Cleanup any real-time subscriptions
    };
  }, [matchId, historyHook.refreshHistory]);

  return historyHook;
}

// Statistics hook for score history
export function useScoreHistoryStats(matchId: string) {
  const { history, loading } = useScoreHistory({ matchId });

  const stats = {
    totalChanges: history.length,
    uniqueEditors: new Set(history.map((entry) => entry.changedBy)).size,
    firstEdit:
      history.length > 0 ? history[history.length - 1].changedAt : null,
    lastEdit: history.length > 0 ? history[0].changedAt : null,
    editFrequency: history.length > 0 ? getEditFrequency(history) : 0,
  };

  return {
    stats,
    loading,
  };
}

// Helper function to calculate edit frequency
function getEditFrequency(history: ScoreHistoryEntry[]): number {
  if (history.length < 2) return 0;

  const first = new Date(history[history.length - 1].changedAt);
  const last = new Date(history[0].changedAt);
  const timeDiffHours = (last.getTime() - first.getTime()) / (1000 * 60 * 60);

  return history.length / Math.max(timeDiffHours, 1);
}
