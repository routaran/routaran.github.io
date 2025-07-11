import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { logger } from "../logger";
import { monitor } from "../monitoring";
import type { Database } from "../../types/database";

// Type definitions for realtime events
export type TableName = keyof Database["public"]["Tables"];
export type ViewName = keyof Database["public"]["Views"];

export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE" | "*";

export type RealtimePayload<T extends TableName> =
  RealtimePostgresChangesPayload<Database["public"]["Tables"][T]["Row"]>;

export type RealtimeCallback<T extends TableName> = (
  payload: RealtimePayload<T>
) => void | Promise<void>;

// Connection states
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

// Subscription configuration
export interface SubscriptionConfig<T extends TableName> {
  table: T;
  event?: RealtimeEventType;
  filter?: string;
  callback: RealtimeCallback<T>;
  onError?: (error: Error) => void;
}

// Reconnection configuration
interface ReconnectionConfig {
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  maxRetries: number;
}

const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  multiplier: 2, // Exponential backoff
  maxRetries: 10, // Maximum retry attempts
};

/**
 * Manages Supabase Realtime subscriptions with automatic reconnection,
 * connection status tracking, and type-safe event handling.
 */
export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, SubscriptionConfig<any>> = new Map();
  private connectionState: ConnectionState = "disconnected";
  private connectionStateListeners: Set<(state: ConnectionState) => void> =
    new Set();
  private reconnectionConfig: ReconnectionConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;

  constructor(reconnectionConfig: Partial<ReconnectionConfig> = {}) {
    this.reconnectionConfig = {
      ...DEFAULT_RECONNECTION_CONFIG,
      ...reconnectionConfig,
    };
    this.setupGlobalErrorHandling();
  }

  /**
   * Set up global error handling for realtime connections
   */
  private setupGlobalErrorHandling(): void {
    // Monitor WebSocket errors globally
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        logger.info("Network connection restored", {
          component: "realtime",
          action: "networkOnline",
        });
        this.handleReconnection();
      });

      window.addEventListener("offline", () => {
        logger.warn("Network connection lost", {
          component: "realtime",
          action: "networkOffline",
        });
        this.updateConnectionState("disconnected");
      });
    }
  }

  /**
   * Subscribe to a table's realtime changes
   */
  public subscribe<T extends TableName>(
    subscriptionId: string,
    config: SubscriptionConfig<T>
  ): () => void {
    logger.info("Creating realtime subscription", {
      component: "realtime",
      action: "subscribe",
      metadata: {
        subscriptionId,
        table: config.table,
        event: config.event || "*",
        filter: config.filter,
      },
    });

    // Store subscription config for reconnection
    this.subscriptions.set(subscriptionId, config);

    // Create or reuse channel
    const channelName = this.getChannelName(config);
    let channel = this.channels.get(channelName);

    if (!channel) {
      channel = this.createChannel(channelName);
      this.channels.set(channelName, channel);
    }

    // Set up the subscription
    const subscription = channel.on(
      "postgres_changes",
      {
        event: config.event || "*",
        schema: "public",
        table: config.table,
        filter: config.filter,
      },
      (payload: RealtimePayload<T>) => {
        logger.debug("Realtime event received", {
          component: "realtime",
          action: "eventReceived",
          metadata: {
            subscriptionId,
            table: config.table,
            event: payload.eventType,
            recordId: (payload.new as any)?.id || (payload.old as any)?.id,
          },
        });

        // Record latency if available
        if (payload.commit_timestamp) {
          const latency =
            Date.now() - new Date(payload.commit_timestamp).getTime();
          monitor.recordLatency(latency, {
            component: "realtime",
            table: config.table,
            event: payload.eventType,
          });

          // Log warning if latency exceeds 1 second (NFR-08)
          if (latency > 1000) {
            logger.warn("Realtime latency exceeded 1 second", {
              component: "realtime",
              action: "highLatency",
              metadata: {
                latency,
                table: config.table,
                event: payload.eventType,
              },
            });
          }
        }

        // Execute callback with error handling
        try {
          const result = config.callback(payload);
          if (result instanceof Promise) {
            result.catch((error) => {
              this.handleCallbackError(subscriptionId, error, config);
            });
          }
        } catch (error) {
          this.handleCallbackError(subscriptionId, error as Error, config);
        }
      }
    );

    // Subscribe the channel if not already subscribed
    if (channel.state !== "subscribed" && channel.state !== "subscribing") {
      this.subscribeChannel(channel, channelName);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionId);
    };
  }

  /**
   * Unsubscribe from a specific subscription
   */
  public unsubscribe(subscriptionId: string): void {
    logger.info("Removing realtime subscription", {
      component: "realtime",
      action: "unsubscribe",
      metadata: { subscriptionId },
    });

    const config = this.subscriptions.get(subscriptionId);
    if (!config) {
      logger.warn("Attempted to unsubscribe from non-existent subscription", {
        component: "realtime",
        action: "unsubscribeError",
        metadata: { subscriptionId },
      });
      return;
    }

    this.subscriptions.delete(subscriptionId);

    // Check if any other subscriptions use the same channel
    const channelName = this.getChannelName(config);
    const hasOtherSubscriptions = Array.from(this.subscriptions.values()).some(
      (otherConfig) => this.getChannelName(otherConfig) === channelName
    );

    // If no other subscriptions use this channel, remove it
    if (!hasOtherSubscriptions) {
      const channel = this.channels.get(channelName);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(channelName);
        logger.info("Removed unused channel", {
          component: "realtime",
          action: "channelRemoved",
          metadata: { channelName },
        });
      }
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  public unsubscribeAll(): void {
    logger.info("Removing all realtime subscriptions", {
      component: "realtime",
      action: "unsubscribeAll",
      metadata: { count: this.subscriptions.size },
    });

    // Clear all subscriptions
    this.subscriptions.clear();

    // Remove all channels
    for (const [channelName, channel] of this.channels) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();

    this.updateConnectionState("disconnected");
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Subscribe to connection state changes
   */
  public onConnectionStateChange(
    callback: (state: ConnectionState) => void
  ): () => void {
    this.connectionStateListeners.add(callback);

    // Immediately call with current state
    callback(this.connectionState);

    // Return unsubscribe function
    return () => {
      this.connectionStateListeners.delete(callback);
    };
  }

  /**
   * Manually trigger reconnection attempt
   */
  public reconnect(): void {
    logger.info("Manual reconnection requested", {
      component: "realtime",
      action: "manualReconnect",
    });
    this.handleReconnection();
  }

  /**
   * Create a new channel with error handling
   */
  private createChannel(channelName: string): RealtimeChannel {
    // Create public channel - RLS policies on tables handle access control
    // Using public channels avoids auth token injection issues
    const channel = supabase.channel(channelName, {
      config: {
        // Broadcast self to receive own messages (useful for optimistic updates)
        broadcast: { self: true },
      },
    });

    // Log channel creation
    logger.info("Creating realtime channel", {
      component: "realtime",
      action: "createChannel",
      metadata: {
        channelName,
        channelState: channel.state,
      },
    });

    // Set up channel-level error handling
    channel.on("system", { event: "error" }, (payload) => {
      logger.error("Channel error", {
        component: "realtime",
        action: "channelError",
        metadata: { channelName, error: payload },
      });
      this.updateConnectionState("error");
      this.scheduleReconnection();
    });

    channel.on("system", { event: "close" }, () => {
      logger.info("Channel closed", {
        component: "realtime",
        action: "channelClosed",
        metadata: { channelName },
      });
      this.updateConnectionState("disconnected");
      this.scheduleReconnection();
    });

    return channel;
  }

  /**
   * Subscribe a channel with connection tracking
   */
  private async subscribeChannel(
    channel: RealtimeChannel,
    channelName: string
  ): Promise<void> {
    try {
      this.updateConnectionState("connecting");

      // Log current auth state before subscribing
      const {
        data: { session },
      } = await supabase.auth.getSession();
      logger.info("Subscribing channel with auth state", {
        component: "realtime",
        action: "preSubscribe",
        metadata: {
          channelName,
          hasSession: !!session,
          userId: session?.user?.id,
        },
      });

      const result = await channel.subscribe((status, error) => {
        logger.info("Channel subscription status changed", {
          component: "realtime",
          action: "subscriptionStatus",
          metadata: {
            channelName,
            status,
            error: error?.message || null,
            errorDetails: error || null,
            errorCode: (error as any)?.code || null,
            channelState: channel.state,
            channelTopic: channel.topic,
            // Log which tables are being subscribed to
            subscriptions:
              channel._events?.postgres_changes?.map((sub: any) => ({
                table: sub.table,
                event: sub.event,
                filter: sub.filter,
              })) || [],
          },
        });

        if (status === "SUBSCRIBED") {
          this.updateConnectionState("connected");
          this.reconnectAttempts = 0; // Reset on successful connection
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          // Check if this is an authentication error
          const isAuthError =
            error?.message?.includes("JWT") ||
            error?.message?.includes("token") ||
            error?.message?.includes("unauthorized") ||
            (error as any)?.code === "PGRST301";

          if (isAuthError) {
            logger.error("Authentication error in realtime channel", {
              component: "realtime",
              action: "authError",
              metadata: {
                channelName,
                errorMessage: error?.message,
                errorCode: (error as any)?.code,
              },
            });

            // For auth errors, we should reconnect immediately to get new token
            this.updateConnectionState("error");
            this.handleReconnection();
          } else {
            this.updateConnectionState("error");
            this.scheduleReconnection();
          }
        } else if (status === "TIMED_OUT") {
          logger.error("Channel subscription timed out", {
            component: "realtime",
            action: "subscriptionTimeout",
            metadata: { channelName },
          });
          this.updateConnectionState("error");
          this.scheduleReconnection();
        }
      });

      if (result === "error") {
        throw new Error("Failed to subscribe to channel");
      }
    } catch (error) {
      logger.error(
        "Failed to subscribe channel",
        {
          component: "realtime",
          action: "subscribeError",
          metadata: { channelName },
        },
        error as Error
      );

      this.updateConnectionState("error");
      this.scheduleReconnection();
    }
  }

  /**
   * Handle callback errors
   */
  private handleCallbackError<T extends TableName>(
    subscriptionId: string,
    error: Error,
    config: SubscriptionConfig<T>
  ): void {
    logger.error(
      "Realtime callback error",
      {
        component: "realtime",
        action: "callbackError",
        metadata: {
          subscriptionId,
          table: config.table,
          error: error.message,
        },
      },
      error
    );

    monitor.recordError(error, {
      component: "realtime",
      subscriptionId,
      table: config.table,
    });

    if (config.onError) {
      config.onError(error);
    }
  }

  /**
   * Generate channel name from subscription config
   */
  private getChannelName<T extends TableName>(
    config: SubscriptionConfig<T>
  ): string {
    const parts = ["realtime", config.table];
    if (config.filter) {
      // Create a hash of the filter for uniqueness
      const filterHash = this.hashString(config.filter);
      parts.push(filterHash);
    }
    return parts.join(":");
  }

  /**
   * Simple string hash for channel naming
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Update connection state and notify listeners
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;

    const previousState = this.connectionState;
    this.connectionState = state;

    logger.info("Connection state changed", {
      component: "realtime",
      action: "connectionStateChange",
      metadata: { previousState, newState: state },
    });

    // Notify all listeners
    for (const listener of this.connectionStateListeners) {
      try {
        listener(state);
      } catch (error) {
        logger.error(
          "Connection state listener error",
          {
            component: "realtime",
            action: "listenerError",
          },
          error as Error
        );
      }
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(): void {
    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check if we've exceeded max retries
    if (this.reconnectAttempts >= this.reconnectionConfig.maxRetries) {
      logger.error("Max reconnection attempts reached", {
        component: "realtime",
        action: "maxRetriesExceeded",
        metadata: { attempts: this.reconnectAttempts },
      });
      this.updateConnectionState("error");
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectionConfig.initialDelay *
        Math.pow(this.reconnectionConfig.multiplier, this.reconnectAttempts),
      this.reconnectionConfig.maxDelay
    );

    logger.info("Scheduling reconnection", {
      component: "realtime",
      action: "scheduleReconnect",
      metadata: {
        attempt: this.reconnectAttempts + 1,
        delay,
      },
    });

    this.updateConnectionState("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.handleReconnection();
    }, delay);

    this.reconnectAttempts++;
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnection(): Promise<void> {
    logger.info("Attempting reconnection", {
      component: "realtime",
      action: "reconnect",
      metadata: {
        attempt: this.reconnectAttempts,
        subscriptions: this.subscriptions.size,
      },
    });

    try {
      // Remove all existing channels
      for (const [channelName, channel] of this.channels) {
        await supabase.removeChannel(channel);
      }
      this.channels.clear();

      // Recreate all subscriptions
      const subscriptionEntries = Array.from(this.subscriptions.entries());
      this.subscriptions.clear();

      for (const [subscriptionId, config] of subscriptionEntries) {
        this.subscribe(subscriptionId, config);
      }

      logger.info("Reconnection successful", {
        component: "realtime",
        action: "reconnectSuccess",
        metadata: {
          subscriptions: subscriptionEntries.length,
        },
      });
    } catch (error) {
      logger.error(
        "Reconnection failed",
        {
          component: "realtime",
          action: "reconnectError",
        },
        error as Error
      );

      this.scheduleReconnection();
    }
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

// Log when realtime manager is created
console.log("Created RealtimeManager singleton instance");

// Export convenience functions
export const subscribeToTable = <T extends TableName>(
  subscriptionId: string,
  config: SubscriptionConfig<T>
) => realtimeManager.subscribe(subscriptionId, config);

export const unsubscribe = (subscriptionId: string) =>
  realtimeManager.unsubscribe(subscriptionId);

export const unsubscribeAll = () => realtimeManager.unsubscribeAll();

export const getConnectionState = () => realtimeManager.getConnectionState();

export const onConnectionStateChange = (
  callback: (state: ConnectionState) => void
) => realtimeManager.onConnectionStateChange(callback);

export const reconnect = () => realtimeManager.reconnect();

// Performance optimization utilities
export interface PerformanceConfig {
  /** Enable subscription batching */
  enableBatching?: boolean;
  /** Batch delay in milliseconds */
  batchDelay?: number;
  /** Maximum batch size */
  maxBatchSize?: number;
  /** Enable query deduplication */
  enableDeduplication?: boolean;
  /** Memory usage threshold (MB) */
  memoryThreshold?: number;
  /** Enable compression for large payloads */
  enableCompression?: boolean;
}

const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableBatching: true,
  batchDelay: 50,
  maxBatchSize: 10,
  enableDeduplication: true,
  memoryThreshold: 50,
  enableCompression: false,
};

/**
 * Performance-optimized realtime manager
 */
export class OptimizedRealtimeManager extends RealtimeManager {
  private performanceConfig: PerformanceConfig;
  private subscriptionBatch: Map<string, SubscriptionConfig<any>[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private queryCache: Map<string, any> = new Map();
  private memoryUsage = 0;
  private compressionEnabled = false;

  constructor(
    reconnectionConfig: Partial<ReconnectionConfig> = {},
    performanceConfig: Partial<PerformanceConfig> = {}
  ) {
    super(reconnectionConfig);
    this.performanceConfig = {
      ...DEFAULT_PERFORMANCE_CONFIG,
      ...performanceConfig,
    };
    this.setupPerformanceMonitoring();
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor memory usage
    if (typeof window !== "undefined" && "performance" in window) {
      setInterval(() => {
        this.checkMemoryUsage();
      }, 30000); // Check every 30 seconds
    }

    // Enable compression if supported
    if (typeof window !== "undefined" && "CompressionStream" in window) {
      this.compressionEnabled =
        this.performanceConfig.enableCompression || false;
    }
  }

  /**
   * Check memory usage and cleanup if needed
   */
  private checkMemoryUsage(): void {
    if (typeof window !== "undefined" && "performance" in window) {
      const memory = (window.performance as any).memory;
      if (memory) {
        this.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB

        if (this.memoryUsage > (this.performanceConfig.memoryThreshold || 50)) {
          logger.warn("High memory usage detected, cleaning up", {
            component: "optimizedRealtime",
            action: "memoryCleanup",
            metadata: { memoryUsage: this.memoryUsage },
          });
          this.performMemoryCleanup();
        }
      }
    }
  }

  /**
   * Perform memory cleanup
   */
  private performMemoryCleanup(): void {
    // Clear query cache
    this.queryCache.clear();

    // Force garbage collection if available
    if (typeof window !== "undefined" && "gc" in window) {
      (window as any).gc();
    }

    logger.info("Memory cleanup completed", {
      component: "optimizedRealtime",
      action: "memoryCleanupComplete",
    });
  }

  /**
   * Subscribe with performance optimizations
   */
  public subscribe<T extends TableName>(
    subscriptionId: string,
    config: SubscriptionConfig<T>
  ): () => void {
    if (this.performanceConfig.enableBatching) {
      return this.batchedSubscribe(subscriptionId, config);
    }
    return super.subscribe(subscriptionId, config);
  }

  /**
   * Batched subscription for performance
   */
  private batchedSubscribe<T extends TableName>(
    subscriptionId: string,
    config: SubscriptionConfig<T>
  ): () => void {
    const channelName = this.getChannelName(config);

    // Add to batch
    if (!this.subscriptionBatch.has(channelName)) {
      this.subscriptionBatch.set(channelName, []);
    }
    this.subscriptionBatch
      .get(channelName)!
      .push({ ...config, subscriptionId });

    // Process batch if full or start timer
    const batch = this.subscriptionBatch.get(channelName)!;
    if (batch.length >= (this.performanceConfig.maxBatchSize || 10)) {
      this.processBatch(channelName);
    } else {
      this.scheduleBatchProcessing(channelName);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionId);
    };
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(channelName: string): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processBatch(channelName);
      this.batchTimer = null;
    }, this.performanceConfig.batchDelay || 50);
  }

  /**
   * Process subscription batch
   */
  private processBatch(channelName: string): void {
    const batch = this.subscriptionBatch.get(channelName);
    if (!batch || batch.length === 0) return;

    logger.info("Processing subscription batch", {
      component: "optimizedRealtime",
      action: "processBatch",
      metadata: { channelName, batchSize: batch.length },
    });

    // Process each subscription in batch
    batch.forEach((config) => {
      const { subscriptionId, ...subscriptionConfig } = config as any;
      super.subscribe(subscriptionId, subscriptionConfig);
    });

    // Clear batch
    this.subscriptionBatch.delete(channelName);
  }

  /**
   * Deduplicated query execution
   */
  public async executeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttl: number = 5000
  ): Promise<T> {
    if (!this.performanceConfig.enableDeduplication) {
      return queryFn();
    }

    const cached = this.queryCache.get(queryKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      logger.debug("Query cache hit", {
        component: "optimizedRealtime",
        action: "cacheHit",
        metadata: { queryKey },
      });
      return cached.data;
    }

    const data = await queryFn();
    this.queryCache.set(queryKey, {
      data,
      timestamp: Date.now(),
    });

    logger.debug("Query executed and cached", {
      component: "optimizedRealtime",
      action: "queryExecuted",
      metadata: { queryKey },
    });

    return data;
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    return {
      memoryUsage: this.memoryUsage,
      cacheSize: this.queryCache.size,
      batchCount: this.subscriptionBatch.size,
      compressionEnabled: this.compressionEnabled,
      config: this.performanceConfig,
    };
  }

  /**
   * Clear performance cache
   */
  public clearCache(): void {
    this.queryCache.clear();
    logger.info("Performance cache cleared", {
      component: "optimizedRealtime",
      action: "cacheCleared",
    });
  }
}

// Export optimized manager instance
export const optimizedRealtimeManager = new OptimizedRealtimeManager();

// Enhanced presence tracking utilities
export interface PresenceConfig {
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
  /** Timeout to consider offline (in milliseconds) */
  offlineTimeout?: number;
  /** Enable presence persistence */
  enablePersistence?: boolean;
  /** Maximum presence history length */
  maxHistoryLength?: number;
}

const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  heartbeatInterval: 30000,
  offlineTimeout: 60000,
  enablePersistence: false,
  maxHistoryLength: 100,
};

/**
 * Enhanced presence manager with persistence and analytics
 */
export class EnhancedPresenceManager {
  private config: PresenceConfig;
  private presenceHistory: Array<{
    playerId: string;
    timestamp: Date;
    action: "join" | "leave" | "update";
    data: any;
  }> = [];
  private persistenceKey = "pickleball_presence_history";

  constructor(config: Partial<PresenceConfig> = {}) {
    this.config = { ...DEFAULT_PRESENCE_CONFIG, ...config };
    this.loadPersistedHistory();
  }

  /**
   * Load persisted presence history
   */
  private loadPersistedHistory(): void {
    if (!this.config.enablePersistence || typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(this.persistenceKey);
      if (stored) {
        const history = JSON.parse(stored);
        this.presenceHistory = history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (error) {
      logger.warn(
        "Failed to load presence history",
        {
          component: "enhancedPresence",
          action: "loadHistory",
        },
        error as Error
      );
    }
  }

  /**
   * Save presence history
   */
  private savePresenceHistory(): void {
    if (!this.config.enablePersistence || typeof window === "undefined") return;

    try {
      localStorage.setItem(
        this.persistenceKey,
        JSON.stringify(this.presenceHistory)
      );
    } catch (error) {
      logger.warn(
        "Failed to save presence history",
        {
          component: "enhancedPresence",
          action: "saveHistory",
        },
        error as Error
      );
    }
  }

  /**
   * Record presence event
   */
  public recordPresenceEvent(
    playerId: string,
    action: "join" | "leave" | "update",
    data: any
  ): void {
    const event = {
      playerId,
      timestamp: new Date(),
      action,
      data,
    };

    this.presenceHistory.unshift(event);

    // Limit history length
    if (this.presenceHistory.length > (this.config.maxHistoryLength || 100)) {
      this.presenceHistory = this.presenceHistory.slice(
        0,
        this.config.maxHistoryLength
      );
    }

    this.savePresenceHistory();

    logger.debug("Presence event recorded", {
      component: "enhancedPresence",
      action: "recordEvent",
      metadata: { playerId, action, dataKeys: Object.keys(data) },
    });
  }

  /**
   * Get presence analytics
   */
  public getPresenceAnalytics(playDateId: string) {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEvents = this.presenceHistory.filter(
      (event) =>
        event.timestamp >= last24Hours && event.data.play_date_id === playDateId
    );

    const uniquePlayers = new Set(recentEvents.map((event) => event.playerId));
    const joinEvents = recentEvents.filter((event) => event.action === "join");
    const leaveEvents = recentEvents.filter(
      (event) => event.action === "leave"
    );

    return {
      totalEvents: recentEvents.length,
      uniquePlayers: uniquePlayers.size,
      joinEvents: joinEvents.length,
      leaveEvents: leaveEvents.length,
      avgSessionDuration: this.calculateAvgSessionDuration(recentEvents),
      peakOnlineTime: this.findPeakOnlineTime(recentEvents),
    };
  }

  /**
   * Calculate average session duration
   */
  private calculateAvgSessionDuration(
    events: typeof this.presenceHistory
  ): number {
    const sessions = new Map<string, { join: Date; leave?: Date }>();

    events.forEach((event) => {
      if (event.action === "join") {
        sessions.set(event.playerId, { join: event.timestamp });
      } else if (event.action === "leave") {
        const session = sessions.get(event.playerId);
        if (session) {
          session.leave = event.timestamp;
        }
      }
    });

    const completedSessions = Array.from(sessions.values()).filter(
      (session) => session.leave
    );

    if (completedSessions.length === 0) return 0;

    const totalDuration = completedSessions.reduce(
      (sum, session) =>
        sum + (session.leave!.getTime() - session.join.getTime()),
      0
    );

    return totalDuration / completedSessions.length;
  }

  /**
   * Find peak online time
   */
  private findPeakOnlineTime(events: typeof this.presenceHistory): Date | null {
    const hourlyActivity = new Map<string, number>();

    events.forEach((event) => {
      const hour = event.timestamp.toISOString().slice(0, 13);
      hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
    });

    if (hourlyActivity.size === 0) return null;

    const peakHour = Array.from(hourlyActivity.entries()).sort(
      ([, a], [, b]) => b - a
    )[0][0];

    return new Date(peakHour + ":00:00Z");
  }

  /**
   * Clear presence history
   */
  public clearHistory(): void {
    this.presenceHistory = [];
    this.savePresenceHistory();

    logger.info("Presence history cleared", {
      component: "enhancedPresence",
      action: "clearHistory",
    });
  }

  /**
   * Get presence config
   */
  public getConfig(): PresenceConfig {
    return { ...this.config };
  }
}

// Export enhanced presence manager
export const enhancedPresenceManager = new EnhancedPresenceManager();

// Export enhanced convenience functions
export const subscribeToTableOptimized = <T extends TableName>(
  subscriptionId: string,
  config: SubscriptionConfig<T>
) => optimizedRealtimeManager.subscribe(subscriptionId, config);

export const executeOptimizedQuery = <T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  ttl?: number
) => optimizedRealtimeManager.executeQuery(queryKey, queryFn, ttl);

export const getPerformanceMetrics = () =>
  optimizedRealtimeManager.getPerformanceMetrics();

export const clearPerformanceCache = () =>
  optimizedRealtimeManager.clearCache();

export const getPresenceAnalytics = (playDateId: string) =>
  enhancedPresenceManager.getPresenceAnalytics(playDateId);

export const clearPresenceHistory = () =>
  enhancedPresenceManager.clearHistory();
