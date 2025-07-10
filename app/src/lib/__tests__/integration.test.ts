/**
 * Integration test for logging and monitoring
 * These tests verify that the logger and monitor modules are properly mocked
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "../logger";
import { monitor } from "../monitoring";

describe("Logging and Monitoring Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have logger methods mocked", () => {
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.performance).toBeDefined();
    expect(logger.time).toBeDefined();
    expect(logger.timeSync).toBeDefined();
    expect(logger.getLogs).toBeDefined();
    expect(logger.getErrors).toBeDefined();
    expect(logger.getPerformanceMetrics).toBeDefined();
  });

  it("should have monitor methods mocked", () => {
    expect(monitor.updateConnectionStatus).toBeDefined();
    expect(monitor.recordLatency).toBeDefined();
    expect(monitor.recordError).toBeDefined();
    expect(monitor.getMonitoringSummary).toBeDefined();
    expect(monitor.onConnectionStatusChange).toBeDefined();
    expect(monitor.measureApiCall).toBeDefined();
  });

  it("should handle basic logging operations", () => {
    // Test basic logging
    expect(() => {
      logger.info("Testing info logging", { component: "integration-test" });
      logger.warn("Testing warn logging", { component: "integration-test" });
      logger.error(
        "Testing error logging",
        { component: "integration-test" },
        new Error("Test error")
      );
      logger.debug("Testing debug logging", { component: "integration-test" });
    }).not.toThrow();

    // Verify mocks were called
    expect(logger.info).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalled();
  });

  it("should handle sync timing operations", () => {
    const mockFn = vi.fn(() => "sync result");
    const result = logger.timeSync("sync_operation", mockFn, {
      component: "integration-test",
    });

    expect(result).toBe("sync result");
    expect(mockFn).toHaveBeenCalled();
  });

  it("should handle async timing operations", async () => {
    const mockFn = vi.fn(async () => "async result");
    const result = await logger.time("async_operation", mockFn, {
      component: "integration-test",
    });

    expect(result).toBe("async result");
    expect(mockFn).toHaveBeenCalled();
  });

  it("should handle monitoring operations", () => {
    // Test monitoring
    monitor.updateConnectionStatus("connected", {
      component: "integration-test",
    });
    monitor.recordLatency(50, { component: "integration-test" });
    monitor.recordError(new Error("Test monitoring error"), {
      component: "integration-test",
    });

    expect(monitor.updateConnectionStatus).toHaveBeenCalledWith("connected", {
      component: "integration-test",
    });
    expect(monitor.recordLatency).toHaveBeenCalledWith(50, {
      component: "integration-test",
    });
    expect(monitor.recordError).toHaveBeenCalled();
  });

  it("should handle monitoring callbacks", () => {
    const mockCallback = vi.fn();
    const mockUnsubscribe = vi.fn();

    // Configure mock to return unsubscribe function
    vi.mocked(monitor.onConnectionStatusChange).mockReturnValue(
      mockUnsubscribe
    );

    const unsubscribe = monitor.onConnectionStatusChange(mockCallback);

    expect(monitor.onConnectionStatusChange).toHaveBeenCalledWith(mockCallback);
    expect(unsubscribe).toBe(mockUnsubscribe);
  });

  it("should integrate logging and monitoring together", async () => {
    const mockOperation = vi.fn(() => "operation completed");

    logger.info("Starting operation", { component: "integration-test" });
    monitor.updateConnectionStatus("connecting", {
      component: "integration-test",
    });

    const result = logger.timeSync("operation", mockOperation, {
      component: "integration-test",
    });

    monitor.updateConnectionStatus("connected", {
      component: "integration-test",
    });
    logger.info("Operation completed", {
      result,
      component: "integration-test",
    });

    expect(result).toBe("operation completed");
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(monitor.updateConnectionStatus).toHaveBeenCalledTimes(2);
  });
});

// Simple integration test function that can be run manually
export function testLoggingAndMonitoring() {
  console.log("=== Starting Logging and Monitoring Integration Test ===");

  try {
    // Test basic logging
    logger.info("Testing info logging", { component: "integration-test" });
    logger.warn("Testing warn logging", { component: "integration-test" });
    logger.error(
      "Testing error logging",
      { component: "integration-test" },
      new Error("Test error")
    );
    logger.debug("Testing debug logging", { component: "integration-test" });

    // Test performance logging
    logger.performance("test_operation", 100, "ms", {
      component: "integration-test",
    });

    // Test timing
    const result = logger.timeSync(
      "sync_operation",
      () => {
        return "sync result";
      },
      { component: "integration-test" }
    );

    console.log("Sync operation result:", result);

    // Test async timing
    logger
      .time(
        "async_operation",
        async () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve("async result"), 100);
          });
        },
        { component: "integration-test" }
      )
      .then((result) => {
        console.log("Async operation result:", result);
      });

    // Test monitoring
    monitor.updateConnectionStatus("connected", {
      component: "integration-test",
    });
    monitor.recordLatency(50, { component: "integration-test" });
    monitor.recordError(new Error("Test monitoring error"), {
      component: "integration-test",
    });

    // Test monitoring callbacks
    const unsubscribe = monitor.onConnectionStatusChange((status) => {
      console.log("Connection status changed:", status);
    });

    monitor.updateConnectionStatus("disconnected", {
      component: "integration-test",
    });
    unsubscribe();

    // Get monitoring summary
    const summary = monitor.getMonitoringSummary();
    console.log("Monitoring Summary:", summary);

    // Get logs
    const logs = logger.getLogs();
    console.log("Total logs:", logs.length);

    const errors = logger.getErrors();
    console.log("Total errors:", errors.length);

    const metrics = logger.getPerformanceMetrics();
    console.log("Performance metrics:", metrics.length);

    console.log("=== Integration Test Completed Successfully ===");
    return true;
  } catch (error) {
    console.error("Integration test failed:", error);
    return false;
  }
}

// Export for manual testing
if (typeof window !== "undefined") {
  (window as any).testLoggingAndMonitoring = testLoggingAndMonitoring;
}
