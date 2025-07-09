/**
 * Integration test for logging and monitoring
 * This test will be run manually to verify the system works
 */

import { logger } from '../logger';
import { monitor } from '../monitoring';

// Simple integration test that can be run manually
export function testLoggingAndMonitoring() {
  console.log('=== Starting Logging and Monitoring Integration Test ===');

  try {
    // Test basic logging
    logger.info('Testing info logging', { component: 'integration-test' });
    logger.warn('Testing warn logging', { component: 'integration-test' });
    logger.error('Testing error logging', { component: 'integration-test' }, new Error('Test error'));
    logger.debug('Testing debug logging', { component: 'integration-test' });

    // Test performance logging
    logger.performance('test_operation', 100, 'ms', { component: 'integration-test' });

    // Test timing
    const result = logger.timeSync('sync_operation', () => {
      return 'sync result';
    }, { component: 'integration-test' });
    
    console.log('Sync operation result:', result);

    // Test async timing
    logger.time('async_operation', async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('async result'), 100);
      });
    }, { component: 'integration-test' }).then((result) => {
      console.log('Async operation result:', result);
    });

    // Test monitoring
    monitor.updateConnectionStatus('connected', { component: 'integration-test' });
    monitor.recordLatency(50, { component: 'integration-test' });
    monitor.recordError(new Error('Test monitoring error'), { component: 'integration-test' });

    // Test monitoring callbacks
    const unsubscribe = monitor.onConnectionStatusChange((status) => {
      console.log('Connection status changed:', status);
    });

    monitor.updateConnectionStatus('disconnected', { component: 'integration-test' });
    unsubscribe();

    // Get monitoring summary
    const summary = monitor.getMonitoringSummary();
    console.log('Monitoring Summary:', summary);

    // Get logs
    const logs = logger.getLogs();
    console.log('Total logs:', logs.length);

    const errors = logger.getErrors();
    console.log('Total errors:', errors.length);

    const metrics = logger.getPerformanceMetrics();
    console.log('Performance metrics:', metrics.length);

    console.log('=== Integration Test Completed Successfully ===');
    return true;

  } catch (error) {
    console.error('Integration test failed:', error);
    return false;
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  (window as any).testLoggingAndMonitoring = testLoggingAndMonitoring;
}