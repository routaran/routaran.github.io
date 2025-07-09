import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  onConnectionStateChange, 
  reconnect as realtimeReconnect,
  unsubscribeAll,
  type ConnectionState 
} from '../lib/supabase/realtime';
import { logger } from '../lib/logger';

interface RealtimeContextValue {
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  hasError: boolean;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export interface RealtimeProviderProps {
  children: React.ReactNode;
  /**
   * Whether to automatically attempt reconnection on mount
   */
  autoConnect?: boolean;
  /**
   * Callback when connection state changes
   */
  onConnectionStateChange?: (state: ConnectionState) => void;
}

/**
 * Provider component that manages global realtime connection state
 * and provides connection utilities to child components
 */
export function RealtimeProvider({ 
  children, 
  autoConnect = true,
  onConnectionStateChange: onStateChange,
}: RealtimeProviderProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  // Subscribe to connection state changes
  useEffect(() => {
    logger.info('RealtimeProvider mounting', {
      component: 'RealtimeProvider',
      action: 'mount',
      metadata: { autoConnect },
    });

    const unsubscribe = onConnectionStateChange((state) => {
      logger.debug('Connection state updated in context', {
        component: 'RealtimeProvider',
        action: 'stateChange',
        metadata: { state },
      });
      
      setConnectionState(state);
      
      if (onStateChange) {
        onStateChange(state);
      }
    });

    return () => {
      logger.info('RealtimeProvider unmounting', {
        component: 'RealtimeProvider',
        action: 'unmount',
      });
      
      unsubscribe();
      
      // Clean up all subscriptions when provider unmounts
      unsubscribeAll();
    };
  }, [onStateChange]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && connectionState === 'disconnected') {
      logger.info('Auto-connecting to realtime', {
        component: 'RealtimeProvider',
        action: 'autoConnect',
      });
      
      // Small delay to ensure everything is initialized
      const timer = setTimeout(() => {
        realtimeReconnect();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [autoConnect, connectionState]);

  // Memoized reconnect function
  const reconnect = useCallback(() => {
    logger.info('Manual reconnect requested from context', {
      component: 'RealtimeProvider',
      action: 'manualReconnect',
      metadata: { currentState: connectionState },
    });
    
    realtimeReconnect();
  }, [connectionState]);

  // Compute derived states
  const contextValue = useMemo<RealtimeContextValue>(() => ({
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isReconnecting: connectionState === 'reconnecting',
    hasError: connectionState === 'error',
    reconnect,
  }), [connectionState, reconnect]);

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to access realtime connection state and utilities
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected, connectionState, reconnect } = useRealtime();
 *   
 *   if (!isConnected) {
 *     return (
 *       <div>
 *         <p>Connection lost</p>
 *         <button onClick={reconnect}>Reconnect</button>
 *       </div>
 *     );
 *   }
 *   
 *   return <div>Connected!</div>;
 * }
 * ```
 */
export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  
  return context;
}

/**
 * Hook that returns just the connection state
 */
export function useRealtimeConnectionState(): ConnectionState {
  const { connectionState } = useRealtime();
  return connectionState;
}

/**
 * Hook that returns a boolean indicating if realtime is connected
 */
export function useIsRealtimeConnected(): boolean {
  const { isConnected } = useRealtime();
  return isConnected;
}

/**
 * Hook that provides a reconnect function
 */
export function useRealtimeReconnect(): () => void {
  const { reconnect } = useRealtime();
  return reconnect;
}

/**
 * Hook that triggers a callback when connection state changes
 * 
 * @example
 * ```tsx
 * useRealtimeConnectionChange((state) => {
 *   if (state === 'connected') {
 *     toast.success('Realtime connected!');
 *   } else if (state === 'error') {
 *     toast.error('Realtime connection failed');
 *   }
 * });
 * ```
 */
export function useRealtimeConnectionChange(
  callback: (state: ConnectionState) => void
): void {
  const { connectionState } = useRealtime();
  
  useEffect(() => {
    callback(connectionState);
  }, [connectionState, callback]);
}