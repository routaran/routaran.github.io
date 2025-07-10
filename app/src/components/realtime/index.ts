// Real-time components for live updates and presence tracking
export {
  LiveScoreIndicator,
  LiveScoreBadge,
  LiveScoreGrid,
  type LiveScoreIndicatorProps,
} from "./LiveScoreIndicator";

export {
  PlayerStatusIndicator,
  PlayerStatusList,
  PlayerStatusSummary,
  PlayerStatusHeaderIndicator,
  type PlayerStatusIndicatorProps,
  type PlayerStatusListProps,
  type PlayerStatusSummaryProps,
} from "./PlayerStatusIndicator";

export {
  ConnectionStatusBar,
  SimpleConnectionStatusBar,
  DetailedConnectionStatusBar,
  InlineConnectionStatus,
  type ConnectionStatusBarProps,
} from "./ConnectionStatusBar";

export {
  ConflictResolutionDialog,
  ConflictResolutionManager,
  ConflictIndicator,
  type ConflictResolutionDialogProps,
  type ConflictResolutionManagerProps,
} from "./ConflictResolutionDialog";

// Re-export hooks for convenience
export {
  usePlayerPresence,
  usePlayerPresenceStatus,
  useOnlinePlayersCount,
  type PlayerPresenceInfo,
  type UsePlayerPresenceOptions,
  type UsePlayerPresenceReturn,
} from "../../hooks/usePlayerPresence";

export {
  useConnectionState,
  useSimpleConnectionState,
  useConnectionStateWithToasts,
  type ConnectionMetrics,
  type ConnectionHistory,
  type UseConnectionStateOptions,
  type UseConnectionStateReturn,
} from "../../hooks/useConnectionState";

export {
  useConflictResolution,
  useOptimisticMatchUpdate,
  type ConflictInfo,
  type ConflictResolutionStrategy,
  type UseConflictResolutionOptions,
  type UseConflictResolutionReturn,
} from "../../hooks/useConflictResolution";

// Re-export enhanced realtime utilities
export {
  optimizedRealtimeManager,
  enhancedPresenceManager,
  subscribeToTableOptimized,
  executeOptimizedQuery,
  getPerformanceMetrics,
  clearPerformanceCache,
  getPresenceAnalytics,
  clearPresenceHistory,
  type PerformanceConfig,
  type PresenceConfig,
  OptimizedRealtimeManager,
  EnhancedPresenceManager,
} from "../../lib/supabase/realtime";
