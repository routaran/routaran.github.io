/**
 * Comprehensive logging service for the Pickleball Tracker application
 * Provides structured logging with different levels, performance monitoring,
 * and error tracking capabilities.
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogContext {
  userId?: string;
  sessionId?: string;
  playDateId?: string;
  matchId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count";
  timestamp: string;
  context?: LogContext;
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemoteLogging: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  performanceThreshold: number; // ms
}

class Logger {
  private config: LoggerConfig;
  private sessionId: string;
  private storage: LogEntry[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private errorBuffer: LogEntry[] = [];
  private isProduction = import.meta.env.PROD;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: this.isProduction ? "warn" : "debug",
      enableConsole: !this.isProduction,
      enableStorage: true,
      enableRemoteLogging: this.isProduction,
      maxStorageEntries: 1000,
      performanceThreshold: 1000,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.initializeErrorHandling();
  }

  /**
   * Generate a unique session ID for tracking logs across the session
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Initialize global error handling
   */
  private initializeErrorHandling(): void {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.error("Unhandled promise rejection", {
        component: "global",
        action: "unhandledrejection",
        metadata: {
          reason: event.reason,
          stack: event.reason?.stack,
        },
      });
    });

    // Handle uncaught errors
    window.addEventListener("error", (event) => {
      this.error(
        "Uncaught error",
        {
          component: "global",
          action: "uncaughterror",
          metadata: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
        },
        event.error
      );
    });
  }

  /**
   * Check if a log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["error", "warn", "info", "debug"];
    const configIndex = levels.indexOf(this.config.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= configIndex;
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        sessionId: this.sessionId,
        ...context,
      },
      error,
      stackTrace: error?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  /**
   * Process a log entry
   */
  private processLogEntry(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Storage logging
    if (this.config.enableStorage) {
      this.logToStorage(entry);
    }

    // Remote logging (errors only for performance)
    if (this.config.enableRemoteLogging && entry.level === "error") {
      this.logToRemote(entry);
    }
  }

  /**
   * Log to browser console
   */
  private logToConsole(entry: LogEntry): void {
    const style = this.getConsoleStyle(entry.level);
    const prefix = `[${entry.timestamp}][${entry.level.toUpperCase()}]`;

    if (entry.error) {
      console.groupCollapsed(`${prefix} ${entry.message}`);
      console.error(entry.error);
      if (entry.context) {
        console.table(entry.context);
      }
      console.groupEnd();
    } else {
      const logFn = this.getConsoleMethod(entry.level);
      logFn(`%c${prefix} ${entry.message}`, style, entry.context || "");
    }
  }

  /**
   * Get console styling for log level
   */
  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      error: "color: #ff6b6b; font-weight: bold;",
      warn: "color: #ffa726; font-weight: bold;",
      info: "color: #42a5f5; font-weight: bold;",
      debug: "color: #66bb6a; font-weight: normal;",
    };
    return styles[level];
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case "error":
        return console.error;
      case "warn":
        return console.warn;
      case "info":
        return console.info;
      case "debug":
        return console.debug;
      default:
        return console.log;
    }
  }

  /**
   * Log to local storage
   */
  private logToStorage(entry: LogEntry): void {
    this.storage.push(entry);

    // Keep only the most recent entries
    if (this.storage.length > this.config.maxStorageEntries) {
      this.storage = this.storage.slice(-this.config.maxStorageEntries);
    }

    // Store error entries separately for quick access
    if (entry.level === "error") {
      this.errorBuffer.push(entry);
      if (this.errorBuffer.length > 100) {
        this.errorBuffer = this.errorBuffer.slice(-100);
      }
    }

    // Persist to localStorage for debugging
    try {
      localStorage.setItem(
        "pickleball-logs",
        JSON.stringify(this.storage.slice(-100))
      );
    } catch (_e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Log to remote endpoint (placeholder for future implementation)
   */
  private logToRemote(entry: LogEntry): void {
    // In a real implementation, this would send to a logging service
    // For now, we'll just queue it for potential future use
    if (this.config.remoteEndpoint) {
      // Could integrate with services like Sentry, LogRocket, etc.
      console.debug("Would send to remote:", entry);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry("error", message, context, error);
    this.processLogEntry(entry);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("warn", message, context);
    this.processLogEntry(entry);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("info", message, context);
    this.processLogEntry(entry);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("debug", message, context);
    this.processLogEntry(entry);
  }

  /**
   * Log a performance metric
   */
  performance(
    name: string,
    value: number,
    unit: "ms" | "bytes" | "count" = "ms",
    context?: LogContext
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      context: {
        sessionId: this.sessionId,
        ...context,
      },
    };

    this.performanceMetrics.push(metric);

    // Log slow operations
    if (unit === "ms" && value > this.config.performanceThreshold) {
      this.warn(`Slow operation detected: ${name} took ${value}ms`, {
        component: "performance",
        action: "slow_operation",
        metadata: { metric },
      });
    }

    // Keep only recent metrics
    if (this.performanceMetrics.length > 500) {
      this.performanceMetrics = this.performanceMetrics.slice(-500);
    }
  }

  /**
   * Time a function execution
   */
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = performance.now();
    const startMessage = `Starting ${name}`;

    this.debug(startMessage, { ...context, action: "start" });

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.performance(name, duration, "ms", context);
      this.debug(`Completed ${name} in ${duration.toFixed(2)}ms`, {
        ...context,
        action: "complete",
        metadata: { duration },
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.error(
        `Failed ${name} after ${duration.toFixed(2)}ms`,
        {
          ...context,
          action: "error",
          metadata: { duration },
        },
        error as Error
      );
      throw error;
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSync<T>(name: string, fn: () => T, context?: LogContext): T {
    const startTime = performance.now();
    const startMessage = `Starting ${name}`;

    this.debug(startMessage, { ...context, action: "start" });

    try {
      const result = fn();
      const duration = performance.now() - startTime;

      this.performance(name, duration, "ms", context);
      this.debug(`Completed ${name} in ${duration.toFixed(2)}ms`, {
        ...context,
        action: "complete",
        metadata: { duration },
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.error(
        `Failed ${name} after ${duration.toFixed(2)}ms`,
        {
          ...context,
          action: "error",
          metadata: { duration },
        },
        error as Error
      );
      throw error;
    }
  }

  /**
   * Get all stored log entries
   */
  getLogs(): LogEntry[] {
    return [...this.storage];
  }

  /**
   * Get recent error entries
   */
  getErrors(): LogEntry[] {
    return [...this.errorBuffer];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.storage = [];
    this.errorBuffer = [];
    this.performanceMetrics = [];
    localStorage.removeItem("pickleball-logs");
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(
      {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        logs: this.storage,
        errors: this.errorBuffer,
        performance: this.performanceMetrics,
      },
      null,
      2
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
export const logger = new Logger();

// Export factory function for custom instances
export const createLogger = (config?: Partial<LoggerConfig>): Logger => {
  return new Logger(config);
};

// Convenience exports
export default logger;
