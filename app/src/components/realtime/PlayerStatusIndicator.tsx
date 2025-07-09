import React, { useMemo } from 'react';
import { usePlayerPresence, usePlayerPresenceStatus } from '../../hooks/usePlayerPresence';
import { cn } from '../../lib/utils';
import { Badge } from '../common/Badge';

export interface PlayerStatusIndicatorProps {
  /** Player ID to track */
  playerId: string;
  /** Play date ID for context */
  playDateId: string;
  /** Player name for display */
  playerName?: string;
  /** Show detailed status */
  showDetails?: boolean;
  /** Show last seen time */
  showLastSeen?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when status changes */
  onStatusChange?: (status: {
    isOnline: boolean;
    isPlaying: boolean;
    lastSeen?: string;
  }) => void;
}

/**
 * Individual player status indicator showing online/offline and playing status
 */
export function PlayerStatusIndicator({
  playerId,
  playDateId,
  playerName,
  showDetails = false,
  showLastSeen = false,
  compact = false,
  className,
  onStatusChange,
}: PlayerStatusIndicatorProps) {
  const { isOnline, isPlaying, lastSeen, currentMatchId } = usePlayerPresenceStatus(playDateId, playerId);

  // Call status change callback
  React.useEffect(() => {
    if (onStatusChange) {
      onStatusChange({ isOnline, isPlaying, lastSeen });
    }
  }, [isOnline, isPlaying, lastSeen, onStatusChange]);

  const statusConfig = useMemo(() => {
    if (isPlaying) {
      return {
        color: 'bg-blue-500',
        pulseColor: 'bg-blue-400',
        label: 'Playing',
        badgeVariant: 'info' as const,
        description: `Currently playing match ${currentMatchId}`,
      };
    } else if (isOnline) {
      return {
        color: 'bg-green-500',
        pulseColor: 'bg-green-400',
        label: 'Online',
        badgeVariant: 'success' as const,
        description: 'Available to play',
      };
    } else {
      return {
        color: 'bg-gray-400',
        pulseColor: 'bg-gray-300',
        label: 'Offline',
        badgeVariant: 'secondary' as const,
        description: lastSeen ? `Last seen: ${formatLastSeen(lastSeen)}` : 'Never seen',
      };
    }
  }, [isOnline, isPlaying, currentMatchId, lastSeen]);

  function formatLastSeen(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Status dot */}
        <div className="relative flex items-center justify-center">
          {isPlaying && (
            <span
              className={cn(
                'absolute inline-flex h-3 w-3 rounded-full opacity-75 animate-ping',
                statusConfig.pulseColor
              )}
            />
          )}
          <span
            className={cn(
              'relative inline-flex h-3 w-3 rounded-full',
              statusConfig.color
            )}
          />
        </div>
        
        {/* Name */}
        {playerName && (
          <span className="text-sm font-medium text-gray-900">
            {playerName}
          </span>
        )}
        
        {/* Status badge */}
        <Badge variant={statusConfig.badgeVariant} size="sm">
          {statusConfig.label}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border', className)}>
      {/* Status indicator */}
      <div className="relative flex items-center justify-center">
        {isPlaying && (
          <span
            className={cn(
              'absolute inline-flex h-4 w-4 rounded-full opacity-75 animate-ping',
              statusConfig.pulseColor
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex h-4 w-4 rounded-full',
            statusConfig.color
          )}
        />
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {playerName && (
            <span className="text-sm font-medium text-gray-900 truncate">
              {playerName}
            </span>
          )}
          <Badge variant={statusConfig.badgeVariant} size="sm">
            {statusConfig.label}
          </Badge>
        </div>
        
        {showDetails && (
          <div className="mt-1 text-xs text-gray-500">
            {statusConfig.description}
          </div>
        )}
        
        {showLastSeen && lastSeen && !isOnline && (
          <div className="mt-1 text-xs text-gray-500">
            Last seen: {formatLastSeen(lastSeen)}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Props for player status list
 */
export interface PlayerStatusListProps {
  /** Play date ID */
  playDateId: string;
  /** Player IDs to show */
  playerIds: string[];
  /** Player names map */
  playerNames?: Record<string, string>;
  /** Show detailed status */
  showDetails?: boolean;
  /** Show last seen times */
  showLastSeen?: boolean;
  /** Custom class name */
  className?: string;
  /** Filter to show only online players */
  onlineOnly?: boolean;
  /** Filter to show only playing players */
  playingOnly?: boolean;
}

/**
 * List of player status indicators
 */
export function PlayerStatusList({
  playDateId,
  playerIds,
  playerNames = {},
  showDetails = false,
  showLastSeen = false,
  className,
  onlineOnly = false,
  playingOnly = false,
}: PlayerStatusListProps) {
  const { playerPresence } = usePlayerPresence({ playDateId });

  // Filter players based on status
  const filteredPlayerIds = useMemo(() => {
    return playerIds.filter(playerId => {
      const presence = playerPresence[playerId];
      if (!presence) return !onlineOnly && !playingOnly;
      
      if (playingOnly && !presence.is_playing) return false;
      if (onlineOnly && !presence.is_online) return false;
      
      return true;
    });
  }, [playerIds, playerPresence, onlineOnly, playingOnly]);

  if (filteredPlayerIds.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <div className="text-sm">
          {playingOnly ? 'No players currently playing' : 
           onlineOnly ? 'No players online' : 
           'No players found'}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {filteredPlayerIds.map(playerId => (
        <PlayerStatusIndicator
          key={playerId}
          playerId={playerId}
          playDateId={playDateId}
          playerName={playerNames[playerId]}
          showDetails={showDetails}
          showLastSeen={showLastSeen}
        />
      ))}
    </div>
  );
}

/**
 * Props for player status summary
 */
export interface PlayerStatusSummaryProps {
  /** Play date ID */
  playDateId: string;
  /** Show detailed breakdown */
  showBreakdown?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Summary of player status across all players
 */
export function PlayerStatusSummary({
  playDateId,
  showBreakdown = false,
  className,
}: PlayerStatusSummaryProps) {
  const { playerPresence } = usePlayerPresence({ playDateId });

  const summary = useMemo(() => {
    const players = Object.values(playerPresence);
    return {
      total: players.length,
      online: players.filter(p => p.is_online).length,
      playing: players.filter(p => p.is_playing).length,
      offline: players.filter(p => !p.is_online).length,
    };
  }, [playerPresence]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Quick summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-sm text-gray-600">
            {summary.online} Online
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-600">
            {summary.playing} Playing
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full" />
          <span className="text-sm text-gray-600">
            {summary.offline} Offline
          </span>
        </div>
      </div>

      {/* Detailed breakdown */}
      {showBreakdown && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Total Players:</span>
            <span className="font-medium">{summary.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Available:</span>
            <span className="font-medium">{summary.online - summary.playing}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact player status indicators for header/navigation
 */
export function PlayerStatusHeaderIndicator({
  playDateId,
  className,
}: {
  playDateId: string;
  className?: string;
}) {
  const { playerPresence } = usePlayerPresence({ playDateId });

  const onlineCount = Object.values(playerPresence).filter(p => p.is_online).length;
  const playingCount = Object.values(playerPresence).filter(p => p.is_playing).length;

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-gray-600">{onlineCount}</span>
      </div>
      
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <span className="text-gray-600">{playingCount}</span>
      </div>
    </div>
  );
}