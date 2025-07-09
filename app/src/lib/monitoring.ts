/**
 * Performance monitoring and connection status utilities
 * for the Pickleball Tracker application
 */

import { logger } from './logger';
import type { LogContext } from './logger';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface ConnectionMetrics {
  status: ConnectionStatus;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  connectionAttempts: number;
  totalDowntime: number; // milliseconds
  averageLatency: number; // milliseconds
  errorCount: number;
}

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  
  // Custom metrics
  initialLoadTime: number | null;
  routeChangeTime: number | null;
  apiResponseTime: number | null;
  realtimeLatency: number | null;
  
  // Resource usage
  memoryUsage: number | null;
  jsHeapSize: number | null;
  domNodes: number | null;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  criticalErrors: number;
  lastError: Date | null;
}

class Monitor {
  private connectionMetrics: ConnectionMetrics = {
    status: 'disconnected',
    lastConnected: null,
    lastDisconnected: null,
    connectionAttempts: 0,
    totalDowntime: 0,
    averageLatency: 0,
    errorCount: 0,
  };

  private performanceMetrics: PerformanceMetrics = {
    lcp: null,
    fid: null,
    cls: null,
    initialLoadTime: null,
    routeChangeTime: null,
    apiResponseTime: null,
    realtimeLatency: null,
    memoryUsage: null,
    jsHeapSize: null,
    domNodes: null,
  };

  private errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    errorsByComponent: {},
    criticalErrors: 0,
    lastError: null,
  };

  private latencyMeasurements: number[] = [];
  private connectionStatusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private performanceObserver: PerformanceObserver | null = null;
  private isMonitoring = false;

  constructor() {
    this.initializePerformanceMonitoring();
    this.initializeMemoryMonitoring();
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  private initializePerformanceMonitoring(): void {
    // Only initialize if PerformanceObserver is available
    if (typeof PerformanceObserver === 'undefined') {
      logger.warn('PerformanceObserver not available, performance monitoring disabled');
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      // Observe different performance entry types
      this.performanceObserver.observe({ entryTypes: ['paint', 'navigation', 'measure'] });

      // Observe Core Web Vitals if available
      if ('web-vitals' in window || import.meta.env.DEV) {
        this.setupWebVitalsMonitoring();
      }
    } catch (error) {
      logger.error('Failed to initialize performance monitoring', {
        component: 'monitor',
        action: 'initialize_performance',
      }, error as Error);
    }
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  private setupWebVitalsMonitoring(): void {
    // LCP (Largest Contentful Paint)
    this.observeWebVital('largest-contentful-paint', (entry) => {
      this.performanceMetrics.lcp = entry.value;
      logger.performance('lcp', entry.value, 'ms', { component: 'monitor' });
    });

    // FID (First Input Delay)
    this.observeWebVital('first-input', (entry) => {
      this.performanceMetrics.fid = entry.processingStart - entry.startTime;
      logger.performance('fid', this.performanceMetrics.fid, 'ms', { component: 'monitor' });
    });

    // CLS (Cumulative Layout Shift)
    this.observeWebVital('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        this.performanceMetrics.cls = (this.performanceMetrics.cls || 0) + entry.value;
        logger.performance('cls', this.performanceMetrics.cls || 0, 'count', { component: 'monitor' });
      }
    });
  }

  /**
   * Observe specific web vital metrics
   */
  private observeWebVital(type: string, callback: (entry: any) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry);
        }
      });
      observer.observe({ entryTypes: [type] });
    } catch (_error) {
      logger.debug(`Web vital ${type} not supported`, { component: 'monitor' });
    }
  }

  /**
   * Handle performance entries
   */
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          logger.performance('fcp', entry.startTime, 'ms', { component: 'monitor' });
        }
        break;
      
      case 'navigation': {
        const navEntry = entry as PerformanceNavigationTiming;
        this.performanceMetrics.initialLoadTime = navEntry.loadEventEnd - navEntry.fetchStart;
        logger.performance('page_load', this.performanceMetrics.initialLoadTime, 'ms', { component: 'monitor' });
        break;
      }
      
      case 'measure':
        logger.performance(entry.name, entry.duration, 'ms', { component: 'monitor' });
        break;
    }
  }

  /**
   * Initialize memory monitoring
   */
  private initializeMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        this.updateMemoryMetrics();
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.performanceMetrics.memoryUsage = memory.usedJSHeapSize;
      this.performanceMetrics.jsHeapSize = memory.totalJSHeapSize;
      
      // Log memory usage if it's high
      const memoryUsageMB = memory.usedJSHeapSize / (1024 * 1024);
      if (memoryUsageMB > 50) {
        logger.warn(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`, {
          component: 'monitor',
          action: 'memory_check',
          metadata: { memoryUsageMB },
        });
      }
    }

    // Count DOM nodes
    this.performanceMetrics.domNodes = document.querySelectorAll('*').length;
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      logger.info('Network connection restored', { component: 'monitor', action: 'network_online' });
    });

    window.addEventListener('offline', () => {
      logger.warn('Network connection lost', { component: 'monitor', action: 'network_offline' });
    });
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(status: ConnectionStatus, context?: LogContext): void {
    const previousStatus = this.connectionMetrics.status;
    this.connectionMetrics.status = status;

    const now = new Date();
    const logContext = { component: 'monitor', action: 'connection_status', ...context };

    switch (status) {
      case 'connected':
        this.connectionMetrics.lastConnected = now;
        if (previousStatus === 'disconnected' && this.connectionMetrics.lastDisconnected) {
          this.connectionMetrics.totalDowntime += now.getTime() - this.connectionMetrics.lastDisconnected.getTime();
        }
        logger.info('Connection established', logContext);
        break;

      case 'disconnected':
        this.connectionMetrics.lastDisconnected = now;
        logger.warn('Connection lost', logContext);
        break;

      case 'connecting':
        this.connectionMetrics.connectionAttempts++;
        logger.info('Attempting to connect', logContext);
        break;

      case 'error':
        this.connectionMetrics.errorCount++;
        logger.error('Connection error', logContext);
        break;
    }

    // Notify callbacks
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Error in connection status callback', logContext, error as Error);
      }
    });
  }

  /**
   * Record latency measurement
   */
  recordLatency(latency: number, context?: LogContext): void {
    this.latencyMeasurements.push(latency);
    
    // Keep only recent measurements
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements = this.latencyMeasurements.slice(-100);
    }

    // Calculate average latency
    this.connectionMetrics.averageLatency = 
      this.latencyMeasurements.reduce((sum, val) => sum + val, 0) / this.latencyMeasurements.length;

    logger.performance('realtime_latency', latency, 'ms', { 
      component: 'monitor', 
      action: 'latency_measurement',
      ...context 
    });
  }

  /**
   * Record an error
   */
  recordError(error: Error, context?: LogContext): void {
    this.errorMetrics.totalErrors++;
    this.errorMetrics.lastError = new Date();

    const errorType = error.constructor.name;
    const component = context?.component || 'unknown';

    // Track by error type
    this.errorMetrics.errorsByType[errorType] = (this.errorMetrics.errorsByType[errorType] || 0) + 1;

    // Track by component
    this.errorMetrics.errorsByComponent[component] = (this.errorMetrics.errorsByComponent[component] || 0) + 1;

    // Check if it's a critical error
    if (this.isCriticalError(error)) {
      this.errorMetrics.criticalErrors++;
    }

    logger.error('Error recorded', {
      component: 'monitor',
      action: 'error_recorded',
      ...context,
      metadata: {
        errorType,
        totalErrors: this.errorMetrics.totalErrors,
      },
    }, error);
  }

  /**
   * Check if an error is critical
   */
  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      'ChunkLoadError',
      'Network Error',
      'Failed to fetch',
      'TypeError: Cannot read',
      'ReferenceError',
    ];

    return criticalPatterns.some(pattern => error.message.includes(pattern));
  }

  /**
   * Measure API response time
   */
  async measureApiCall<T>(
    name: string,
    apiCall: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const responseTime = performance.now() - startTime;
      
      this.performanceMetrics.apiResponseTime = responseTime;
      logger.performance(`api_${name}`, responseTime, 'ms', {
        component: 'monitor',
        action: 'api_call',
        ...context,
      });
      
      return result;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.recordError(error as Error, { ...context, action: 'api_error' });
      logger.error(`API call ${name} failed after ${responseTime.toFixed(2)}ms`, context, error as Error);
      throw error;
    }
  }

  /**
   * Measure route change time
   */
  measureRouteChange(routeName: string, context?: LogContext): void {
    const startTime = performance.now();
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const changeTime = performance.now() - startTime;
      this.performanceMetrics.routeChangeTime = changeTime;
      
      logger.performance(`route_${routeName}`, changeTime, 'ms', {
        component: 'monitor',
        action: 'route_change',
        ...context,
      });
    });
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.connectionStatusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionStatusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get current error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  /**
   * Get monitoring summary
   */
  getMonitoringSummary(): {
    connection: ConnectionMetrics;
    performance: PerformanceMetrics;
    errors: ErrorMetrics;
  } {
    return {
      connection: this.getConnectionMetrics(),
      performance: this.getPerformanceMetrics(),
      errors: this.getErrorMetrics(),
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    logger.info('Performance monitoring started', { component: 'monitor', action: 'start' });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    logger.info('Performance monitoring stopped', { component: 'monitor', action: 'stop' });
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.connectionMetrics = {
      status: 'disconnected',
      lastConnected: null,
      lastDisconnected: null,
      connectionAttempts: 0,
      totalDowntime: 0,
      averageLatency: 0,
      errorCount: 0,
    };

    this.performanceMetrics = {
      lcp: null,
      fid: null,
      cls: null,
      initialLoadTime: null,
      routeChangeTime: null,
      apiResponseTime: null,
      realtimeLatency: null,
      memoryUsage: null,
      jsHeapSize: null,
      domNodes: null,
    };

    this.errorMetrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByComponent: {},
      criticalErrors: 0,
      lastError: null,
    };

    this.latencyMeasurements = [];
    
    logger.info('Monitoring metrics reset', { component: 'monitor', action: 'reset' });
  }
}

// Create singleton instance
export const monitor = new Monitor();

// Export factory function for custom instances
export const createMonitor = (): Monitor => {
  return new Monitor();
};

// Convenience exports
export default monitor;