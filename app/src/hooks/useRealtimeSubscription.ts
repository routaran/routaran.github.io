import { useEffect, useRef, useCallback } from 'react';
import { 
  subscribeToTable, 
  unsubscribe,
  type TableName,
  type RealtimeEventType,
  type RealtimeCallback,
  type SubscriptionConfig,
} from '../lib/supabase/realtime';
import { logger } from '../lib/logger';

export interface UseRealtimeSubscriptionOptions<T extends TableName> {
  table: T;
  event?: RealtimeEventType;
  filter?: string;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * React hook for managing Supabase Realtime subscriptions
 * 
 * @example
 * ```tsx
 * // Subscribe to all match updates for a specific play date
 * useRealtimeSubscription({
 *   table: 'matches',
 *   filter: `play_date_id=eq.${playDateId}`,
 *   enabled: !!playDateId,
 * }, (payload) => {
 *   console.log('Match updated:', payload);
 *   refetchMatches();
 * });
 * 
 * // Subscribe to specific events
 * useRealtimeSubscription({
 *   table: 'players',
 *   event: 'INSERT',
 * }, (payload) => {
 *   console.log('New player added:', payload.new);
 * });
 * ```
 */
export function useRealtimeSubscription<T extends TableName>(
  options: UseRealtimeSubscriptionOptions<T>,
  callback: RealtimeCallback<T>
): void {
  const { table, event, filter, enabled = true, onError } = options;
  
  // Use refs to maintain stable references
  const callbackRef = useRef(callback);
  const onErrorRef = useRef(onError);
  const subscriptionIdRef = useRef<string | null>(null);

  // Update refs when callbacks change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Memoized error handler
  const handleError = useCallback((error: Error) => {
    logger.error('Realtime subscription error', {
      component: 'useRealtimeSubscription',
      action: 'subscriptionError',
      metadata: {
        table,
        event,
        filter,
        error: error.message,
      },
    }, error);

    if (onErrorRef.current) {
      onErrorRef.current(error);
    }
  }, [table, event, filter]);

  useEffect(() => {
    // Skip if not enabled
    if (!enabled) {
      logger.debug('Realtime subscription disabled', {
        component: 'useRealtimeSubscription',
        action: 'subscriptionDisabled',
        metadata: { table, event, filter },
      });
      return;
    }

    // Generate unique subscription ID
    const subscriptionId = `${table}-${event || '*'}-${filter || 'all'}-${Date.now()}`;
    subscriptionIdRef.current = subscriptionId;

    logger.info('Setting up realtime subscription', {
      component: 'useRealtimeSubscription',
      action: 'subscribe',
      metadata: {
        subscriptionId,
        table,
        event,
        filter,
      },
    });

    // Create subscription config
    const config: SubscriptionConfig<T> = {
      table,
      event,
      filter,
      callback: (payload) => {
        // Always use the latest callback
        callbackRef.current(payload);
      },
      onError: handleError,
    };

    // Subscribe
    const unsubscribeFn = subscribeToTable(subscriptionId, config);

    // Cleanup function
    return () => {
      logger.info('Cleaning up realtime subscription', {
        component: 'useRealtimeSubscription',
        action: 'cleanup',
        metadata: {
          subscriptionId,
          table,
          event,
          filter,
        },
      });

      unsubscribeFn();
      subscriptionIdRef.current = null;
    };
  }, [table, event, filter, enabled, handleError]);

  // Log when component using this hook unmounts
  useEffect(() => {
    return () => {
      if (subscriptionIdRef.current) {
        logger.debug('Component with realtime subscription unmounting', {
          component: 'useRealtimeSubscription',
          action: 'componentUnmount',
          metadata: {
            subscriptionId: subscriptionIdRef.current,
            table,
          },
        });
      }
    };
  }, [table]);
}

/**
 * Hook for subscribing to multiple tables at once
 * 
 * @example
 * ```tsx
 * useRealtimeSubscriptions([
 *   {
 *     table: 'matches',
 *     filter: `play_date_id=eq.${playDateId}`,
 *     callback: handleMatchUpdate,
 *   },
 *   {
 *     table: 'players',
 *     filter: `play_date_id=eq.${playDateId}`,
 *     callback: handlePlayerUpdate,
 *   },
 * ], !!playDateId);
 * ```
 */
export function useRealtimeSubscriptions<T extends TableName>(
  subscriptions: Array<{
    table: T;
    event?: RealtimeEventType;
    filter?: string;
    callback: RealtimeCallback<T>;
    onError?: (error: Error) => void;
  }>,
  enabled = true
): void {
  subscriptions.forEach((subscription) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRealtimeSubscription(
      {
        table: subscription.table,
        event: subscription.event,
        filter: subscription.filter,
        enabled,
        onError: subscription.onError,
      },
      subscription.callback
    );
  });
}

/**
 * Hook for subscribing to all events on a table with filtering
 * 
 * @example
 * ```tsx
 * const { data: matches, refetch } = useQuery(...);
 * 
 * useTableSubscription('matches', {
 *   filter: `play_date_id=eq.${playDateId}`,
 *   onInsert: (newMatch) => {
 *     // Handle new match
 *     refetch();
 *   },
 *   onUpdate: (updatedMatch) => {
 *     // Handle updated match
 *     refetch();
 *   },
 *   onDelete: (deletedMatch) => {
 *     // Handle deleted match
 *     refetch();
 *   },
 * });
 * ```
 */
export function useTableSubscription<T extends TableName>(
  table: T,
  options: {
    filter?: string;
    enabled?: boolean;
    onInsert?: (record: Database['public']['Tables'][T]['Row']) => void;
    onUpdate?: (record: Database['public']['Tables'][T]['Row'], oldRecord: Database['public']['Tables'][T]['Row']) => void;
    onDelete?: (record: Database['public']['Tables'][T]['Row']) => void;
    onError?: (error: Error) => void;
  }
): void {
  const { filter, enabled = true, onInsert, onUpdate, onDelete, onError } = options;

  useRealtimeSubscription(
    {
      table,
      filter,
      enabled,
      onError,
    },
    (payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          if (onInsert && payload.new) {
            onInsert(payload.new);
          }
          break;
        case 'UPDATE':
          if (onUpdate && payload.new && payload.old) {
            onUpdate(payload.new, payload.old);
          }
          break;
        case 'DELETE':
          if (onDelete && payload.old) {
            onDelete(payload.old);
          }
          break;
      }
    }
  );
}

// Type helper to ensure we have the Database type available
import type { Database } from '../types/database';