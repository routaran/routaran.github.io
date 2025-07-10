import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSchedule } from '../useSchedule';
import { db, realtime } from '../../lib/supabase';
import { generateRoundRobinSchedule } from '../../lib/algorithms/scheduling';

// Mock dependencies
vi.mock('../../lib/supabase');
vi.mock('../../lib/algorithms/scheduling');
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockDb = db as vi.Mocked<typeof db>;
const mockRealtime = realtime as vi.Mocked<typeof realtime>;
const mockGenerateSchedule = generateRoundRobinSchedule as vi.MockedFunction<typeof generateRoundRobinSchedule>;

const mockPlayDateData = {
  id: 'play-date-1',
  name: 'Test Tournament',
  players: [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'David' },
  ],
  partnerships: [
    { id: 'partnership1', player1_id: 'p1', player2_id: 'p2' },
    { id: 'partnership2', player1_id: 'p3', player2_id: 'p4' },
  ],
  matches: [],
};

const mockMatches = [
  {
    id: 'match1',
    partnership1_id: 'partnership1',
    partnership2_id: 'partnership2',
    team1_score: 11,
    team2_score: 9,
    court_number: 1,
    round_number: 1,
    version: 1,
  },
];

const mockCourts = [
  { id: 'court1', number: 1, name: 'Court 1' },
  { id: 'court2', number: 2, name: 'Court 2' },
];

const mockGeneratedRounds = [
  {
    number: 1,
    matches: [
      {
        id: 'gen-match1',
        partnership1: {
          id: 'partnership1',
          player1: { id: 'p1', name: 'Alice' },
          player2: { id: 'p2', name: 'Bob' },
        },
        partnership2: {
          id: 'partnership2',
          player1: { id: 'p3', name: 'Charlie' },
          player2: { id: 'p4', name: 'David' },
        },
        round: 1,
      },
    ],
    byePartnership: null,
  },
];

describe('useSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockDb.getPlayDate.mockResolvedValue(mockPlayDateData);
    mockDb.getMatches.mockResolvedValue(mockMatches);
    mockDb.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCourts,
            error: null,
          }),
        }),
      }),
    });
    
    mockGenerateSchedule.mockReturnValue(mockGeneratedRounds);
    
    mockRealtime.subscribeToMatches.mockReturnValue({
      unsubscribe: vi.fn(),
    } as any);
  });

  it('fetches and returns schedule data', async () => {
    const { result } = renderHook(() => useSchedule('play-date-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rounds).toHaveLength(1);
    expect(result.current.courts).toEqual(mockCourts);
    expect(result.current.error).toBeNull();
  });

  it('merges database match data with generated schedule', async () => {
    const { result } = renderHook(() => useSchedule('play-date-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstMatch = result.current.rounds?.[0].matches[0];
    expect(firstMatch?.id).toBe('match1'); // From database
    expect(firstMatch?.team1_score).toBe(11);
    expect(firstMatch?.team2_score).toBe(9);
    expect(firstMatch?.version).toBe(1);
  });

  it('calculates current round correctly', async () => {
    // Set up matches with one incomplete
    const matchesWithIncomplete = [
      ...mockMatches,
      {
        id: 'match2',
        partnership1_id: 'partnership1',
        partnership2_id: 'partnership2',
        team1_score: null,
        team2_score: null,
        court_number: 2,
        round_number: 2,
        version: 0,
      },
    ];
    
    mockDb.getMatches.mockResolvedValue(matchesWithIncomplete);
    
    mockGenerateSchedule.mockReturnValue([
      ...mockGeneratedRounds,
      {
        number: 2,
        matches: [
          {
            id: 'gen-match2',
            partnership1: mockGeneratedRounds[0].matches[0].partnership1,
            partnership2: mockGeneratedRounds[0].matches[0].partnership2,
            round: 2,
          },
        ],
        byePartnership: null,
      },
    ]);

    const { result } = renderHook(() => useSchedule('play-date-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentRound).toBe(2);
  });

  it('handles fetch errors', async () => {
    mockDb.getPlayDate.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSchedule('play-date-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(new Error('Network error'));
    expect(result.current.rounds).toBeNull();
  });

  it('handles court fetch errors gracefully', async () => {
    mockDb.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Court fetch failed' },
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useSchedule('play-date-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toContain('Failed to fetch courts');
  });

  it('sets up real-time subscription', async () => {
    renderHook(() => useSchedule('play-date-1'));

    await waitFor(() => {
      expect(mockRealtime.subscribeToMatches).toHaveBeenCalledWith(
        'play-date-1',
        expect.any(Function)
      );
    });
  });

  it('refetches data on real-time update', async () => {
    let realtimeCallback: any;
    mockRealtime.subscribeToMatches.mockImplementation((_, callback) => {
      realtimeCallback = callback;
      return { unsubscribe: vi.fn() } as any;
    });

    const { result } = renderHook(() => useSchedule('play-date-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear previous calls
    mockDb.getPlayDate.mockClear();

    // Trigger real-time update
    realtimeCallback({ eventType: 'UPDATE' });

    await waitFor(() => {
      expect(mockDb.getPlayDate).toHaveBeenCalledTimes(1);
    });
  });

  it('unsubscribes from real-time on unmount', async () => {
    const unsubscribeMock = vi.fn();
    const subscriptionMock = { unsubscribe: unsubscribeMock };
    mockRealtime.subscribeToMatches.mockReturnValue(subscriptionMock as any);
    mockRealtime.unsubscribe.mockImplementation(() => {});

    const { unmount } = renderHook(() => useSchedule('play-date-1'));

    await waitFor(() => {
      expect(mockRealtime.subscribeToMatches).toHaveBeenCalled();
    });

    unmount();

    expect(mockRealtime.unsubscribe).toHaveBeenCalledWith(subscriptionMock);
  });

  it('refetch function works correctly', async () => {
    const { result } = renderHook(() => useSchedule('play-date-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Clear previous calls
    mockDb.getPlayDate.mockClear();

    // Call refetch
    await result.current.refetch();

    expect(mockDb.getPlayDate).toHaveBeenCalledWith('play-date-1');
  });

  it('handles partnerships without matching players gracefully', async () => {
    const incompleteData = {
      ...mockPlayDateData,
      players: [{ id: 'p1', name: 'Alice' }], // Missing other players
    };
    
    mockDb.getPlayDate.mockResolvedValue(incompleteData);

    const { result } = renderHook(() => useSchedule('play-date-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should still generate schedule with "Unknown" placeholders
    expect(result.current.rounds).toBeDefined();
    expect(result.current.error).toBeNull();
  });
});