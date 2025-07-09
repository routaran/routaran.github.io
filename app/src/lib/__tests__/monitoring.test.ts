/**
 * Test suite for the monitoring functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { monitor, createMonitor } from '../monitoring';

// Use real timers for these tests
vi.useRealTimers();

// Mock performance API
const mockPerformanceObserver = vi.fn();
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  // Mock PerformanceObserver
  mockPerformanceObserver.mockImplementation((_callback) => ({
    observe: mockObserve,
    disconnect: mockDisconnect,
  }));

  global.PerformanceObserver = mockPerformanceObserver;
  
  // Mock performance.now
  global.performance = {
    ...global.performance,
    now: vi.fn(() => 1000),
  };

  // Mock memory API
  Object.defineProperty(global.performance, 'memory', {
    value: {
      usedJSHeapSize: 1024 * 1024 * 10, // 10MB
      totalJSHeapSize: 1024 * 1024 * 50, // 50MB
      jsHeapSizeLimit: 1024 * 1024 * 100, // 100MB
    },
    writable: true,
  });

  // Mock document.querySelectorAll
  document.querySelectorAll = vi.fn().mockReturnValue(new Array(100));

  // Mock window event listeners
  global.addEventListener = vi.fn();
  global.removeEventListener = vi.fn();

  // Reset metrics
  monitor.resetMetrics();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Monitor', () => {
  it('should initialize monitoring', () => {
    monitor.startMonitoring();
    
    expect(mockPerformanceObserver).toHaveBeenCalled();
    expect(mockObserve).toHaveBeenCalledWith({ entryTypes: ['paint', 'navigation', 'measure'] });
  });

  it('should update connection status', () => {
    const callback = vi.fn();
    monitor.onConnectionStatusChange(callback);
    
    monitor.updateConnectionStatus('connected');
    expect(callback).toHaveBeenCalledWith('connected');
    
    monitor.updateConnectionStatus('disconnected');
    expect(callback).toHaveBeenCalledWith('disconnected');
  });

  it('should record latency measurements', () => {
    monitor.recordLatency(100);
    monitor.recordLatency(200);
    monitor.recordLatency(150);
    
    const metrics = monitor.getConnectionMetrics();
    expect(metrics.averageLatency).toBe(150); // (100 + 200 + 150) / 3
  });

  it('should record errors', () => {
    const testError = new Error('Test error');
    monitor.recordError(testError, { component: 'test' });
    
    const errorMetrics = monitor.getErrorMetrics();
    expect(errorMetrics.totalErrors).toBe(1);
    expect(errorMetrics.errorsByType['Error']).toBe(1);
    expect(errorMetrics.errorsByComponent['test']).toBe(1);
  });

  it('should measure API call performance', async () => {
    const mockApiCall = vi.fn().mockResolvedValue('success');
    
    // Mock performance.now to return incrementing values
    let counter = 0;
    vi.mocked(performance.now).mockImplementation(() => {
      counter += 100;
      return counter;
    });
    
    const result = await monitor.measureApiCall('test_api', mockApiCall);
    
    expect(result).toBe('success');
    expect(mockApiCall).toHaveBeenCalled();
  });

  it('should handle API call errors', async () => {
    const testError = new Error('API Error');
    const mockApiCall = vi.fn().mockRejectedValue(testError);
    
    await expect(
      monitor.measureApiCall('failing_api', mockApiCall)
    ).rejects.toThrow('API Error');
    
    const errorMetrics = monitor.getErrorMetrics();
    expect(errorMetrics.totalErrors).toBe(1);
  });

  it('should measure route changes', () => {
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((callback) => {
      callback(1000);
      return 1;
    });
    
    monitor.measureRouteChange('home');
    
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it('should track connection metrics', () => {
    const _startTime = Date.now();
    
    monitor.updateConnectionStatus('connecting');
    monitor.updateConnectionStatus('connected');
    monitor.updateConnectionStatus('disconnected');
    
    const metrics = monitor.getConnectionMetrics();
    expect(metrics.connectionAttempts).toBe(1);
    expect(metrics.lastConnected).toBeInstanceOf(Date);
    expect(metrics.lastDisconnected).toBeInstanceOf(Date);
    expect(metrics.status).toBe('disconnected');
  });

  it('should identify critical errors', () => {
    const criticalError = new Error('Network Error: Failed to fetch');
    const regularError = new Error('Regular error');
    
    monitor.recordError(criticalError, { component: 'test' });
    monitor.recordError(regularError, { component: 'test' });
    
    const errorMetrics = monitor.getErrorMetrics();
    expect(errorMetrics.totalErrors).toBe(2);
    expect(errorMetrics.criticalErrors).toBe(1);
  });

  it('should unsubscribe from connection status changes', () => {
    const callback = vi.fn();
    const unsubscribe = monitor.onConnectionStatusChange(callback);
    
    monitor.updateConnectionStatus('connected');
    expect(callback).toHaveBeenCalledWith('connected');
    
    unsubscribe();
    
    monitor.updateConnectionStatus('disconnected');
    expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
  });

  it('should get monitoring summary', () => {
    monitor.recordError(new Error('Test error'), { component: 'test' });
    monitor.recordLatency(100);
    monitor.updateConnectionStatus('connected');
    
    const summary = monitor.getMonitoringSummary();
    
    expect(summary).toHaveProperty('connection');
    expect(summary).toHaveProperty('performance');
    expect(summary).toHaveProperty('errors');
    
    expect(summary.connection.status).toBe('connected');
    expect(summary.errors.totalErrors).toBe(1);
  });

  it('should reset metrics', () => {
    monitor.recordError(new Error('Test error'), { component: 'test' });
    monitor.recordLatency(100);
    monitor.updateConnectionStatus('connected');
    
    monitor.resetMetrics();
    
    const summary = monitor.getMonitoringSummary();
    expect(summary.connection.status).toBe('disconnected');
    expect(summary.errors.totalErrors).toBe(0);
    expect(summary.connection.averageLatency).toBe(0);
  });

  it('should stop monitoring', () => {
    monitor.startMonitoring();
    monitor.stopMonitoring();
    
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should limit latency measurements', () => {
    // Add 150 measurements (over the 100 limit)
    for (let i = 0; i < 150; i++) {
      monitor.recordLatency(i);
    }
    
    const metrics = monitor.getConnectionMetrics();
    // Should only keep the last 100 measurements
    expect(metrics.averageLatency).toBeGreaterThan(99); // Average should be from the last 100 values
  });

  it('should create custom monitor instance', () => {
    const customMonitor = createMonitor();
    
    expect(customMonitor).toBeDefined();
    expect(customMonitor.getConnectionMetrics).toBeDefined();
    expect(customMonitor.getPerformanceMetrics).toBeDefined();
    expect(customMonitor.getErrorMetrics).toBeDefined();
  });

  it('should handle performance observer errors gracefully', () => {
    // Mock PerformanceObserver to throw an error
    const originalPerformanceObserver = global.PerformanceObserver;
    global.PerformanceObserver = vi.fn().mockImplementation(() => {
      throw new Error('PerformanceObserver not supported');
    });
    
    // Should not throw when creating a new monitor
    expect(() => createMonitor()).not.toThrow();
    
    // Restore original
    global.PerformanceObserver = originalPerformanceObserver;
  });
});