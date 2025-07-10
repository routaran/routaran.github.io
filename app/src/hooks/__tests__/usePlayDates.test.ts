import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePlayDates } from "../usePlayDates";
import { useAuth } from "../useAuth";
import { useRealtime } from "../../contexts/RealtimeContext";
import * as playDatesLib from "../../lib/supabase/playDates";
import * as realtimeLib from "../../lib/supabase/realtime";

// Mock dependencies
vi.mock("../useAuth");
vi.mock("../../contexts/RealtimeContext");
vi.mock("../../lib/supabase/playDates");
vi.mock("../../lib/supabase/realtime");

const mockUseAuth = useAuth as any;
const mockUseRealtime = useRealtime as any;
const mockGetPlayDates = vi.mocked(playDatesLib.getPlayDates);
const mockSubscribeToTable = vi.mocked(realtimeLib.subscribeToTable);
const mockUnsubscribeFromTable = vi.mocked(realtimeLib.unsubscribeFromTable);

describe("usePlayDates", () => {
  const mockPlayer = {
    id: "player1",
    name: "Test Player",
    email: "test@example.com",
    project_owner: false,
  };

  const mockPlayDates = [
    {
      id: "1",
      date: "2024-01-15",
      organizer_id: "org1",
      num_courts: 2,
      win_condition: "first_to_target" as const,
      target_score: 11,
      status: "scheduled" as const,
      schedule_locked: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      version: 1,
      organizer: {
        id: "org1",
        name: "John Organizer",
        email: "john@example.com",
      },
      player_count: 8,
      match_count: 10,
      completed_matches: 0,
    },
    {
      id: "2",
      date: "2024-01-16",
      organizer_id: "org2",
      num_courts: 3,
      win_condition: "win_by_2" as const,
      target_score: 15,
      status: "active" as const,
      schedule_locked: true,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      version: 1,
      organizer: {
        id: "org2",
        name: "Jane Organizer",
        email: "jane@example.com",
      },
      player_count: 12,
      match_count: 15,
      completed_matches: 8,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      player: mockPlayer,
      isAuthenticated: true,
    });

    mockUseRealtime.mockReturnValue({
      isConnected: true,
    });

    mockGetPlayDates.mockResolvedValue({
      data: mockPlayDates,
      error: null,
    });

    mockSubscribeToTable.mockResolvedValue("subscription-id");
    mockUnsubscribeFromTable.mockImplementation(() => {});
  });

  it("fetches play dates on mount", async () => {
    const { result } = renderHook(() => usePlayDates());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetPlayDates).toHaveBeenCalledWith({
      status: undefined,
      limit: 10,
      offset: 0,
    });

    expect(result.current.playDates).toEqual(mockPlayDates);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("applies filters correctly", async () => {
    const { result } = renderHook(() =>
      usePlayDates({
        status: "active",
        onlyMyPlayDates: true,
        limit: 5,
      })
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetPlayDates).toHaveBeenCalledWith({
      status: "active",
      playerId: "player1",
      limit: 5,
      offset: 0,
    });
  });

  it("applies organizer filter", async () => {
    const { result } = renderHook(() =>
      usePlayDates({
        onlyOrganizing: true,
      })
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetPlayDates).toHaveBeenCalledWith({
      status: undefined,
      organizerId: "player1",
      limit: 10,
      offset: 0,
    });
  });

  it("handles errors", async () => {
    const error = { message: "Failed to fetch", code: "FETCH_ERROR" };
    mockGetPlayDates.mockResolvedValue({
      data: null,
      error,
    });

    const { result } = renderHook(() => usePlayDates());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.playDates).toEqual([]);
    expect(result.current.error).toEqual(error);
    expect(result.current.isLoading).toBe(false);
  });

  it("refetches data when refetch is called", async () => {
    const { result } = renderHook(() => usePlayDates());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    vi.clearAllMocks();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetPlayDates).toHaveBeenCalledTimes(1);
  });

  it("loads more data when loadMore is called", async () => {
    mockGetPlayDates.mockResolvedValueOnce({
      data: [mockPlayDates[0]],
      error: null,
    });

    const { result } = renderHook(() => usePlayDates());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.hasMore).toBe(true);

    // Mock additional data for load more
    mockGetPlayDates.mockResolvedValueOnce({
      data: [mockPlayDates[1]],
      error: null,
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockGetPlayDates).toHaveBeenCalledWith({
      status: undefined,
      limit: 10,
      offset: 10,
    });
  });

  it("sets up realtime subscriptions when connected", async () => {
    const { result } = renderHook(() => usePlayDates());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockSubscribeToTable).toHaveBeenCalledWith({
      table: "play_dates",
      filter: undefined,
      onInsert: expect.any(Function),
      onUpdate: expect.any(Function),
      onDelete: expect.any(Function),
    });

    expect(mockSubscribeToTable).toHaveBeenCalledWith({
      table: "matches",
      filter: undefined,
      onUpdate: expect.any(Function),
    });
  });

  it("handles realtime updates", async () => {
    let onUpdate: (data: any) => void;
    mockSubscribeToTable.mockImplementation((config) => {
      if (config.table === "play_dates") {
        onUpdate = config.onUpdate!;
      }
      return Promise.resolve("subscription-id");
    });

    const { result } = renderHook(() => usePlayDates());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const updatedPlayDate = { ...mockPlayDates[0], status: "active" as const };

    await act(async () => {
      onUpdate!({
        new: updatedPlayDate,
        old: mockPlayDates[0],
      });
    });

    expect(result.current.playDates[0].status).toBe("active");
  });

  it("handles realtime deletes", async () => {
    let onDelete: (data: any) => void;
    mockSubscribeToTable.mockImplementation((config) => {
      if (config.table === "play_dates") {
        onDelete = config.onDelete!;
      }
      return Promise.resolve("subscription-id");
    });

    const { result } = renderHook(() => usePlayDates());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      onDelete!({
        old: mockPlayDates[0],
      });
    });

    expect(result.current.playDates).toHaveLength(1);
    expect(result.current.playDates[0].id).toBe("2");
  });

  it("does not set up subscriptions when not connected", async () => {
    mockUseRealtime.mockReturnValue({
      isConnected: false,
    });

    const { result } = renderHook(() => usePlayDates());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockSubscribeToTable).not.toHaveBeenCalled();
  });

  it("prevents loadMore when already loading", async () => {
    const { result } = renderHook(() => usePlayDates());

    // Call loadMore while initial load is happening
    await act(async () => {
      await result.current.loadMore();
    });

    // Should not have made additional calls
    expect(mockGetPlayDates).toHaveBeenCalledTimes(1);
  });

  it("prevents loadMore when hasMore is false", async () => {
    mockGetPlayDates.mockResolvedValue({
      data: [], // Empty result indicates no more data
      error: null,
    });

    const { result } = renderHook(() => usePlayDates());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.hasMore).toBe(false);

    vi.clearAllMocks();

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockGetPlayDates).not.toHaveBeenCalled();
  });

  it("handles unauthenticated user", async () => {
    mockUseAuth.mockReturnValue({
      player: null,
      isAuthenticated: false,
    });

    const { result } = renderHook(() =>
      usePlayDates({
        onlyMyPlayDates: true,
      })
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetPlayDates).toHaveBeenCalledWith({
      status: undefined,
      playerId: undefined,
      limit: 10,
      offset: 0,
    });
  });
});
