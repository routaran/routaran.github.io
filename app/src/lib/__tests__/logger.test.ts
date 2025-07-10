/**
 * Test suite for the logger functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, createLogger } from "../logger";

// Use real timers for these tests
vi.useRealTimers();

// Mock console methods
const originalConsole = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
  log: console.log,
  groupCollapsed: console.groupCollapsed,
  groupEnd: console.groupEnd,
  table: console.table,
};

beforeEach(() => {
  // Mock console methods
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
  console.debug = vi.fn();
  console.log = vi.fn();
  console.groupCollapsed = vi.fn();
  console.groupEnd = vi.fn();
  console.table = vi.fn();

  // Mock localStorage
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  });

  // Clear logs
  logger.clearLogs();
});

afterEach(() => {
  // Restore console methods
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
  console.log = originalConsole.log;
  console.groupCollapsed = originalConsole.groupCollapsed;
  console.groupEnd = originalConsole.groupEnd;
  console.table = originalConsole.table;
});

describe("Logger", () => {
  it("should log error messages", () => {
    const testError = new Error("Test error");
    logger.error("Test error message", { component: "test" }, testError);

    expect(console.groupCollapsed).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(testError);
    expect(console.groupEnd).toHaveBeenCalled();
  });

  it("should log warning messages", () => {
    logger.warn("Test warning message", { component: "test" });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Test warning message"),
      expect.stringContaining("color: #ffa726"),
      expect.objectContaining({ component: "test" })
    );
  });

  it("should log info messages", () => {
    logger.info("Test info message", { component: "test" });

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Test info message"),
      expect.stringContaining("color: #42a5f5"),
      expect.objectContaining({ component: "test" })
    );
  });

  it("should log debug messages", () => {
    logger.debug("Test debug message", { component: "test" });

    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining("Test debug message"),
      expect.stringContaining("color: #66bb6a"),
      expect.objectContaining({ component: "test" })
    );
  });

  it("should store log entries", () => {
    logger.error("Test error");
    logger.warn("Test warning");
    logger.info("Test info");

    const logs = logger.getLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0].level).toBe("error");
    expect(logs[1].level).toBe("warn");
    expect(logs[2].level).toBe("info");
  });

  it("should track performance metrics", () => {
    logger.performance("test_operation", 150, "ms", { component: "test" });

    const metrics = logger.getPerformanceMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe("test_operation");
    expect(metrics[0].value).toBe(150);
    expect(metrics[0].unit).toBe("ms");
  });

  it("should time async operations", async () => {
    const mockAsyncOperation = vi.fn().mockResolvedValue("result");

    const result = await logger.time("async_test", mockAsyncOperation, {
      component: "test",
    });

    expect(result).toBe("result");
    expect(mockAsyncOperation).toHaveBeenCalled();

    const metrics = logger.getPerformanceMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe("async_test");
  });

  it("should time sync operations", () => {
    const mockSyncOperation = vi.fn().mockReturnValue("result");

    const result = logger.timeSync("sync_test", mockSyncOperation, {
      component: "test",
    });

    expect(result).toBe("result");
    expect(mockSyncOperation).toHaveBeenCalled();

    const metrics = logger.getPerformanceMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe("sync_test");
  });

  it("should handle errors in timed operations", async () => {
    const testError = new Error("Test error");
    const mockFailingOperation = vi.fn().mockRejectedValue(testError);

    await expect(
      logger.time("failing_test", mockFailingOperation, { component: "test" })
    ).rejects.toThrow("Test error");

    expect(console.groupCollapsed).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(testError);
  });

  it("should get recent errors", () => {
    const error1 = new Error("Error 1");
    const error2 = new Error("Error 2");

    logger.error("First error", { component: "test" }, error1);
    logger.warn("Warning message");
    logger.error("Second error", { component: "test" }, error2);

    const errors = logger.getErrors();
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toBe("First error");
    expect(errors[1].message).toBe("Second error");
  });

  it("should export logs", () => {
    logger.error("Test error");
    logger.info("Test info");

    const exported = logger.exportLogs();
    const parsed = JSON.parse(exported);

    expect(parsed).toHaveProperty("sessionId");
    expect(parsed).toHaveProperty("timestamp");
    expect(parsed).toHaveProperty("logs");
    expect(parsed.logs).toHaveLength(2);
  });

  it("should clear logs", () => {
    logger.error("Test error");
    logger.info("Test info");

    expect(logger.getLogs()).toHaveLength(2);

    logger.clearLogs();

    expect(logger.getLogs()).toHaveLength(0);
    expect(logger.getErrors()).toHaveLength(0);
    expect(logger.getPerformanceMetrics()).toHaveLength(0);
  });

  it("should create custom logger instance", () => {
    const customLogger = createLogger({
      level: "error",
      enableConsole: false,
    });

    expect(customLogger).toBeDefined();
    expect(customLogger.getConfig().level).toBe("error");
    expect(customLogger.getConfig().enableConsole).toBe(false);
  });

  it("should respect log level filtering", () => {
    const customLogger = createLogger({
      level: "warn",
      enableConsole: true,
    });

    // Should log warn and error
    customLogger.warn("Warning message");
    customLogger.error("Error message");

    // Should not log info and debug
    customLogger.info("Info message");
    customLogger.debug("Debug message");

    const logs = customLogger.getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe("warn");
    expect(logs[1].level).toBe("error");
  });

  it("should persist logs to localStorage", () => {
    logger.error("Test error");

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "pickleball-logs",
      expect.stringContaining("Test error")
    );
  });

  it("should warn about slow operations", () => {
    logger.performance("slow_operation", 2000, "ms", { component: "test" });

    // Should log a warning for operations over the threshold
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Slow operation detected"),
      expect.stringContaining("color: #ffa726"),
      expect.objectContaining({
        component: "performance",
        action: "slow_operation",
      })
    );
  });
});
