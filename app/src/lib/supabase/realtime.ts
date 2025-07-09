import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { logger } from '../logger';
import { monitor } from '../monitoring';
import type { Database } from '../../types/database';

// Type definitions for realtime events
export type TableName = keyof Database['public']['Tables'];
export type ViewName = keyof Database['public']['Views'];

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export type RealtimePayload<T extends TableName> = RealtimePostgresChangesPayload<
  Database['public']['Tables'][T]['Row']
>;

export type RealtimeCallback<T extends TableName> = (
  payload: RealtimePayload<T>
) => void | Promise<void>;

// Connection states
export type ConnectionState = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

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
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  multiplier: 2,           // Exponential backoff
  maxRetries: 10,          // Maximum retry attempts
};

/**
 * Manages Supabase Realtime subscriptions with automatic reconnection,
 * connection status tracking, and type-safe event handling.
 */
export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, SubscriptionConfig<any>> = new Map();
  private connectionState: ConnectionState = 'disconnected';
  private connectionStateListeners: Set<(state: ConnectionState) => void> = new Set();
  private reconnectionConfig: ReconnectionConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;

  constructor(reconnectionConfig: Partial<ReconnectionConfig> = {}) {
    this.reconnectionConfig = { ...DEFAULT_RECONNECTION_CONFIG, ...reconnectionConfig };
    this.setupGlobalErrorHandling();
  }

  /**
   * Set up global error handling for realtime connections
   */
  private setupGlobalErrorHandling(): void {
    // Monitor WebSocket errors globally
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        logger.info('Network connection restored', {
          component: 'realtime',
          action: 'networkOnline',
        });
        this.handleReconnection();
      });

      window.addEventListener('offline', () => {
        logger.warn('Network connection lost', {
          component: 'realtime',
          action: 'networkOffline',
        });
        this.updateConnectionState('disconnected');
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
    logger.info('Creating realtime subscription', {
      component: 'realtime',
      action: 'subscribe',
      metadata: {
        subscriptionId,
        table: config.table,
        event: config.event || '*',
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
      'postgres_changes',
      {
        event: config.event || '*',
        schema: 'public',
        table: config.table,
        filter: config.filter,
      },
      (payload: RealtimePayload<T>) => {
        logger.debug('Realtime event received', {
          component: 'realtime',
          action: 'eventReceived',
          metadata: {
            subscriptionId,
            table: config.table,
            event: payload.eventType,
            recordId: (payload.new as any)?.id || (payload.old as any)?.id,
          },
        });

        // Record latency if available
        if (payload.commit_timestamp) {
          const latency = Date.now() - new Date(payload.commit_timestamp).getTime();
          monitor.recordLatency(latency, {
            component: 'realtime',
            table: config.table,
            event: payload.eventType,
          });

          // Log warning if latency exceeds 1 second (NFR-08)
          if (latency > 1000) {
            logger.warn('Realtime latency exceeded 1 second', {
              component: 'realtime',
              action: 'highLatency',
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
    if (channel.state !== 'subscribed' && channel.state !== 'subscribing') {
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
    logger.info('Removing realtime subscription', {
      component: 'realtime',
      action: 'unsubscribe',
      metadata: { subscriptionId },
    });

    const config = this.subscriptions.get(subscriptionId);
    if (!config) {
      logger.warn('Attempted to unsubscribe from non-existent subscription', {
        component: 'realtime',
        action: 'unsubscribeError',
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
        logger.info('Removed unused channel', {
          component: 'realtime',
          action: 'channelRemoved',
          metadata: { channelName },
        });
      }
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  public unsubscribeAll(): void {
    logger.info('Removing all realtime subscriptions', {
      component: 'realtime',
      action: 'unsubscribeAll',
      metadata: { count: this.subscriptions.size },
    });

    // Clear all subscriptions
    this.subscriptions.clear();

    // Remove all channels
    for (const [channelName, channel] of this.channels) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();

    this.updateConnectionState('disconnected');
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
    logger.info('Manual reconnection requested', {
      component: 'realtime',
      action: 'manualReconnect',
    });
    this.handleReconnection();
  }

  /**
   * Create a new channel with error handling
   */
  private createChannel(channelName: string): RealtimeChannel {
    const channel = supabase.channel(channelName);

    // Set up channel-level error handling
    channel.on('system', { event: 'error' }, (payload) => {
      logger.error('Channel error', {
        component: 'realtime',
        action: 'channelError',
        metadata: { channelName, error: payload },
      });
      this.updateConnectionState('error');
      this.scheduleReconnection();
    });

    channel.on('system', { event: 'close' }, () => {
      logger.info('Channel closed', {
        component: 'realtime',
        action: 'channelClosed',
        metadata: { channelName },
      });
      this.updateConnectionState('disconnected');
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
      this.updateConnectionState('connecting');

      const result = await channel.subscribe((status) => {
        logger.info('Channel subscription status changed', {
          component: 'realtime',
          action: 'subscriptionStatus',
          metadata: { channelName, status },
        });

        if (status === 'SUBSCRIBED') {
          this.updateConnectionState('connected');
          this.reconnectAttempts = 0; // Reset on successful connection
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.updateConnectionState('error');
          this.scheduleReconnection();
        }
      });

      if (result === 'error') {
        throw new Error('Failed to subscribe to channel');
      }
    } catch (error) {
      logger.error('Failed to subscribe channel', {
        component: 'realtime',
        action: 'subscribeError',
        metadata: { channelName },
      }, error as Error);
      
      this.updateConnectionState('error');
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
    logger.error('Realtime callback error', {
      component: 'realtime',
      action: 'callbackError',
      metadata: {
        subscriptionId,
        table: config.table,
        error: error.message,
      },
    }, error);

    monitor.recordError(error, {
      component: 'realtime',
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
    const parts = ['realtime', config.table];
    if (config.filter) {
      // Create a hash of the filter for uniqueness
      const filterHash = this.hashString(config.filter);
      parts.push(filterHash);
    }
    return parts.join(':');
  }

  /**
   * Simple string hash for channel naming
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
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

    logger.info('Connection state changed', {
      component: 'realtime',
      action: 'connectionStateChange',
      metadata: { previousState, newState: state },
    });

    // Notify all listeners
    for (const listener of this.connectionStateListeners) {
      try {
        listener(state);
      } catch (error) {
        logger.error('Connection state listener error', {
          component: 'realtime',
          action: 'listenerError',
        }, error as Error);
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
      logger.error('Max reconnection attempts reached', {
        component: 'realtime',
        action: 'maxRetriesExceeded',
        metadata: { attempts: this.reconnectAttempts },
      });
      this.updateConnectionState('error');
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectionConfig.initialDelay * 
        Math.pow(this.reconnectionConfig.multiplier, this.reconnectAttempts),
      this.reconnectionConfig.maxDelay
    );

    logger.info('Scheduling reconnection', {
      component: 'realtime',
      action: 'scheduleReconnect',
      metadata: {
        attempt: this.reconnectAttempts + 1,
        delay,
      },
    });

    this.updateConnectionState('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.handleReconnection();
    }, delay);

    this.reconnectAttempts++;
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnection(): Promise<void> {
    logger.info('Attempting reconnection', {
      component: 'realtime',
      action: 'reconnect',
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

      logger.info('Reconnection successful', {
        component: 'realtime',
        action: 'reconnectSuccess',
        metadata: {
          subscriptions: subscriptionEntries.length,
        },
      });
    } catch (error) {
      logger.error('Reconnection failed', {
        component: 'realtime',
        action: 'reconnectError',
      }, error as Error);
      
      this.scheduleReconnection();
    }
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

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