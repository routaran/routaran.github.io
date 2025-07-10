import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { 
  useRealtimeSubscription, 
  useRealtimeSubscriptions,
  useTableSubscription,
} from '../useRealtimeSubscription';
import * as realtimeModule from '../../lib/supabase/realtime';

// Mock the realtime module
vi.mock('../../lib/supabase/realtime');
vi.mock('../../lib/logger');

describe('useRealtimeSubscription', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUnsubscribe = vi.fn();
    vi.mocked(realtimeModule.subscribeToTable).mockReturnValue(mockUnsubscribe);
  });

  it('should subscribe on mount and unsubscribe on unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      useRealtimeSubscription(
        {
          table: 'matches',
          event: 'UPDATE',
          filter: 'play_date_id=eq.123',
        },
        callback
      )
    );

    // Check subscription was created
    expect(vi.mocked(realtimeModule.subscribeToTable)).toHaveBeenCalledWith(
      expect.stringContaining('matches-UPDATE-play_date_id=eq.123'),
      expect.objectContaining({
        table: 'matches',
        event: 'UPDATE',
        filter: 'play_date_id=eq.123',
        callback: expect.any(Function),
        onError: expect.any(Function),
      })
    );

    // Unmount and check cleanup
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should not subscribe when disabled', () => {
    const callback = vi.fn();
    renderHook(() =>
      useRealtimeSubscription(
        {
          table: 'matches',
          enabled: false,
        },
        callback
      )
    );

    expect(vi.mocked(realtimeModule.subscribeToTable)).not.toHaveBeenCalled();
  });

  it('should resubscribe when options change', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ filter }) =>
        useRealtimeSubscription(
          {
            table: 'matches',
            filter,
          },
          callback
        ),
      { initialProps: { filter: 'play_date_id=eq.123' } }
    );

    expect(vi.mocked(realtimeModule.subscribeToTable)).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    // Change filter
    rerender({ filter: 'play_date_id=eq.456' });

    // Should unsubscribe old and create new subscription
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.mocked(realtimeModule.subscribeToTable)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(realtimeModule.subscribeToTable)).toHaveBeenLastCalledWith(
      expect.stringContaining('matches-*-play_date_id=eq.456'),
      expect.objectContaining({
        filter: 'play_date_id=eq.456',
      })
    );
  });

  it('should use latest callback without resubscribing', () => {
    let capturedCallback: any;
    vi.mocked(realtimeModule.subscribeToTable).mockImplementation((id, config) => {
      capturedCallback = config.callback;
      return mockUnsubscribe;
    });

    const { rerender } = renderHook(
      ({ callback }) =>
        useRealtimeSubscription(
          {
            table: 'matches',
          },
          callback
        ),
      { initialProps: { callback: vi.fn() } }
    );

    const newCallback = vi.fn();
    rerender({ callback: newCallback });

    // Should not resubscribe
    expect(vi.mocked(realtimeModule.subscribeToTable)).toHaveBeenCalledTimes(1);

    // Test that new callback is used
    const payload = { eventType: 'UPDATE', new: { id: '1' } };
    capturedCallback(payload);
    expect(newCallback).toHaveBeenCalledWith(payload);
  });

  it('should handle errors with custom error handler', () => {
    let capturedOnError: any;
    vi.mocked(realtimeModule.subscribeToTable).mockImplementation((id, config) => {
      capturedOnError = config.onError;
      return mockUnsubscribe;
    });

    const onError = vi.fn();
    renderHook(() =>
      useRealtimeSubscription(
        {
          table: 'matches',
          onError,
        },
        vi.fn()
      )
    );

    const error = new Error('Test error');
    capturedOnError(error);
    expect(onError).toHaveBeenCalledWith(error);
  });
});

describe('useRealtimeSubscriptions', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUnsubscribe = vi.fn();
    vi.mocked(realtimeModule.subscribeToTable).mockReturnValue(mockUnsubscribe);
  });

  it('should handle multiple subscriptions', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    renderHook(() =>
      useRealtimeSubscriptions([
        {
          table: 'matches',
          filter: 'play_date_id=eq.123',
          callback: callback1,
        },
        {
          table: 'players',
          filter: 'play_date_id=eq.123',
          callback: callback2,
        },
      ])
    );

    expect(vi.mocked(realtimeModule.subscribeToTable)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(realtimeModule.subscribeToTable)).toHaveBeenCalledWith(
      expect.stringContaining('matches'),
      expect.objectContaining({
        table: 'matches',
        filter: 'play_date_id=eq.123',
      })
    );
    expect(vi.mocked(realtimeModule.subscribeToTable)).toHaveBeenCalledWith(
      expect.stringContaining('players'),
      expect.objectContaining({
        table: 'players',
        filter: 'play_date_id=eq.123',
      })
    );
  });

  it('should respect enabled flag for all subscriptions', () => {
    renderHook(() =>
      useRealtimeSubscriptions(
        [
          {
            table: 'matches',
            callback: vi.fn(),
          },
          {
            table: 'players',
            callback: vi.fn(),
          },
        ],
        false // disabled
      )
    );

    expect(vi.mocked(realtimeModule.subscribeToTable)).not.toHaveBeenCalled();
  });
});

describe('useTableSubscription', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let capturedCallback: any;

  beforeEach(() => {
    mockUnsubscribe = vi.fn();
    vi.mocked(realtimeModule.subscribeToTable).mockImplementation((id, config) => {
      capturedCallback = config.callback;
      return mockUnsubscribe;
    });
  });

  it('should handle INSERT events', () => {
    const onInsert = vi.fn();
    renderHook(() =>
      useTableSubscription('matches', {
        onInsert,
      })
    );

    const newRecord = { id: '1', team1_score: 11 };
    capturedCallback({
      eventType: 'INSERT',
      new: newRecord,
    });

    expect(onInsert).toHaveBeenCalledWith(newRecord);
  });

  it('should handle UPDATE events', () => {
    const onUpdate = vi.fn();
    renderHook(() =>
      useTableSubscription('matches', {
        onUpdate,
      })
    );

    const oldRecord = { id: '1', team1_score: 10 };
    const newRecord = { id: '1', team1_score: 11 };
    capturedCallback({
      eventType: 'UPDATE',
      old: oldRecord,
      new: newRecord,
    });

    expect(onUpdate).toHaveBeenCalledWith(newRecord, oldRecord);
  });

  it('should handle DELETE events', () => {
    const onDelete = vi.fn();
    renderHook(() =>
      useTableSubscription('matches', {
        onDelete,
      })
    );

    const deletedRecord = { id: '1', team1_score: 11 };
    capturedCallback({
      eventType: 'DELETE',
      old: deletedRecord,
    });

    expect(onDelete).toHaveBeenCalledWith(deletedRecord);
  });

  it('should apply filter to subscription', () => {
    renderHook(() =>
      useTableSubscription('matches', {
        filter: 'play_date_id=eq.123',
        onInsert: vi.fn(),
      })
    );

    expect(vi.mocked(realtimeModule.subscribeToTable)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        table: 'matches',
        filter: 'play_date_id=eq.123',
      })
    );
  });

  it('should handle multiple event handlers', () => {
    const onInsert = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();

    renderHook(() =>
      useTableSubscription('matches', {
        onInsert,
        onUpdate,
        onDelete,
      })
    );

    // Test all event types
    const record = { id: '1', team1_score: 11 };
    
    capturedCallback({
      eventType: 'INSERT',
      new: record,
    });
    expect(onInsert).toHaveBeenCalledWith(record);

    capturedCallback({
      eventType: 'UPDATE',
      old: record,
      new: { ...record, team1_score: 12 },
    });
    expect(onUpdate).toHaveBeenCalled();

    capturedCallback({
      eventType: 'DELETE',
      old: record,
    });
    expect(onDelete).toHaveBeenCalledWith(record);
  });

  it('should only call provided handlers', () => {
    const onInsert = vi.fn();
    
    renderHook(() =>
      useTableSubscription('matches', {
        onInsert,
        // No onUpdate or onDelete
      })
    );

    // Should not throw when UPDATE event occurs
    expect(() => {
      capturedCallback({
        eventType: 'UPDATE',
        old: { id: '1' },
        new: { id: '1' },
      });
    }).not.toThrow();

    expect(onInsert).not.toHaveBeenCalled();
  });

  it('should handle custom error handler', () => {
    const onError = vi.fn();
    renderHook(() =>
      useTableSubscription('matches', {
        onError,
        onInsert: vi.fn(),
      })
    );

    // Get the actual call to check the onError is passed through
    const [, config] = vi.mocked(realtimeModule.subscribeToTable).mock.calls[0];
    
    // The onError from the hook wraps the user's onError
    // Call it to verify it calls the user's onError
    const testError = new Error('Test error');
    config.onError!(testError);
    
    expect(onError).toHaveBeenCalledWith(testError);
  });
});