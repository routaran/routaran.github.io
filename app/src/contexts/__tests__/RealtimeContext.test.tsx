import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  RealtimeProvider,
  useRealtime,
  useRealtimeConnectionState,
  useIsRealtimeConnected,
  useRealtimeReconnect,
  useRealtimeConnectionChange,
} from '../RealtimeContext';
import * as realtimeModule from '../../lib/supabase/realtime';

// Mock the realtime module
vi.mock('../../lib/supabase/realtime');
vi.mock('../../lib/logger');

describe('RealtimeProvider', () => {
  let mockStateListeners: Set<(state: realtimeModule.ConnectionState) => void>;

  beforeEach(() => {
    mockStateListeners = new Set();
    
    vi.mocked(realtimeModule.onConnectionStateChange).mockImplementation((callback) => {
      mockStateListeners.add(callback);
      // Immediately call with current state
      callback('disconnected');
      return () => mockStateListeners.delete(callback);
    });

    vi.mocked(realtimeModule.reconnect).mockImplementation(() => {
      // Simulate connection process
      mockStateListeners.forEach(listener => listener('connecting'));
      setTimeout(() => {
        mockStateListeners.forEach(listener => listener('connected'));
      }, 100);
    });
  });

  const wrapper = ({ children, ...props }: any) => (
    <RealtimeProvider {...props}>{children}</RealtimeProvider>
  );

  describe('provider behavior', () => {
    it('should provide connection state', () => {
      const { result } = renderHook(() => useRealtime(), { wrapper });
      
      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isReconnecting).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('should auto-connect on mount when enabled', async () => {
      vi.useFakeTimers();
      
      renderHook(() => useRealtime(), { 
        wrapper: (props: any) => <RealtimeProvider autoConnect={true} {...props} />,
      });

      // Wait for auto-connect delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(vi.mocked(realtimeModule.reconnect)).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should not auto-connect when disabled', async () => {
      vi.useFakeTimers();
      
      renderHook(() => useRealtime(), { 
        wrapper: (props: any) => <RealtimeProvider autoConnect={false} {...props} />,
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(vi.mocked(realtimeModule.reconnect)).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should call onConnectionStateChange callback', () => {
      const onStateChange = vi.fn();
      
      renderHook(() => useRealtime(), { 
        wrapper: (props: any) => (
          <RealtimeProvider onConnectionStateChange={onStateChange} {...props} />
        ),
      });

      expect(onStateChange).toHaveBeenCalledWith('disconnected');

      // Simulate state change
      act(() => {
        mockStateListeners.forEach(listener => listener('connecting'));
      });

      expect(onStateChange).toHaveBeenCalledWith('connecting');
    });

    it('should clean up on unmount', () => {
      const { unmount } = renderHook(() => useRealtime(), { wrapper });

      unmount();

      expect(vi.mocked(realtimeModule.unsubscribeAll)).toHaveBeenCalled();
    });
  });

  describe('connection state updates', () => {
    it('should update derived states correctly', () => {
      const { result } = renderHook(() => useRealtime(), { wrapper });

      // Test connecting state
      act(() => {
        mockStateListeners.forEach(listener => listener('connecting'));
      });
      expect(result.current.isConnecting).toBe(true);
      expect(result.current.isConnected).toBe(false);

      // Test connected state
      act(() => {
        mockStateListeners.forEach(listener => listener('connected'));
      });
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);

      // Test reconnecting state
      act(() => {
        mockStateListeners.forEach(listener => listener('reconnecting'));
      });
      expect(result.current.isReconnecting).toBe(true);

      // Test error state
      act(() => {
        mockStateListeners.forEach(listener => listener('error'));
      });
      expect(result.current.hasError).toBe(true);
    });

    it('should handle reconnect function', async () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => useRealtime(), { wrapper });

      act(() => {
        result.current.reconnect();
      });

      expect(vi.mocked(realtimeModule.reconnect)).toHaveBeenCalled();

      // Verify state transitions
      expect(result.current.connectionState).toBe('connecting');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(result.current.connectionState).toBe('connected');
      
      vi.useRealTimers();
    });
  });

  describe('hook errors', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useRealtime());
      }).toThrow('useRealtime must be used within a RealtimeProvider');
      
      consoleSpy.mockRestore();
    });
  });
});

describe('useRealtimeConnectionState', () => {
  const wrapper = ({ children }: any) => (
    <RealtimeProvider>{children}</RealtimeProvider>
  );

  it('should return current connection state', () => {
    const { result } = renderHook(() => useRealtimeConnectionState(), { wrapper });
    expect(result.current).toBe('disconnected');
  });
});

describe('useIsRealtimeConnected', () => {
  let mockStateListeners: Set<(state: realtimeModule.ConnectionState) => void>;

  beforeEach(() => {
    mockStateListeners = new Set();
    
    vi.mocked(realtimeModule.onConnectionStateChange).mockImplementation((callback) => {
      mockStateListeners.add(callback);
      callback('disconnected');
      return () => mockStateListeners.delete(callback);
    });
  });

  const wrapper = ({ children }: any) => (
    <RealtimeProvider>{children}</RealtimeProvider>
  );

  it('should return connection boolean', () => {
    const { result } = renderHook(() => useIsRealtimeConnected(), { wrapper });
    expect(result.current).toBe(false);

    act(() => {
      mockStateListeners.forEach(listener => listener('connected'));
    });

    expect(result.current).toBe(true);
  });
});

describe('useRealtimeReconnect', () => {
  const wrapper = ({ children }: any) => (
    <RealtimeProvider>{children}</RealtimeProvider>
  );

  it('should return reconnect function', () => {
    const { result } = renderHook(() => useRealtimeReconnect(), { wrapper });
    
    act(() => {
      result.current();
    });

    expect(vi.mocked(realtimeModule.reconnect)).toHaveBeenCalled();
  });
});

describe('useRealtimeConnectionChange', () => {
  let mockStateListeners: Set<(state: realtimeModule.ConnectionState) => void>;

  beforeEach(() => {
    mockStateListeners = new Set();
    
    vi.mocked(realtimeModule.onConnectionStateChange).mockImplementation((callback) => {
      mockStateListeners.add(callback);
      callback('disconnected');
      return () => mockStateListeners.delete(callback);
    });
  });

  const wrapper = ({ children }: any) => (
    <RealtimeProvider>{children}</RealtimeProvider>
  );

  it('should call callback on connection state changes', () => {
    const callback = vi.fn();
    
    renderHook(() => useRealtimeConnectionChange(callback), { wrapper });

    // Should be called immediately with current state
    expect(callback).toHaveBeenCalledWith('disconnected');

    // Simulate state change
    act(() => {
      mockStateListeners.forEach(listener => listener('connecting'));
    });

    expect(callback).toHaveBeenCalledWith('connecting');

    act(() => {
      mockStateListeners.forEach(listener => listener('connected'));
    });

    expect(callback).toHaveBeenCalledWith('connected');
  });

  it('should update callback when it changes', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    const { rerender } = renderHook(
      ({ callback }) => useRealtimeConnectionChange(callback),
      { 
        wrapper,
        initialProps: { callback: callback1 },
      }
    );

    expect(callback1).toHaveBeenCalledWith('disconnected');
    expect(callback2).not.toHaveBeenCalled();

    // Change callback
    rerender({ callback: callback2 });

    // New callback should be called with current state
    expect(callback2).toHaveBeenCalledWith('disconnected');

    // Only new callback should be called on state change
    callback1.mockClear();
    callback2.mockClear();

    act(() => {
      mockStateListeners.forEach(listener => listener('connected'));
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith('connected');
  });
});