import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { logger } from '../lib/logger';
import { monitor } from '../lib/monitoring';

export interface PlayerPresenceInfo {
  player_id: string;
  player_name: string;
  is_online: boolean;
  last_seen: string;
  current_match_id?: string;
  is_playing: boolean;
}

export interface UsePlayerPresenceOptions {
  /** Play date ID to track presence for */
  playDateId: string;
  /** Whether to track presence for this user */
  enabled?: boolean;
  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number;
  /** Timeout to consider a player offline (in milliseconds) */
  offlineTimeout?: number;
}

export interface UsePlayerPresenceReturn {
  /** Current player presence states */
  playerPresence: Record<string, PlayerPresenceInfo>;
  /** Whether presence tracking is active */
  isActive: boolean;
  /** Update current player's playing status */
  updatePlayingStatus: (matchId?: string) => void;
  /** Manually refresh presence data */
  refreshPresence: () => void;
  /** Connection state of presence system */
  connectionState: 'connected' | 'disconnected' | 'error';
}

/**
 * Hook for tracking player presence and online status in real-time.
 * Uses Supabase Realtime presence feature to track who's online and playing.
 * 
 * @example
 * ```tsx
 * const { playerPresence, updatePlayingStatus } = usePlayerPresence({
 *   playDateId: 'play-date-123',
 *   enabled: true,
 * });
 * 
 * // Update playing status when entering a match
 * updatePlayingStatus('match-456');
 * 
 * // Check if a player is online
 * const isOnline = playerPresence['player-123']?.is_online;
 * ```
 */
export function usePlayerPresence({
  playDateId,
  enabled = true,
  heartbeatInterval = 30000, // 30 seconds
  offlineTimeout = 60000, // 1 minute
}: UsePlayerPresenceOptions): UsePlayerPresenceReturn {
  const { user, currentPlayerId } = useAuth();
  const [playerPresence, setPlayerPresence] = useState<Record<string, PlayerPresenceInfo>>({});
  const [isActive, setIsActive] = useState(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentMatchIdRef = useRef<string | undefined>(undefined);

  /**
   * Update playing status for current player
   */
  const updatePlayingStatus = useCallback((matchId?: string) => {
    if (!currentPlayerId || !channelRef.current) return;

    currentMatchIdRef.current = matchId;
    
    const presenceData = {
      player_id: currentPlayerId,
      player_name: user?.email || 'Unknown',
      current_match_id: matchId,
      is_playing: !!matchId,
      last_seen: new Date().toISOString(),
    };

    channelRef.current.track(presenceData).catch((error) => {
      logger.error('Failed to update playing status', {
        component: 'usePlayerPresence',
        action: 'updatePlayingStatus',
        metadata: { playDateId, matchId, error: error.message },
      }, error);
    });
  }, [currentPlayerId, user?.email, playDateId]);

  /**
   * Start heartbeat to maintain presence
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (currentPlayerId && channelRef.current) {
        const presenceData = {
          player_id: currentPlayerId,
          player_name: user?.email || 'Unknown',
          current_match_id: currentMatchIdRef.current,
          is_playing: !!currentMatchIdRef.current,
          last_seen: new Date().toISOString(),
        };

        channelRef.current.track(presenceData).catch((error) => {
          logger.error('Heartbeat failed', {
            component: 'usePlayerPresence',
            action: 'heartbeat',
            metadata: { playDateId, error: error.message },
          }, error);
        });
      }
    }, heartbeatInterval);
  }, [currentPlayerId, user?.email, playDateId, heartbeatInterval]);

  /**
   * Stop heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Process presence state changes
   */
  const processPresenceState = useCallback((presenceState: Record<string, any[]>) => {
    const newPresence: Record<string, PlayerPresenceInfo> = {};
    const now = new Date().getTime();

    Object.entries(presenceState).forEach(([key, presences]) => {
      // Use the most recent presence for each player
      const mostRecent = presences.sort((a, b) => 
        new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
      )[0];

      if (mostRecent) {
        const lastSeen = new Date(mostRecent.last_seen).getTime();
        const isOnline = (now - lastSeen) < offlineTimeout;

        newPresence[mostRecent.player_id] = {
          player_id: mostRecent.player_id,
          player_name: mostRecent.player_name,
          is_online: isOnline,
          last_seen: mostRecent.last_seen,
          current_match_id: mostRecent.current_match_id,
          is_playing: mostRecent.is_playing && isOnline,
        };
      }
    });

    setPlayerPresence(newPresence);
    
    // Log presence changes
    logger.debug('Presence state updated', {
      component: 'usePlayerPresence',
      action: 'presenceUpdate',
      metadata: {
        playDateId,
        onlineCount: Object.values(newPresence).filter(p => p.is_online).length,
        playingCount: Object.values(newPresence).filter(p => p.is_playing).length,
      },
    });
  }, [playDateId, offlineTimeout]);

  /**
   * Refresh presence data manually
   */
  const refreshPresence = useCallback(() => {
    if (!channelRef.current) return;

    const currentState = channelRef.current.presenceState();
    processPresenceState(currentState);
  }, [processPresenceState]);

  /**
   * Set up presence channel
   */
  useEffect(() => {
    if (!enabled || !playDateId || !user) {
      setIsActive(false);
      setConnectionState('disconnected');
      return;
    }

    const channelName = `presence:play_date:${playDateId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    logger.info('Setting up player presence', {
      component: 'usePlayerPresence',
      action: 'setup',
      metadata: { playDateId, channelName },
    });

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      logger.debug('Presence sync received', {
        component: 'usePlayerPresence',
        action: 'sync',
        metadata: { playDateId },
      });

      const presenceState = channel.presenceState();
      processPresenceState(presenceState);
    });

    // Handle joins
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      logger.debug('Player joined', {
        component: 'usePlayerPresence',
        action: 'join',
        metadata: { playDateId, key, count: newPresences.length },
      });

      const presenceState = channel.presenceState();
      processPresenceState(presenceState);
    });

    // Handle leaves
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      logger.debug('Player left', {
        component: 'usePlayerPresence',
        action: 'leave',
        metadata: { playDateId, key, count: leftPresences.length },
      });

      const presenceState = channel.presenceState();
      processPresenceState(presenceState);
    });

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionState('connected');
        setIsActive(true);
        
        // Initial presence track
        if (currentPlayerId) {
          const presenceData = {
            player_id: currentPlayerId,
            player_name: user.email || 'Unknown',
            current_match_id: currentMatchIdRef.current,
            is_playing: !!currentMatchIdRef.current,
            last_seen: new Date().toISOString(),
          };

          await channel.track(presenceData);
          startHeartbeat();
        }

        logger.info('Player presence active', {
          component: 'usePlayerPresence',
          action: 'active',
          metadata: { playDateId },
        });
      } else if (status === 'CHANNEL_ERROR') {
        setConnectionState('error');
        setIsActive(false);
        stopHeartbeat();
        
        logger.error('Player presence error', {
          component: 'usePlayerPresence',
          action: 'error',
          metadata: { playDateId },
        });
      } else if (status === 'CLOSED') {
        setConnectionState('disconnected');
        setIsActive(false);
        stopHeartbeat();
        
        logger.info('Player presence disconnected', {
          component: 'usePlayerPresence',
          action: 'disconnected',
          metadata: { playDateId },
        });
      }
    });

    // Cleanup function
    return () => {
      logger.info('Cleaning up player presence', {
        component: 'usePlayerPresence',
        action: 'cleanup',
        metadata: { playDateId },
      });

      stopHeartbeat();
      setIsActive(false);
      setConnectionState('disconnected');
      setPlayerPresence({});
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, playDateId, user, currentPlayerId, processPresenceState, startHeartbeat, stopHeartbeat]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [stopHeartbeat]);

  /**
   * Monitor presence metrics
   */
  useEffect(() => {
    if (!isActive) return;

    const onlineCount = Object.values(playerPresence).filter(p => p.is_online).length;
    const playingCount = Object.values(playerPresence).filter(p => p.is_playing).length;

    monitor.recordMetric('player_presence_online', onlineCount, {
      component: 'usePlayerPresence',
      play_date_id: playDateId,
    });

    monitor.recordMetric('player_presence_playing', playingCount, {
      component: 'usePlayerPresence',
      play_date_id: playDateId,
    });
  }, [playerPresence, isActive, playDateId]);

  return {
    playerPresence,
    isActive,
    updatePlayingStatus,
    refreshPresence,
    connectionState,
  };
}

/**
 * Hook for tracking a specific player's presence
 */
export function usePlayerPresenceStatus(playDateId: string, playerId: string) {
  const { playerPresence } = usePlayerPresence({ playDateId });
  
  return {
    isOnline: playerPresence[playerId]?.is_online ?? false,
    isPlaying: playerPresence[playerId]?.is_playing ?? false,
    lastSeen: playerPresence[playerId]?.last_seen,
    currentMatchId: playerPresence[playerId]?.current_match_id,
  };
}

/**
 * Hook for getting online players count
 */
export function useOnlinePlayersCount(playDateId: string) {
  const { playerPresence } = usePlayerPresence({ playDateId });
  
  const onlineCount = Object.values(playerPresence).filter(p => p.is_online).length;
  const playingCount = Object.values(playerPresence).filter(p => p.is_playing).length;
  
  return { onlineCount, playingCount };
}