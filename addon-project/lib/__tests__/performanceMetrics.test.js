const { recordMetric, recordApiCall, getMetrics, clearMetrics, getApiCallSummary } = require('../performanceMetrics');

describe('lib/performanceMetrics.js', () => {
  beforeEach(() => {
    clearMetrics();
  });

  describe('recordMetric', () => {
    test('records a metric with name, value, unit, and timestamp', () => {
      recordMetric('test_metric', 100);

      const metrics = getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test_metric');
      expect(metrics[0].value).toBe(100);
      expect(metrics[0].unit).toBe('ms');
      expect(metrics[0].timestamp).toBeGreaterThan(0);
    });

    test('defaults unit to "ms"', () => {
      recordMetric('default_unit', 42);
      expect(getMetrics()[0].unit).toBe('ms');
    });

    test('accepts custom unit', () => {
      recordMetric('custom', 5, 'bytes');
      expect(getMetrics()[0].unit).toBe('bytes');
    });

    test('ignores non-numeric values', () => {
      recordMetric('bad', NaN);
      recordMetric('bad2', 'hello');
      recordMetric('bad3', null);
      expect(getMetrics()).toHaveLength(0);
    });

    test('records multiple metrics', () => {
      recordMetric('m1', 1);
      recordMetric('m2', 2);
      recordMetric('m3', 3);
      expect(getMetrics()).toHaveLength(3);
    });
  });

  describe('recordApiCall', () => {
    test('records an api_call metric', () => {
      recordApiCall('/api/test', 50, 200);

      const metrics = getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('api_call');
      expect(metrics[0].endpoint).toBe('/api/test');
      expect(metrics[0].duration).toBe(50);
      expect(metrics[0].statusCode).toBe(200);
    });

    test('ignores non-numeric duration', () => {
      recordApiCall('/api/test', 'not a number', 200);
      expect(getMetrics()).toHaveLength(0);
    });
  });

  describe('getMetrics', () => {
    test('returns a copy of the metrics array', () => {
      recordMetric('copy_test', 1);
      const m1 = getMetrics();
      const m2 = getMetrics();
      expect(m1).not.toBe(m2);
      expect(m1).toEqual(m2);
    });
  });

  describe('clearMetrics', () => {
    test('removes all metrics', () => {
      recordMetric('to_clear', 1);
      recordMetric('to_clear2', 2);
      expect(getMetrics()).toHaveLength(2);
      clearMetrics();
      expect(getMetrics()).toHaveLength(0);
    });
  });

  describe('getApiCallSummary', () => {
    test('returns zeros when no API calls recorded', () => {
      const summary = getApiCallSummary();
      expect(summary.total).toBe(0);
      expect(summary.avgDuration).toBe(0);
      expect(summary.minDuration).toBe(0);
      expect(summary.maxDuration).toBe(0);
      expect(summary.byStatus).toEqual({});
    });

    test('computes correct summary for API calls', () => {
      recordApiCall('/api/a', 100, 200);
      recordApiCall('/api/b', 200, 200);
      recordApiCall('/api/c', 300, 500);

      const summary = getApiCallSummary();
      expect(summary.total).toBe(3);
      expect(summary.avgDuration).toBe(200);
      expect(summary.minDuration).toBe(100);
      expect(summary.maxDuration).toBe(300);
      expect(summary.byStatus['200']).toBe(2);
      expect(summary.byStatus['500']).toBe(1);
    });

    test('ignores non-api_call metrics', () => {
      recordMetric('custom', 500);
      recordApiCall('/api/test', 10, 200);

      const summary = getApiCallSummary();
      expect(summary.total).toBe(1);
      expect(summary.avgDuration).toBe(10);
    });
  });
});
