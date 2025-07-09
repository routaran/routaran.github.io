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
 */
export function usePlayerPresence({
  playDateId,
  enabled = true,
  heartbeatInterval = 30000,
  offlineTimeout = 60000,
}: UsePlayerPresenceOptions): UsePlayerPresenceReturn {
  const { user, currentPlayerId } = useAuth();
  const [playerPresence, setPlayerPresence] = useState<Record<string, PlayerPresenceInfo>>({});
  const [isActive, setIsActive] = useState(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentMatchIdRef = useRef<string | undefined>(undefined);

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

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const processPresenceState = useCallback((presenceState: Record<string, any[]>) => {
    const newPresence: Record<string, PlayerPresenceInfo> = {};
    const now = new Date().getTime();

    Object.entries(presenceState).forEach(([key, presences]) => {
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
  }, [playDateId, offlineTimeout]);

  const refreshPresence = useCallback(() => {
    if (!channelRef.current) return;
    const currentState = channelRef.current.presenceState();
    processPresenceState(currentState);
  }, [processPresenceState]);

  useEffect(() => {
    if (!enabled || !playDateId || !user) {
      setIsActive(false);
      setConnectionState('disconnected');
      return;
    }

    const channelName = `presence:play_date:${playDateId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      processPresenceState(presenceState);
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const presenceState = channel.presenceState();
      processPresenceState(presenceState);
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      const presenceState = channel.presenceState();
      processPresenceState(presenceState);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionState('connected');
        setIsActive(true);
        
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
      } else if (status === 'CHANNEL_ERROR') {
        setConnectionState('error');
        setIsActive(false);
        stopHeartbeat();
      } else if (status === 'CLOSED') {
        setConnectionState('disconnected');
        setIsActive(false);
        stopHeartbeat();
      }
    });

    return () => {
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

  useEffect(() => {
    return () => {
      stopHeartbeat();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [stopHeartbeat]);

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

export function usePlayerPresenceStatus(playDateId: string, playerId: string) {
  const { playerPresence } = usePlayerPresence({ playDateId });
  
  return {
    isOnline: playerPresence[playerId]?.is_online ?? false,
    isPlaying: playerPresence[playerId]?.is_playing ?? false,
    lastSeen: playerPresence[playerId]?.last_seen,
    currentMatchId: playerPresence[playerId]?.current_match_id,
  };
}

export function useOnlinePlayersCount(playDateId: string) {
  const { playerPresence } = usePlayerPresence({ playDateId });
  
  const onlineCount = Object.values(playerPresence).filter(p => p.is_online).length;
  const playingCount = Object.values(playerPresence).filter(p => p.is_playing).length;
  
  return { onlineCount, playingCount };
}