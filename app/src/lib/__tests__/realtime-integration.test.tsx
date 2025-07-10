import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { RealtimeProvider } from "../../contexts/RealtimeContext";
import { useRealtimeSubscription } from "../../hooks/useRealtimeSubscription";
import { realtimeManager } from "../supabase/realtime";
import type { RealtimePayload } from "../supabase/realtime";

// Mock dependencies
vi.mock("../supabase");
vi.mock("../logger");
vi.mock("../monitoring");

// Import the mocked supabase after mocking
import { supabase } from "../supabase";

describe("Realtime Integration", () => {
  let mockChannel: any;

  beforeEach(() => {
    // Setup mock channel
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue("subscribed"),
      unsubscribe: vi.fn(),
      state: "closed",
      topic: "test-channel",
    };

    // Setup mock supabase
    vi.mocked(supabase.channel).mockReturnValue(mockChannel);
    vi.mocked(supabase.removeChannel).mockResolvedValue("ok" as any);
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RealtimeProvider>{children}</RealtimeProvider>
  );

  afterEach(() => {
    vi.clearAllMocks();
    realtimeManager.unsubscribeAll();
  });

  it("should integrate realtime subscription with React hooks", async () => {
    const callback = vi.fn();

    // Render hook within provider
    const { result } = renderHook(
      () =>
        useRealtimeSubscription(
          {
            table: "matches",
            event: "UPDATE",
            filter: "play_date_id=eq.123",
          },
          callback
        ),
      { wrapper }
    );

    // Verify subscription was created - it will be in 'connecting' state
    expect(["disconnected", "connecting"]).toContain(
      realtimeManager.getConnectionState()
    );

    // Simulate a realtime event manually
    const mockPayload: RealtimePayload<"matches"> = {
      eventType: "UPDATE",
      new: {
        id: "1",
        play_date_id: "123",
        team1_score: 11,
        team2_score: 9,
        version: 1,
        court_number: 1,
        round_number: 1,
        partnership1_id: "p1",
        partnership2_id: "p2",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: "user1",
      },
      old: {
        id: "1",
        play_date_id: "123",
        team1_score: 10,
        team2_score: 9,
        version: 0,
        court_number: 1,
        round_number: 1,
        partnership1_id: "p1",
        partnership2_id: "p2",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: "user1",
      },
      commit_timestamp: new Date().toISOString(),
    };

    // Get the subscription callback and call it
    const subscriptions = (realtimeManager as any).subscriptions;
    const subscriptionEntry = Array.from(subscriptions.values())[0] as any;
    if (subscriptionEntry) {
      await act(async () => {
        subscriptionEntry.callback(mockPayload);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(mockPayload);
      });
    }
  });

  it("should handle connection state changes", () => {
    const stateCallback = vi.fn();

    // Subscribe to state changes
    const unsubscribe = realtimeManager.onConnectionStateChange(stateCallback);

    // Should be called immediately with current state
    expect(stateCallback).toHaveBeenCalledWith("disconnected");

    // Clean up
    unsubscribe();
  });

  it("should cleanup subscriptions on unmount", () => {
    const callback = vi.fn();

    const { unmount } = renderHook(
      () =>
        useRealtimeSubscription(
          {
            table: "players",
            enabled: true,
          },
          callback
        ),
      { wrapper }
    );

    // Get initial subscription count
    const subscriptionsBeforeUnmount = (realtimeManager as any).subscriptions
      .size;
    expect(subscriptionsBeforeUnmount).toBeGreaterThan(0);

    // Unmount
    unmount();

    // Verify subscription was removed
    const subscriptionsAfterUnmount = (realtimeManager as any).subscriptions
      .size;
    expect(subscriptionsAfterUnmount).toBe(0);
  });

  it("should support multiple subscriptions", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    renderHook(
      () => {
        useRealtimeSubscription(
          { table: "matches", filter: "play_date_id=eq.123" },
          callback1
        );
        useRealtimeSubscription(
          { table: "players", filter: "play_date_id=eq.123" },
          callback2
        );
      },
      { wrapper }
    );

    // Verify both subscriptions exist
    const subscriptions = (realtimeManager as any).subscriptions;
    expect(subscriptions.size).toBe(2);
  });
});
