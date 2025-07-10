import { useState, useEffect, useCallback, useRef } from "react";
import {
  onConnectionStateChange,
  reconnect,
  type ConnectionState,
} from "../lib/supabase/realtime";
import { logger } from "../lib/logger";
import { monitor } from "../lib/monitoring";

export interface ConnectionMetrics {
  /** Number of connection attempts */
  connectionAttempts: number;
  /** Number of successful connections */
  successfulConnections: number;
  /** Number of failed connections */
  failedConnections: number;
  /** Total time spent disconnected (in ms) */
  totalDisconnectedTime: number;
  /** Last connection time */
  lastConnected?: Date;
  /** Last disconnection time */
  lastDisconnected?: Date;
  /** Current connection duration (in ms) */
  currentConnectionDuration?: number;
}

export interface ConnectionHistory {
  timestamp: Date;
  state: ConnectionState;
  duration?: number; // Duration in previous state
}

export interface UseConnectionStateOptions {
  /** Whether to track connection state */
  enabled?: boolean;
  /** Auto-reconnect after disconnect */
  autoReconnect?: boolean;
  /** Delay before auto-reconnect (in ms) */
  autoReconnectDelay?: number;
  /** Maximum auto-reconnect attempts */
  maxAutoReconnectAttempts?: number;
  /** Callback when connection state changes */
  onStateChange?: (state: ConnectionState, metrics: ConnectionMetrics) => void;
  /** Callback when connection is lost */
  onConnectionLost?: (metrics: ConnectionMetrics) => void;
  /** Callback when connection is restored */
  onConnectionRestored?: (metrics: ConnectionMetrics) => void;
}

export interface UseConnectionStateReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether currently connected */
  isConnected: boolean;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Connection metrics */
  metrics: ConnectionMetrics;
  /** Connection history (last 10 state changes) */
  history: ConnectionHistory[];
  /** Manually trigger reconnection */
  reconnect: () => void;
  /** Reset connection metrics */
  resetMetrics: () => void;
  /** Get connection quality score (0-100) */
  getConnectionQuality: () => number;
}

/**
 * Enhanced hook for managing connection state with metrics, history, and auto-reconnect.
 *
 * @example
 * ```tsx
 * const {
 *   connectionState,
 *   isConnected,
 *   metrics,
 *   reconnect,
 *   getConnectionQuality
 * } = useConnectionState({
 *   autoReconnect: true,
 *   onConnectionLost: (metrics) => {
 *     console.log(`Connection lost after ${metrics.currentConnectionDuration}ms`);
 *   },
 *   onConnectionRestored: (metrics) => {
 *     console.log(`Connection restored. Total downtime: ${metrics.totalDisconnectedTime}ms`);
 *   }
 * });
 *
 * // Show connection quality
 * const quality = getConnectionQuality();
 * ```
 */
export function useConnectionState({
  enabled = true,
  autoReconnect = true,
  autoReconnectDelay = 5000,
  maxAutoReconnectAttempts = 3,
  onStateChange,
  onConnectionLost,
  onConnectionRestored,
}: UseConnectionStateOptions = {}): UseConnectionStateReturn {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    totalDisconnectedTime: 0,
  });
  const [history, setHistory] = useState<ConnectionHistory[]>([]);

  const autoReconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoReconnectAttemptsRef = useRef(0);
  const stateTimestampRef = useRef<Date>(new Date());
  const connectionStartTimeRef = useRef<Date | null>(null);
  const disconnectionStartTimeRef = useRef<Date | null>(null);

  /**
   * Calculate connection quality score based on metrics
   */
  const getConnectionQuality = useCallback((): number => {
    const { connectionAttempts, successfulConnections, failedConnections } =
      metrics;

    // If no connection attempts, quality is 0
    if (connectionAttempts === 0) return 0;

    // Base score on success rate
    const successRate = successfulConnections / connectionAttempts;
    let score = successRate * 100;

    // Penalize for failed connections
    const failureRate = failedConnections / connectionAttempts;
    score -= failureRate * 30;

    // Bonus for consistent connections (low disconnect frequency)
    const recentDisconnects = history.filter(
      (h) =>
        h.state === "disconnected" &&
        Date.now() - h.timestamp.getTime() < 300000 // Last 5 minutes
    ).length;

    if (recentDisconnects === 0) score += 10;
    else if (recentDisconnects <= 2) score += 5;
    else score -= recentDisconnects * 5;

    return Math.max(0, Math.min(100, score));
  }, [metrics, history]);

  /**
   * Add entry to connection history
   */
  const addToHistory = useCallback(
    (state: ConnectionState, duration?: number) => {
      setHistory((prev) => {
        const newEntry: ConnectionHistory = {
          timestamp: new Date(),
          state,
          duration,
        };

        // Keep only last 10 entries
        const newHistory = [newEntry, ...prev].slice(0, 10);
        return newHistory;
      });
    },
    []
  );

  /**
   * Update connection metrics
   */
  const updateMetrics = useCallback(
    (newState: ConnectionState, previousState: ConnectionState) => {
      const now = new Date();
      const previousTimestamp = stateTimestampRef.current;
      const duration = now.getTime() - previousTimestamp.getTime();

      setMetrics((prev) => {
        const newMetrics = { ...prev };

        // Track state transitions
        if (newState === "connecting") {
          newMetrics.connectionAttempts++;
        } else if (newState === "connected" && previousState !== "connected") {
          newMetrics.successfulConnections++;
          newMetrics.lastConnected = now;
          connectionStartTimeRef.current = now;

          // Add disconnection duration if we were disconnected
          if (disconnectionStartTimeRef.current) {
            newMetrics.totalDisconnectedTime +=
              now.getTime() - disconnectionStartTimeRef.current.getTime();
            disconnectionStartTimeRef.current = null;
          }
        } else if (
          newState === "disconnected" &&
          previousState === "connected"
        ) {
          newMetrics.lastDisconnected = now;
          disconnectionStartTimeRef.current = now;
        } else if (newState === "error") {
          newMetrics.failedConnections++;
        }

        // Update current connection duration
        if (newState === "connected" && connectionStartTimeRef.current) {
          newMetrics.currentConnectionDuration =
            now.getTime() - connectionStartTimeRef.current.getTime();
        } else {
          newMetrics.currentConnectionDuration = undefined;
        }

        return newMetrics;
      });

      // Add to history
      addToHistory(newState, duration);

      // Call callbacks
      if (onStateChange) {
        onStateChange(newState, metrics);
      }

      if (
        newState === "disconnected" &&
        previousState === "connected" &&
        onConnectionLost
      ) {
        onConnectionLost(metrics);
      }

      if (
        newState === "connected" &&
        previousState !== "connected" &&
        onConnectionRestored
      ) {
        onConnectionRestored(metrics);
      }
    },
    [
      metrics,
      addToHistory,
      onStateChange,
      onConnectionLost,
      onConnectionRestored,
    ]
  );

  /**
   * Handle auto-reconnect logic
   */
  const handleAutoReconnect = useCallback(() => {
    if (
      !autoReconnect ||
      autoReconnectAttemptsRef.current >= maxAutoReconnectAttempts
    ) {
      return;
    }

    logger.info("Scheduling auto-reconnect", {
      component: "useConnectionState",
      action: "autoReconnect",
      metadata: {
        attempt: autoReconnectAttemptsRef.current + 1,
        maxAttempts: maxAutoReconnectAttempts,
        delay: autoReconnectDelay,
      },
    });

    autoReconnectTimeoutRef.current = setTimeout(() => {
      autoReconnectAttemptsRef.current++;
      reconnect();
    }, autoReconnectDelay);
  }, [autoReconnect, maxAutoReconnectAttempts, autoReconnectDelay]);

  /**
   * Clear auto-reconnect timeout
   */
  const clearAutoReconnect = useCallback(() => {
    if (autoReconnectTimeoutRef.current) {
      clearTimeout(autoReconnectTimeoutRef.current);
      autoReconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Reset connection metrics
   */
  const resetMetrics = useCallback(() => {
    setMetrics({
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      totalDisconnectedTime: 0,
    });
    setHistory([]);
    autoReconnectAttemptsRef.current = 0;

    logger.info("Connection metrics reset", {
      component: "useConnectionState",
      action: "resetMetrics",
    });
  }, []);

  /**
   * Manual reconnect function
   */
  const manualReconnect = useCallback(() => {
    clearAutoReconnect();
    autoReconnectAttemptsRef.current = 0;
    reconnect();

    logger.info("Manual reconnect triggered", {
      component: "useConnectionState",
      action: "manualReconnect",
    });
  }, [clearAutoReconnect]);

  /**
   * Set up connection state monitoring
   */
  useEffect(() => {
    if (!enabled) return;

    logger.info("Setting up connection state monitoring", {
      component: "useConnectionState",
      action: "setup",
    });

    const unsubscribe = onConnectionStateChange((newState) => {
      const previousState = connectionState;

      logger.debug("Connection state changed", {
        component: "useConnectionState",
        action: "stateChange",
        metadata: {
          previousState,
          newState,
        },
      });

      // Update state and metrics
      setConnectionState(newState);
      updateMetrics(newState, previousState);
      stateTimestampRef.current = new Date();

      // Handle auto-reconnect
      if (newState === "disconnected" || newState === "error") {
        handleAutoReconnect();
      } else if (newState === "connected") {
        // Reset auto-reconnect attempts on successful connection
        autoReconnectAttemptsRef.current = 0;
        clearAutoReconnect();
      }
    });

    return () => {
      logger.info("Cleaning up connection state monitoring", {
        component: "useConnectionState",
        action: "cleanup",
      });

      clearAutoReconnect();
      unsubscribe();
    };
  }, [
    enabled,
    connectionState,
    updateMetrics,
    handleAutoReconnect,
    clearAutoReconnect,
  ]);

  /**
   * Monitor connection metrics
   */
  useEffect(() => {
    if (!enabled) return;

    const quality = getConnectionQuality();

    // Record connection metrics
    monitor.recordMetric("connection_quality", quality, {
      component: "useConnectionState",
      state: connectionState,
    });

    monitor.recordMetric("connection_attempts", metrics.connectionAttempts, {
      component: "useConnectionState",
    });

    monitor.recordMetric(
      "successful_connections",
      metrics.successfulConnections,
      {
        component: "useConnectionState",
      }
    );

    monitor.recordMetric("failed_connections", metrics.failedConnections, {
      component: "useConnectionState",
    });

    if (metrics.totalDisconnectedTime > 0) {
      monitor.recordMetric(
        "total_disconnected_time",
        metrics.totalDisconnectedTime,
        {
          component: "useConnectionState",
        }
      );
    }

    // Log quality warnings
    if (quality < 50) {
      logger.warn("Poor connection quality detected", {
        component: "useConnectionState",
        action: "qualityWarning",
        metadata: { quality, metrics },
      });
    }
  }, [enabled, connectionState, metrics, getConnectionQuality]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clearAutoReconnect();
    };
  }, [clearAutoReconnect]);

  // Derived states
  const isConnected = connectionState === "connected";
  const isReconnecting = connectionState === "reconnecting";

  return {
    connectionState,
    isConnected,
    isReconnecting,
    metrics,
    history,
    reconnect: manualReconnect,
    resetMetrics,
    getConnectionQuality,
  };
}

/**
 * Hook for simple connection state without full metrics
 */
export function useSimpleConnectionState() {
  const { connectionState, isConnected, isReconnecting, reconnect } =
    useConnectionState({
      enabled: true,
      autoReconnect: true,
    });

  return {
    connectionState,
    isConnected,
    isReconnecting,
    reconnect,
  };
}

/**
 * Hook for connection state with toast notifications
 */
export function useConnectionStateWithToasts(
  showToast: (
    message: string,
    type: "success" | "error" | "warning" | "info"
  ) => void
) {
  return useConnectionState({
    enabled: true,
    autoReconnect: true,
    onConnectionLost: (_metrics) => {
      showToast("Connection lost. Attempting to reconnect...", "warning");
    },
    onConnectionRestored: (_metrics) => {
      showToast("Connection restored!", "success");
    },
  });
}
