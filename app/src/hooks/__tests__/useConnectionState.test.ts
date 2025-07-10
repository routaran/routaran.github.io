import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useConnectionState, useSimpleConnectionState } from '../useConnectionState';
import { onConnectionStateChange } from '../../lib/supabase/realtime';

// Mock dependencies
vi.mock('../../lib/supabase/realtime');
vi.mock('../../lib/logger');
vi.mock('../../lib/monitoring');

const mockOnConnectionStateChange = onConnectionStateChange as vi.MockedFunction<typeof onConnectionStateChange>;

describe('useConnectionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useConnectionState());

      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isReconnecting).toBe(false);
      expect(result.current.metrics).toEqual({
        connectionAttempts: 0,
        successfulConnections: 0,
        failedConnections: 0,
        totalDisconnectedTime: 0,
      });
      expect(result.current.history).toEqual([]);
    });

    it('should set up connection state monitoring when enabled', () => {
      const mockUnsubscribe = vi.fn();
      mockOnConnectionStateChange.mockReturnValue(mockUnsubscribe);

      renderHook(() => useConnectionState({ enabled: true }));

      expect(mockOnConnectionStateChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not set up monitoring when disabled', () => {
      renderHook(() => useConnectionState({ enabled: false }));

      expect(mockOnConnectionStateChange).not.toHaveBeenCalled();
    });

    it('should clean up on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockOnConnectionStateChange.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useConnectionState({ enabled: true }));
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('connection state changes', () => {
    it('should update state and metrics on connection state change', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      // Simulate connecting
      act(() => {
        stateChangeCallback('connecting');
      });

      expect(result.current.connectionState).toBe('connecting');
      expect(result.current.metrics.connectionAttempts).toBe(1);
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].state).toBe('connecting');

      // Simulate connected
      act(() => {
        stateChangeCallback('connected');
      });

      expect(result.current.connectionState).toBe('connected');
      expect(result.current.isConnected).toBe(true);
      expect(result.current.metrics.successfulConnections).toBe(1);
      expect(result.current.history).toHaveLength(2);
    });

    it('should call onStateChange callback', () => {
      const mockOnStateChange = vi.fn();
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      renderHook(() => useConnectionState({ 
        enabled: true, 
        onStateChange: mockOnStateChange 
      }));

      act(() => {
        stateChangeCallback('connected');
      });

      expect(mockOnStateChange).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should call onConnectionLost callback', () => {
      const mockOnConnectionLost = vi.fn();
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      renderHook(() => useConnectionState({ 
        enabled: true, 
        onConnectionLost: mockOnConnectionLost 
      }));

      // First connect
      act(() => {
        stateChangeCallback('connected');
      });

      // Then disconnect
      act(() => {
        stateChangeCallback('disconnected');
      });

      expect(mockOnConnectionLost).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should call onConnectionRestored callback', () => {
      const mockOnConnectionRestored = vi.fn();
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      renderHook(() => useConnectionState({ 
        enabled: true, 
        onConnectionRestored: mockOnConnectionRestored 
      }));

      // First disconnect
      act(() => {
        stateChangeCallback('disconnected');
      });

      // Then connect
      act(() => {
        stateChangeCallback('connected');
      });

      expect(mockOnConnectionRestored).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('auto-reconnect functionality', () => {
    it('should schedule auto-reconnect on disconnect', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      renderHook(() => useConnectionState({ 
        enabled: true, 
        autoReconnect: true,
        autoReconnectDelay: 1000,
      }));

      // Simulate disconnect
      act(() => {
        stateChangeCallback('disconnected');
      });

      // Check that timer was set
      expect(vi.getTimerCount()).toBe(1);
    });

    it('should not auto-reconnect when disabled', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      renderHook(() => useConnectionState({ 
        enabled: true, 
        autoReconnect: false,
      }));

      // Simulate disconnect
      act(() => {
        stateChangeCallback('disconnected');
      });

      // Check that no timer was set
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should respect max auto-reconnect attempts', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      renderHook(() => useConnectionState({ 
        enabled: true, 
        autoReconnect: true,
        maxAutoReconnectAttempts: 2,
        autoReconnectDelay: 1000,
      }));

      // Simulate multiple disconnects
      act(() => {
        stateChangeCallback('disconnected');
      });
      
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        stateChangeCallback('disconnected');
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Third disconnect should not schedule reconnect
      act(() => {
        stateChangeCallback('disconnected');
      });

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('connection quality calculation', () => {
    it('should calculate connection quality based on metrics', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      // Simulate some connection attempts
      act(() => {
        stateChangeCallback('connecting');
      });

      act(() => {
        stateChangeCallback('connected');
      });

      act(() => {
        stateChangeCallback('connecting');
      });

      act(() => {
        stateChangeCallback('connected');
      });

      const quality = result.current.getConnectionQuality();
      expect(quality).toBeGreaterThan(0);
      expect(quality).toBeLessThanOrEqual(100);
    });

    it('should return 0 quality with no connection attempts', () => {
      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      const quality = result.current.getConnectionQuality();
      expect(quality).toBe(0);
    });
  });

  describe('metrics tracking', () => {
    it('should track connection attempts correctly', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      act(() => {
        stateChangeCallback('connecting');
      });

      act(() => {
        stateChangeCallback('connecting');
      });

      expect(result.current.metrics.connectionAttempts).toBe(2);
    });

    it('should track successful connections', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      act(() => {
        stateChangeCallback('connected');
      });

      act(() => {
        stateChangeCallback('connected');
      });

      expect(result.current.metrics.successfulConnections).toBe(2);
    });

    it('should track failed connections', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      act(() => {
        stateChangeCallback('error');
      });

      act(() => {
        stateChangeCallback('error');
      });

      expect(result.current.metrics.failedConnections).toBe(2);
    });

    it('should track disconnection time', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      // Connect first
      act(() => {
        stateChangeCallback('connected');
      });

      // Disconnect
      act(() => {
        stateChangeCallback('disconnected');
      });

      // Advance time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Reconnect
      act(() => {
        stateChangeCallback('connected');
      });

      expect(result.current.metrics.totalDisconnectedTime).toBeGreaterThan(0);
    });
  });

  describe('manual reconnect', () => {
    it('should provide manual reconnect function', () => {
      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      expect(typeof result.current.reconnect).toBe('function');
    });

    it('should clear auto-reconnect timer on manual reconnect', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ 
        enabled: true, 
        autoReconnect: true,
        autoReconnectDelay: 5000,
      }));

      // Simulate disconnect to start auto-reconnect timer
      act(() => {
        stateChangeCallback('disconnected');
      });

      expect(vi.getTimerCount()).toBe(1);

      // Manual reconnect should clear timer
      act(() => {
        result.current.reconnect();
      });

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('reset metrics', () => {
    it('should reset all metrics and history', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      // Generate some metrics
      act(() => {
        stateChangeCallback('connecting');
      });

      act(() => {
        stateChangeCallback('connected');
      });

      act(() => {
        stateChangeCallback('error');
      });

      expect(result.current.metrics.connectionAttempts).toBeGreaterThan(0);
      expect(result.current.history).toHaveLength(3);

      // Reset metrics
      act(() => {
        result.current.resetMetrics();
      });

      expect(result.current.metrics).toEqual({
        connectionAttempts: 0,
        successfulConnections: 0,
        failedConnections: 0,
        totalDisconnectedTime: 0,
      });
      expect(result.current.history).toEqual([]);
    });
  });

  describe('history management', () => {
    it('should maintain connection history with timestamps', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      act(() => {
        stateChangeCallback('connecting');
      });

      act(() => {
        stateChangeCallback('connected');
      });

      expect(result.current.history).toHaveLength(2);
      expect(result.current.history[0].state).toBe('connected');
      expect(result.current.history[0].timestamp).toBeInstanceOf(Date);
      expect(result.current.history[1].state).toBe('connecting');
    });

    it('should limit history to 10 entries', () => {
      let stateChangeCallback: Function;
      mockOnConnectionStateChange.mockImplementation((callback) => {
        stateChangeCallback = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useConnectionState({ enabled: true }));

      // Generate more than 10 history entries
      for (let i = 0; i < 15; i++) {
        act(() => {
          stateChangeCallback(i % 2 === 0 ? 'connecting' : 'connected');
        });
      }

      expect(result.current.history).toHaveLength(10);
    });
  });
});

describe('useSimpleConnectionState', () => {
  it('should provide simplified interface', () => {
    const mockUnsubscribe = vi.fn();
    mockOnConnectionStateChange.mockReturnValue(mockUnsubscribe);

    const { result } = renderHook(() => useSimpleConnectionState());

    expect(result.current).toHaveProperty('connectionState');
    expect(result.current).toHaveProperty('isConnected');
    expect(result.current).toHaveProperty('isReconnecting');
    expect(result.current).toHaveProperty('reconnect');
    expect(result.current).not.toHaveProperty('metrics');
    expect(result.current).not.toHaveProperty('history');
  });
});