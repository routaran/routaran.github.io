import React, { useState, useEffect } from 'react';
import { useConnectionState } from '../../hooks/useConnectionState';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../lib/utils';
import { Button } from '../common/Button';
import { Progress } from '../common/Progress';

export interface ConnectionStatusBarProps {
  /** Position of the status bar */
  position?: 'top' | 'bottom';
  /** Whether to show detailed metrics */
  showMetrics?: boolean;
  /** Whether to show connection quality */
  showQuality?: boolean;
  /** Whether to auto-hide when connected */
  autoHide?: boolean;
  /** Auto-hide delay in milliseconds */
  autoHideDelay?: number;
  /** Custom class name */
  className?: string;
  /** Whether to show toast notifications */
  showToastNotifications?: boolean;
}

/**
 * Enhanced connection status bar with metrics, quality indicators, and manual controls
 */
export function ConnectionStatusBar({
  position = 'top',
  showMetrics = false,
  showQuality = false,
  autoHide = true,
  autoHideDelay = 5000,
  className,
  showToastNotifications = false,
}: ConnectionStatusBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const { showToast } = useToast();

  const {
    connectionState,
    isConnected,
    isReconnecting,
    metrics,
    history,
    reconnect,
    resetMetrics,
    getConnectionQuality,
  } = useConnectionState({
    enabled: true,
    autoReconnect: true,
    onConnectionLost: showToastNotifications ? 
      (metrics) => showToast('Connection lost. Attempting to reconnect...', 'warning') : 
      undefined,
    onConnectionRestored: showToastNotifications ? 
      (metrics) => showToast('Connection restored!', 'success') : 
      undefined,
  });

  // Auto-hide logic
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

  // Get status configuration
  const statusConfig = {
    connecting: {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-900',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: '🔄',
      message: 'Connecting to server...',
    },
    connected: {
      color: 'bg-green-500',
      textColor: 'text-green-900',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: '✅',
      message: 'Connected to server',
    },
    disconnected: {
      color: 'bg-gray-500',
      textColor: 'text-gray-900',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: '❌',
      message: 'Disconnected from server',
    },
    reconnecting: {
      color: 'bg-orange-500',
      textColor: 'text-orange-900',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: '🔄',
      message: 'Reconnecting...',
    },
    error: {
      color: 'bg-red-500',
      textColor: 'text-red-900',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: '⚠️',
      message: 'Connection error',
    },
  };

  const config = statusConfig[connectionState];
  const quality = getConnectionQuality();

  // Don't render if not visible and auto-hide is enabled
  if (!isVisible && autoHide) {
    return null;
  }

  // Position classes
  const positionClasses = {
    top: 'top-0 rounded-b-lg',
    bottom: 'bottom-0 rounded-t-lg',
  };

  return (
    <div
      className={cn(
        'fixed left-4 right-4 z-50 transition-all duration-300',
        positionClasses[position],
        isVisible ? 'translate-y-0 opacity-100' : 
          position === 'top' ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0',
        className
      )}
    >
      <div className={cn(
        'border shadow-lg',
        config.bgColor,
        config.borderColor
      )}>
        {/* Main status bar */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    config.color,
                    (isReconnecting || connectionState === 'connecting') && 'animate-pulse'
                  )}
                />
              </div>
              <span className={cn('text-sm font-medium', config.textColor)}>
                {config.message}
              </span>
            </div>

            {/* Connection quality */}
            {showQuality && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Quality:</span>
                <div className="flex items-center gap-1">
                  <Progress value={quality} className="w-16 h-2" />
                  <span className="text-xs text-gray-600">{Math.round(quality)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Metrics toggle */}
            {showMetrics && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs"
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            )}

            {/* Manual reconnect */}
            {!isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reconnect}
                disabled={isReconnecting}
                className="text-xs"
              >
                {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
              </Button>
            )}

            {/* Close button */}
            {autoHide && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-xs"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Detailed metrics */}
        {showDetails && showMetrics && (
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Attempts:</span>
                <div className="font-medium">{metrics.connectionAttempts}</div>
              </div>
              <div>
                <span className="text-gray-500">Successful:</span>
                <div className="font-medium text-green-600">{metrics.successfulConnections}</div>
              </div>
              <div>
                <span className="text-gray-500">Failed:</span>
                <div className="font-medium text-red-600">{metrics.failedConnections}</div>
              </div>
              <div>
                <span className="text-gray-500">Downtime:</span>
                <div className="font-medium">
                  {Math.round(metrics.totalDisconnectedTime / 1000)}s
                </div>
              </div>
            </div>

            {/* Connection duration */}
            {metrics.currentConnectionDuration && (
              <div className="mt-2 text-xs text-gray-500">
                Connected for {Math.round(metrics.currentConnectionDuration / 1000)}s
              </div>
            )}

            {/* Connection history */}
            {history.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-2">Recent Activity:</div>
                <div className="space-y-1">
                  {history.slice(0, 3).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className={cn(
                        'font-medium',
                        entry.state === 'connected' ? 'text-green-600' :
                        entry.state === 'error' ? 'text-red-600' :
                        'text-gray-600'
                      )}>
                        {entry.state}
                      </span>
                      <span className="text-gray-500">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetMetrics}
                className="text-xs"
              >
                Reset Metrics
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simplified connection status bar for minimal UI
 */
export function SimpleConnectionStatusBar({
  className,
}: {
  className?: string;
}) {
  return (
    <ConnectionStatusBar
      position="top"
      showMetrics={false}
      showQuality={false}
      autoHide={true}
      autoHideDelay={3000}
      className={className}
    />
  );
}

/**
 * Detailed connection status bar for development/debugging
 */
export function DetailedConnectionStatusBar({
  className,
}: {
  className?: string;
}) {
  return (
    <ConnectionStatusBar
      position="bottom"
      showMetrics={true}
      showQuality={true}
      autoHide={false}
      showToastNotifications={true}
      className={className}
    />
  );
}

/**
 * Inline connection status indicator for embedding in other components
 */
export function InlineConnectionStatus({
  showQuality = false,
  className,
}: {
  showQuality?: boolean;
  className?: string;
}) {
  const { connectionState, isConnected, getConnectionQuality } = useConnectionState();

  const statusConfig = {
    connecting: { color: 'text-yellow-600', label: 'Connecting' },
    connected: { color: 'text-green-600', label: 'Connected' },
    disconnected: { color: 'text-gray-600', label: 'Disconnected' },
    reconnecting: { color: 'text-orange-600', label: 'Reconnecting' },
    error: { color: 'text-red-600', label: 'Error' },
  };

  const config = statusConfig[connectionState];
  const quality = getConnectionQuality();

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <div className="flex items-center gap-1">
        <div className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-gray-400',
          connectionState === 'connecting' && 'animate-pulse'
        )} />
        <span className={config.color}>
          {config.label}
        </span>
      </div>
      
      {showQuality && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">({Math.round(quality)}%)</span>
        </div>
      )}
    </div>
  );
}