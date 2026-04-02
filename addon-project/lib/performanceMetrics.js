/**
 * lib/performanceMetrics.js
 *
 * Lightweight in-memory performance metrics recording.
 * Tracks timing metrics and API call statistics with timestamps.
 *
 * Suitable for development/diagnostics. For production persistence,
 * integrate with an external metrics store (e.g. StatsD, Prometheus).
 */

// In-memory storage: array of metric entries
const metrics = [];

/**
 * Records a timing metric.
 *
 * @param {string} name   Metric name (e.g. 'request_duration')
 * @param {number} value  Numeric value (e.g. milliseconds)
 * @param {string} [unit='ms']  Unit of measurement
 */
function recordMetric(name, value, unit = 'ms') {
  if (typeof value !== 'number' || isNaN(value)) return;

  metrics.push({
    name,
    value,
    unit,
    timestamp: Date.now(),
  });
}

/**
 * Records an API call metric with endpoint, duration, and status code.
 *
 * @param {string} endpoint    API endpoint path (e.g. '/api/addons/get')
 * @param {number} durationMs  Response time in milliseconds
 * @param {number} statusCode  HTTP status code
 */
function recordApiCall(endpoint, durationMs, statusCode) {
  if (typeof durationMs !== 'number' || isNaN(durationMs)) return;

  metrics.push({
    name: 'api_call',
    endpoint,
    duration: durationMs,
    statusCode,
    unit: 'ms',
    timestamp: Date.now(),
  });
}

/**
 * Returns all recorded metrics.
 *
 * @returns {Array<{name: string, value?: number, unit: string, timestamp: number}>}
 */
function getMetrics() {
  return [...metrics];
}

/**
 * Clears all recorded metrics. Useful for testing or periodic cleanup.
 */
function clearMetrics() {
  metrics.length = 0;
}

/**
 * Returns a summary of API call metrics.
 *
 * @returns {{ total: number, avgDuration: number, minDuration: number, maxDuration: number, byStatus: object }}
 */
function getApiCallSummary() {
  const apiCalls = metrics.filter(m => m.name === 'api_call');

  if (apiCalls.length === 0) {
    return { total: 0, avgDuration: 0, minDuration: 0, maxDuration: 0, byStatus: {} };
  }

  const durations = apiCalls.map(m => m.duration);
  const byStatus = {};

  for (const call of apiCalls) {
    const key = String(call.statusCode);
    byStatus[key] = (byStatus[key] || 0) + 1;
  }

  return {
    total: apiCalls.length,
    avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    byStatus,
  };
}

module.exports = { recordMetric, recordApiCall, getMetrics, clearMetrics, getApiCallSummary };
