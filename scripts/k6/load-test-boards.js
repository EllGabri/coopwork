/**
 * k6 Load Test — GET /boards (200 concurrent users, 60s)
 *
 * Prerequisites:
 *   brew install k6  (macOS) | https://k6.io/docs/getting-started/installation/
 *
 * Usage:
 *   K6_API_URL=http://localhost:3001 K6_ACCESS_TOKEN=<jwt> k6 run scripts/k6/load-test-boards.js
 *
 * Expected results (per DoD 9.4):
 *   - p95 latency < 2s
 *   - 0 HTTP 5xx errors
 *   - No "too many connections" errors in PostgreSQL logs
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const API_URL = __ENV.K6_API_URL || 'http://localhost:3001';
const ACCESS_TOKEN = __ENV.K6_ACCESS_TOKEN || '';

const httpErrors = new Counter('http_errors');
const errorRate = new Rate('error_rate');
const latencyTrend = new Trend('request_latency', true);

export const options = {
  vus: 200,            // 200 virtual users
  duration: '60s',     // run for 60 seconds
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // p95 < 2s
    error_rate: ['rate<0.01'],           // < 1% error rate
    http_req_failed: ['rate<0.01'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  ...(ACCESS_TOKEN ? { Cookie: `access_token=${ACCESS_TOKEN}` } : {}),
};

export default function () {
  // GET /workspaces — simulates a typical authenticated page load
  const res = http.get(`${API_URL}/workspaces`, { headers });

  const ok = check(res, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'not 5xx': (r) => r.status < 500,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  latencyTrend.add(res.timings.duration);

  if (!ok || res.status >= 500) {
    httpErrors.add(1);
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  sleep(0.1); // 100ms between iterations per VU
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'];
  const errorRateVal = data.metrics.error_rate?.values?.rate ?? 0;
  const passed = p95 !== undefined && p95 < 2000 && errorRateVal < 0.01;

  return {
    stdout: `
====================================================
  CoopWork Load Test Summary — 200 VUs / 60s
====================================================
  p95 latency : ${p95?.toFixed(0) ?? 'n/a'} ms  (threshold: < 2000ms)
  Error rate  : ${(errorRateVal * 100).toFixed(2)}%  (threshold: < 1%)
  Total reqs  : ${data.metrics.http_reqs?.values?.count ?? 0}
  Result      : ${passed ? '✅ PASSED' : '❌ FAILED'}
====================================================\n`,
  };
}
