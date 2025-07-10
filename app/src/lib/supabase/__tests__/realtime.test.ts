import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RealtimeManager, type ConnectionState } from "../realtime";
import { supabase } from "../../supabase";
import { logger } from "../../logger";
import { monitor } from "../../monitoring";

// Mock dependencies
vi.mock("../../supabase");
vi.mock("../../logger");
vi.mock("../../monitoring");

describe("RealtimeManager", () => {
  let manager: RealtimeManager;
  let mockChannel: any;
  let mockSubscription: any;

  beforeEach(() => {
    vi.useFakeTimers();

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
    vi.mocked(supabase.removeChannel).mockResolvedValue("ok");

    // Create new manager instance
    manager = new RealtimeManager({
      initialDelay: 100,
      maxDelay: 1000,
      multiplier: 2,
      maxRetries: 3,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("subscribe", () => {
    it("should create a subscription and return unsubscribe function", () => {
      const callback = vi.fn();
      const unsubscribe = manager.subscribe("test-sub", {
        table: "matches",
        event: "UPDATE",
        filter: "play_date_id=eq.123",
        callback,
      });

      expect(vi.mocked(supabase.channel)).toHaveBeenCalledWith(
        expect.stringMatching(/^realtime:matches/)
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: "play_date_id=eq.123",
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe("function");
    });

    it("should handle subscription callback execution", async () => {
      const callback = vi.fn();
      let capturedCallback: any;

      mockChannel.on.mockImplementation((event, config, cb) => {
        if (event === "postgres_changes") {
          capturedCallback = cb;
        }
        return mockChannel;
      });

      manager.subscribe("test-sub", {
        table: "matches",
        callback,
      });

      const payload = {
        eventType: "UPDATE",
        new: { id: "1", team1_score: 11 },
        old: { id: "1", team1_score: 10 },
        commit_timestamp: new Date().toISOString(),
      };

      capturedCallback(payload);

      expect(callback).toHaveBeenCalledWith(payload);
      expect(vi.mocked(monitor.recordLatency)).toHaveBeenCalled();
    });

    it("should handle callback errors", () => {
      const callback = vi.fn().mockImplementation(() => {
        throw new Error("Callback error");
      });
      const onError = vi.fn();
      let capturedCallback: any;

      mockChannel.on.mockImplementation((event, config, cb) => {
        if (event === "postgres_changes") {
          capturedCallback = cb;
        }
        return mockChannel;
      });

      manager.subscribe("test-sub", {
        table: "matches",
        callback,
        onError,
      });

      const payload = { eventType: "UPDATE", new: { id: "1" } };
      capturedCallback(payload);

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(vi.mocked(logger.error)).toHaveBeenCalled();
    });

    it("should handle async callback errors", async () => {
      const callback = vi
        .fn()
        .mockRejectedValue(new Error("Async callback error"));
      const onError = vi.fn();
      let capturedCallback: any;

      mockChannel.on.mockImplementation((event, config, cb) => {
        if (event === "postgres_changes") {
          capturedCallback = cb;
        }
        return mockChannel;
      });

      manager.subscribe("test-sub", {
        table: "matches",
        callback,
        onError,
      });

      const payload = { eventType: "UPDATE", new: { id: "1" } };
      await capturedCallback(payload);

      // Wait for promise to reject
      await vi.runAllTimersAsync();

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should reuse existing channels for same table and filter", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.subscribe("sub1", {
        table: "matches",
        filter: "play_date_id=eq.123",
        callback: callback1,
      });

      manager.subscribe("sub2", {
        table: "matches",
        filter: "play_date_id=eq.123",
        callback: callback2,
      });

      expect(vi.mocked(supabase.channel)).toHaveBeenCalledTimes(1);
    });

    it("should create different channels for different filters", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.subscribe("sub1", {
        table: "matches",
        filter: "play_date_id=eq.123",
        callback: callback1,
      });

      manager.subscribe("sub2", {
        table: "matches",
        filter: "play_date_id=eq.456",
        callback: callback2,
      });

      expect(vi.mocked(supabase.channel)).toHaveBeenCalledTimes(2);
    });

    it("should log warning for high latency", () => {
      const callback = vi.fn();
      let capturedCallback: any;

      mockChannel.on.mockImplementation((event, config, cb) => {
        if (event === "postgres_changes") {
          capturedCallback = cb;
        }
        return mockChannel;
      });

      manager.subscribe("test-sub", {
        table: "matches",
        callback,
      });

      const oldTimestamp = new Date(Date.now() - 1500).toISOString();
      const payload = {
        eventType: "UPDATE",
        new: { id: "1" },
        commit_timestamp: oldTimestamp,
      };

      capturedCallback(payload);

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        "Realtime latency exceeded 1 second",
        expect.any(Object)
      );
    });
  });

  describe("unsubscribe", () => {
    it("should remove subscription and channel if no other subscriptions", () => {
      const callback = vi.fn();
      const unsubscribe = manager.subscribe("test-sub", {
        table: "matches",
        callback,
      });

      unsubscribe();

      expect(vi.mocked(supabase.removeChannel)).toHaveBeenCalledWith(
        mockChannel
      );
    });

    it("should keep channel if other subscriptions exist", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.subscribe("sub1", {
        table: "matches",
        filter: "play_date_id=eq.123",
        callback: callback1,
      });

      const unsubscribe2 = manager.subscribe("sub2", {
        table: "matches",
        filter: "play_date_id=eq.123",
        callback: callback2,
      });

      unsubscribe2();

      expect(vi.mocked(supabase.removeChannel)).not.toHaveBeenCalled();
    });

    it("should handle unsubscribing non-existent subscription", () => {
      manager.unsubscribe("non-existent");
      expect(vi.mocked(logger.warn)).toHaveBeenCalled();
    });
  });

  describe("unsubscribeAll", () => {
    it("should remove all subscriptions and channels", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.subscribe("sub1", {
        table: "matches",
        callback: callback1,
      });

      manager.subscribe("sub2", {
        table: "players",
        callback: callback2,
      });

      manager.unsubscribeAll();

      expect(vi.mocked(supabase.removeChannel)).toHaveBeenCalledTimes(2);
    });
  });

  describe("connection state management", () => {
    it("should track connection state changes", () => {
      const stateListener = vi.fn();
      manager.onConnectionStateChange(stateListener);

      // Initial state
      expect(stateListener).toHaveBeenCalledWith("disconnected");

      // Simulate channel subscription
      mockChannel.subscribe.mockImplementation(async (callback) => {
        callback("SUBSCRIBED");
        return "ok";
      });

      manager.subscribe("test", {
        table: "matches",
        callback: vi.fn(),
      });

      expect(stateListener).toHaveBeenCalledWith("connecting");
    });

    it("should return current connection state", () => {
      expect(manager.getConnectionState()).toBe("disconnected");
    });

    it("should unsubscribe from state changes", () => {
      const stateListener = vi.fn();
      const unsubscribe = manager.onConnectionStateChange(stateListener);

      unsubscribe();

      // Try to trigger state change
      manager.subscribe("test", {
        table: "matches",
        callback: vi.fn(),
      });

      // Should only have initial call
      expect(stateListener).toHaveBeenCalledTimes(1);
    });
  });

  describe("reconnection logic", () => {
    it("should schedule reconnection on channel error", async () => {
      let errorCallback: any;

      mockChannel.on.mockImplementation((event, config, cb) => {
        if (event === "system" && config.event === "error") {
          errorCallback = cb;
        }
        return mockChannel;
      });

      manager.subscribe("test", {
        table: "matches",
        callback: vi.fn(),
      });

      errorCallback({ message: "Connection error" });

      // Should first set error state, then immediately transition to reconnecting
      expect(manager.getConnectionState()).toBe("reconnecting");

      // Fast forward to reconnection attempt
      await vi.advanceTimersByTimeAsync(100);

      expect(vi.mocked(supabase.removeChannel)).toHaveBeenCalled();
    });

    it("should use exponential backoff for reconnections", () => {
      // Just verify the logger is called with the correct delays
      let errorCallback: any;

      mockChannel.on.mockImplementation((event, config, cb) => {
        if (event === "system" && config.event === "error") {
          errorCallback = cb;
        }
        return mockChannel;
      });

      manager.subscribe("test", {
        table: "matches",
        callback: vi.fn(),
      });

      // Clear previous logs
      vi.mocked(logger.info).mockClear();

      // Trigger errors to test exponential backoff
      errorCallback({ message: "Connection error" });

      // Check first reconnection scheduled with 100ms delay
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        "Scheduling reconnection",
        expect.objectContaining({
          metadata: expect.objectContaining({
            attempt: 1,
            delay: 100,
          }),
        })
      );

      // Trigger another error (simulating failure after first reconnect)
      errorCallback({ message: "Connection error" });

      // Check second reconnection scheduled with 200ms delay (100 * 2)
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        "Scheduling reconnection",
        expect.objectContaining({
          metadata: expect.objectContaining({
            attempt: 2,
            delay: 200,
          }),
        })
      );

      // Trigger another error
      errorCallback({ message: "Connection error" });

      // Check third reconnection scheduled with 400ms delay (200 * 2)
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        "Scheduling reconnection",
        expect.objectContaining({
          metadata: expect.objectContaining({
            attempt: 3,
            delay: 400,
          }),
        })
      );
    });

    it("should stop retrying after max attempts", async () => {
      let errorCallback: any;

      mockChannel.on.mockImplementation((event, config, cb) => {
        if (event === "system" && config.event === "error") {
          errorCallback = cb;
        }
        return mockChannel;
      });

      mockChannel.subscribe.mockRejectedValue(new Error("Subscribe failed"));

      manager.subscribe("test", {
        table: "matches",
        callback: vi.fn(),
      });

      // Exhaust all retries
      for (let i = 0; i < 4; i++) {
        errorCallback({ message: "Connection error" });
        await vi.runAllTimersAsync();
      }

      expect(manager.getConnectionState()).toBe("error");
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        "Max reconnection attempts reached",
        expect.any(Object)
      );
    });

    it("should handle manual reconnection", () => {
      const callback = vi.fn();
      manager.subscribe("test", {
        table: "matches",
        callback,
      });

      manager.reconnect();

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        "Manual reconnection requested",
        expect.any(Object)
      );
    });
  });

  describe("network status handling", () => {
    it("should reconnect when network comes online", () => {
      const onlineEvent = new Event("online");
      window.dispatchEvent(onlineEvent);

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        "Network connection restored",
        expect.any(Object)
      );
    });

    it("should update state when network goes offline", () => {
      // Just test that the logger is called when offline event is fired
      const offlineEvent = new Event("offline");
      window.dispatchEvent(offlineEvent);

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        "Network connection lost",
        expect.any(Object)
      );
    });
  });

  describe("channel management", () => {
    it("should handle channel close event", () => {
      let closeCallback: any;

      mockChannel.on.mockImplementation((event, config, cb) => {
        if (event === "system" && config.event === "close") {
          closeCallback = cb;
        }
        return mockChannel;
      });

      manager.subscribe("test", {
        table: "matches",
        callback: vi.fn(),
      });

      closeCallback();

      expect(manager.getConnectionState()).toBe("reconnecting");
    });

    it("should handle subscription status changes", async () => {
      mockChannel.subscribe.mockImplementation(async (callback) => {
        callback("SUBSCRIBED");
        return "ok";
      });

      manager.subscribe("test", {
        table: "matches",
        callback: vi.fn(),
      });

      await vi.runAllTimersAsync();

      expect(manager.getConnectionState()).toBe("connected");
    });

    it("should handle subscription errors", async () => {
      mockChannel.subscribe.mockImplementation(async (callback) => {
        callback("CHANNEL_ERROR");
        return "error";
      });

      manager.subscribe("test", {
        table: "matches",
        callback: vi.fn(),
      });

      await vi.runAllTimersAsync();

      expect(manager.getConnectionState()).toBe("error");
    });
  });
});

describe("RealtimeManager singleton", () => {
  it("should export convenience functions", async () => {
    const {
      subscribeToTable,
      unsubscribe,
      unsubscribeAll,
      getConnectionState,
      onConnectionStateChange,
      reconnect,
    } = await import("../realtime");

    expect(typeof subscribeToTable).toBe("function");
    expect(typeof unsubscribe).toBe("function");
    expect(typeof unsubscribeAll).toBe("function");
    expect(typeof getConnectionState).toBe("function");
    expect(typeof onConnectionStateChange).toBe("function");
    expect(typeof reconnect).toBe("function");
  });
});
