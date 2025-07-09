import { renderHook, act } from '@testing-library/react';
import { usePlayerPresence, usePlayerPresenceStatus, useOnlinePlayersCount } from '../usePlayerPresence';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../useAuth';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('../useAuth');
jest.mock('../../lib/logger');
jest.mock('../../lib/monitoring');

// Mock Supabase channel
const mockChannel = {
  on: jest.fn(),
  track: jest.fn(),
  subscribe: jest.fn(),
  presenceState: jest.fn(),
  state: 'subscribed',
};

const mockSupabaseChannel = jest.fn(() => mockChannel);
const mockRemoveChannel = jest.fn();

(supabase as any).channel = mockSupabaseChannel;
(supabase as any).removeChannel = mockRemoveChannel;

const mockAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('usePlayerPresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      currentPlayerId: 'player-123',
      isAuthenticated: true,
    } as any);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should initialize with empty presence state', () => {
      const { result } = renderHook(() => 
        usePlayerPresence({ playDateId: 'play-date-123' })
      );

      expect(result.current.playerPresence).toEqual({});
      expect(result.current.isActive).toBe(false);
      expect(result.current.connectionState).toBe('disconnected');
    });

    it('should set up channel subscription when enabled', () => {
      renderHook(() => 
        usePlayerPresence({ playDateId: 'play-date-123', enabled: true })
      );

      expect(mockSupabaseChannel).toHaveBeenCalledWith('presence:play_date:play-date-123');
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function));
      expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not set up subscription when disabled', () => {
      renderHook(() => 
        usePlayerPresence({ playDateId: 'play-date-123', enabled: false })
      );

      expect(mockSupabaseChannel).not.toHaveBeenCalled();
    });

    it('should not set up subscription when no user', () => {
      mockAuth.mockReturnValue({
        user: null,
        currentPlayerId: null,
        isAuthenticated: false,
      } as any);

      renderHook(() => 
        usePlayerPresence({ playDateId: 'play-date-123' })
      );

      expect(mockSupabaseChannel).not.toHaveBeenCalled();
    });
  });

  describe('presence tracking', () => {
    it('should track initial presence on subscription', async () => {
      const mockTrack = jest.fn().mockResolvedValue(undefined);
      mockChannel.track = mockTrack;

      const mockSubscribe = jest.fn((callback) => {
        callback('SUBSCRIBED');
        return 'success';
      });
      mockChannel.subscribe = mockSubscribe;

      renderHook(() => 
        usePlayerPresence({ playDateId: 'play-date-123', enabled: true })
      );

      await act(async () => {
        // Wait for subscription callback
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockTrack).toHaveBeenCalledWith({
        player_id: 'player-123',
        player_name: 'test@example.com',
        current_match_id: undefined,
        is_playing: false,
        last_seen: expect.any(String),
      });
    });

    it('should update playing status', async () => {
      const mockTrack = jest.fn().mockResolvedValue(undefined);
      mockChannel.track = mockTrack;

      const { result } = renderHook(() => 
        usePlayerPresence({ playDateId: 'play-date-123', enabled: true })
      );

      await act(async () => {
        result.current.updatePlayingStatus('match-456');
      });

      expect(mockTrack).toHaveBeenCalledWith({
        player_id: 'player-123',
        player_name: 'test@example.com',
        current_match_id: 'match-456',
        is_playing: true,
        last_seen: expect.any(String),
      });
    });

    it('should process presence state updates', () => {
      const mockPresenceState = {
        'user-123': [{
          player_id: 'player-123',
          player_name: 'Test User',
          is_playing: false,
          last_seen: new Date().toISOString(),
        }],
      };

      let syncCallback: Function;
      mockChannel.on = jest.fn((event, options, callback) => {
        if (event === 'presence' && options.event === 'sync') {
          syncCallback = callback;
        }
      });

      mockChannel.presenceState = jest.fn(() => mockPresenceState);

      const { result } = renderHook(() => 
        usePlayerPresence({ playDateId: 'play-date-123', enabled: true })
      );

      // Simulate sync event
      act(() => {
        syncCallback();
      });

      expect(result.current.playerPresence).toEqual({
        'player-123': {
          player_id: 'player-123',
          player_name: 'Test User',
          is_online: true,
          last_seen: expect.any(String),
          current_match_id: undefined,
          is_playing: false,
        },
      });
    });
  });

  describe('heartbeat functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should start heartbeat on successful subscription', async () => {
      const mockTrack = jest.fn().mockResolvedValue(undefined);
      mockChannel.track = mockTrack;

      const mockSubscribe = jest.fn((callback) => {
        callback('SUBSCRIBED');
        return 'success';
      });
      mockChannel.subscribe = mockSubscribe;

      renderHook(() => 
        usePlayerPresence({ 
          playDateId: 'play-date-123', 
          enabled: true,
          heartbeatInterval: 1000,
        })
      );

      await act(async () => {
        // Wait for subscription callback
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Clear initial track call
      mockTrack.mockClear();

      // Advance timer for heartbeat
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockTrack).toHaveBeenCalledWith({
        player_id: 'player-123',
        player_name: 'test@example.com',
        current_match_id: undefined,
        is_playing: false,
        last_seen: expect.any(String),
      });
    });

    it('should stop heartbeat on cleanup', () => {
      const { unmount } = renderHook(() => 
        usePlayerPresence({ 
          playDateId: 'play-date-123', 
          enabled: true,
          heartbeatInterval: 1000,
        })
      );

      unmount();

      expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('connection state management', () => {
    it('should update connection state based on subscription status', async () => {
      let subscriptionCallback: Function;
      const mockSubscribe = jest.fn((callback) => {
        subscriptionCallback = callback;
        return 'success';
      });
      mockChannel.subscribe = mockSubscribe;

      const { result } = renderHook(() => 
        usePlayerPresence({ playDateId: 'play-date-123', enabled: true })
      );

      // Initially disconnected
      expect(result.current.connectionState).toBe('disconnected');

      // Simulate successful subscription
      await act(async () => {
        subscriptionCallback('SUBSCRIBED');
      });

      expect(result.current.connectionState).toBe('connected');
      expect(result.current.isActive).toBe(true);

      // Simulate error
      await act(async () => {
        subscriptionCallback('CHANNEL_ERROR');
      });

      expect(result.current.connectionState).toBe('error');
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('offline detection', () => {
    it('should mark players as offline after timeout', () => {
      const oldDate = new Date(Date.now() - 120000); // 2 minutes ago
      const mockPresenceState = {
        'user-123': [{
          player_id: 'player-123',
          player_name: 'Test User',
          is_playing: false,
          last_seen: oldDate.toISOString(),
        }],
      };

      let syncCallback: Function;
      mockChannel.on = jest.fn((event, options, callback) => {
        if (event === 'presence' && options.event === 'sync') {
          syncCallback = callback;
        }
      });

      mockChannel.presenceState = jest.fn(() => mockPresenceState);

      const { result } = renderHook(() => 
        usePlayerPresence({ 
          playDateId: 'play-date-123', 
          enabled: true,
          offlineTimeout: 60000, // 1 minute
        })
      );

      // Simulate sync event
      act(() => {
        syncCallback();
      });

      expect(result.current.playerPresence['player-123'].is_online).toBe(false);
    });
  });
});

describe('usePlayerPresenceStatus', () => {
  it('should return status for specific player', () => {
    // Mock the main hook
    const mockPlayerPresence = {
      'player-123': {
        player_id: 'player-123',
        player_name: 'Test User',
        is_online: true,
        last_seen: new Date().toISOString(),
        current_match_id: 'match-456',
        is_playing: true,
      },
    };

    jest.doMock('../usePlayerPresence', () => ({
      usePlayerPresence: () => ({
        playerPresence: mockPlayerPresence,
      }),
    }));

    const { result } = renderHook(() => 
      usePlayerPresenceStatus('play-date-123', 'player-123')
    );

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentMatchId).toBe('match-456');
    expect(result.current.lastSeen).toBeDefined();
  });

  it('should return false values for non-existent player', () => {
    jest.doMock('../usePlayerPresence', () => ({
      usePlayerPresence: () => ({
        playerPresence: {},
      }),
    }));

    const { result } = renderHook(() => 
      usePlayerPresenceStatus('play-date-123', 'non-existent-player')
    );

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentMatchId).toBeUndefined();
    expect(result.current.lastSeen).toBeUndefined();
  });
});

describe('useOnlinePlayersCount', () => {
  it('should return correct counts', () => {
    const mockPlayerPresence = {
      'player-1': {
        player_id: 'player-1',
        player_name: 'Player 1',
        is_online: true,
        last_seen: new Date().toISOString(),
        current_match_id: 'match-1',
        is_playing: true,
      },
      'player-2': {
        player_id: 'player-2',
        player_name: 'Player 2',
        is_online: true,
        last_seen: new Date().toISOString(),
        current_match_id: undefined,
        is_playing: false,
      },
      'player-3': {
        player_id: 'player-3',
        player_name: 'Player 3',
        is_online: false,
        last_seen: new Date().toISOString(),
        current_match_id: undefined,
        is_playing: false,
      },
    };

    jest.doMock('../usePlayerPresence', () => ({
      usePlayerPresence: () => ({
        playerPresence: mockPlayerPresence,
      }),
    }));

    const { result } = renderHook(() => 
      useOnlinePlayersCount('play-date-123')
    );

    expect(result.current.onlineCount).toBe(2);
    expect(result.current.playingCount).toBe(1);
  });
});