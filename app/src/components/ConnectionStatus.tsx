import React, { useEffect, useState } from 'react';
import { useRealtime, useRealtimeConnectionChange } from '../contexts/RealtimeContext';
import { cn } from '../lib/utils';

export interface ConnectionStatusProps {
  /**
   * Position of the indicator
   * @default 'bottom-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /**
   * Whether to show text label alongside the indicator
   * @default false
   */
  showLabel?: boolean;
  /**
   * Whether to auto-hide when connected
   * @default true
   */
  autoHide?: boolean;
  /**
   * Delay in ms before auto-hiding when connected
   * @default 3000
   */
  autoHideDelay?: number;
  /**
   * Custom class name for styling
   */
  className?: string;
  /**
   * Whether to show a toast notification on connection changes
   * @default false
   */
  showToast?: boolean;
}

/**
 * Visual indicator for realtime connection status
 * Shows a small dot with optional label indicating connection state
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ConnectionStatus />
 * 
 * // With label
 * <ConnectionStatus showLabel />
 * 
 * // Top-left position with no auto-hide
 * <ConnectionStatus position="top-left" autoHide={false} />
 * ```
 */
export function ConnectionStatus({
  position = 'bottom-right',
  showLabel = false,
  autoHide = true,
  autoHideDelay = 3000,
  className,
  showToast = false,
}: ConnectionStatusProps) {
  const { connectionState, isConnected, reconnect } = useRealtime();
  const [isVisible, setIsVisible] = useState(true);
  const [showReconnectButton, setShowReconnectButton] = useState(false);

  // Handle auto-hide logic
  useEffect(() => {
    if (!autoHide) {
      setIsVisible(true);
      return;
    }

    if (isConnected) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isConnected, autoHide, autoHideDelay]);

  // Show reconnect button after a delay when disconnected
  useEffect(() => {
    if (connectionState === 'error' || connectionState === 'disconnected') {
      const timer = setTimeout(() => {
        setShowReconnectButton(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowReconnectButton(false);
    }
  }, [connectionState]);

  // Handle toast notifications
  useRealtimeConnectionChange((state) => {
    if (!showToast) return;

    // You would integrate with your toast library here
    // For now, we'll use console.log as a placeholder
    switch (state) {
      case 'connected':
        console.log('✅ Realtime connected');
        break;
      case 'disconnected':
        console.log('❌ Realtime disconnected');
        break;
      case 'error':
        console.log('⚠️ Realtime connection error');
        break;
      case 'reconnecting':
        console.log('🔄 Reconnecting to realtime...');
        break;
    }
  });

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  // State colors and labels
  const stateConfig = {
    connecting: {
      color: 'bg-yellow-500',
      pulseColor: 'bg-yellow-400',
      label: 'Connecting...',
      showPulse: true,
    },
    connected: {
      color: 'bg-green-500',
      pulseColor: 'bg-green-400',
      label: 'Connected',
      showPulse: false,
    },
    disconnected: {
      color: 'bg-gray-500',
      pulseColor: 'bg-gray-400',
      label: 'Disconnected',
      showPulse: false,
    },
    reconnecting: {
      color: 'bg-orange-500',
      pulseColor: 'bg-orange-400',
      label: 'Reconnecting...',
      showPulse: true,
    },
    error: {
      color: 'bg-red-500',
      pulseColor: 'bg-red-400',
      label: 'Connection Error',
      showPulse: true,
    },
  };

  const config = stateConfig[connectionState];

  // Don't render if not visible
  if (!isVisible && autoHide) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex items-center gap-2 transition-opacity duration-300',
        positionClasses[position],
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${config.label}`}
    >
      {/* Background pill for label/button */}
      {(showLabel || showReconnectButton) && (
        <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-2">
          {/* Status indicator */}
          <div className="relative flex items-center justify-center">
            {/* Pulse animation */}
            {config.showPulse && (
              <span
                className={cn(
                  'absolute inline-flex h-3 w-3 rounded-full opacity-75 animate-ping',
                  config.pulseColor
                )}
              />
            )}
            {/* Status dot */}
            <span
              className={cn(
                'relative inline-flex h-3 w-3 rounded-full',
                config.color
              )}
            />
          </div>

          {/* Label */}
          {showLabel && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.label}
            </span>
          )}

          {/* Reconnect button */}
          {showReconnectButton && connectionState !== 'connecting' && connectionState !== 'reconnecting' && (
            <button
              onClick={reconnect}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
              aria-label="Reconnect to realtime"
            >
              Reconnect
            </button>
          )}
        </div>
      )}

      {/* Simple dot indicator when no label */}
      {!showLabel && !showReconnectButton && (
        <div className="relative flex items-center justify-center">
          {/* Pulse animation */}
          {config.showPulse && (
            <span
              className={cn(
                'absolute inline-flex h-4 w-4 rounded-full opacity-75 animate-ping',
                config.pulseColor
              )}
            />
          )}
          {/* Status dot with shadow */}
          <span
            className={cn(
              'relative inline-flex h-4 w-4 rounded-full shadow-lg',
              config.color
            )}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Inline connection status badge for use within other components
 * 
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <h1>Dashboard</h1>
 *   <ConnectionStatusBadge />
 * </div>
 * ```
 */
export function ConnectionStatusBadge({ className }: { className?: string }) {
  const { connectionState } = useRealtime();

  const stateConfig = {
    connecting: { color: 'bg-yellow-100 text-yellow-800', label: 'Connecting' },
    connected: { color: 'bg-green-100 text-green-800', label: 'Live' },
    disconnected: { color: 'bg-gray-100 text-gray-800', label: 'Offline' },
    reconnecting: { color: 'bg-orange-100 text-orange-800', label: 'Reconnecting' },
    error: { color: 'bg-red-100 text-red-800', label: 'Error' },
  };

  const config = stateConfig[connectionState];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        config.color,
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {config.label}
    </span>
  );
}