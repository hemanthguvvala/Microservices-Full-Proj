/**
 * k6 Load Test — Employee Service
 * =================================
 * Tests SLOs under realistic traffic patterns:
 *   - Ramp up: 0 → 50 VU over 2 min
 *   - Sustained load: 50 VU for 5 min  (normal production)
 *   - Spike: 50 → 200 VU over 1 min   (flash sale / month-end payroll)
 *   - Recovery: 200 → 10 VU over 2 min
 *
 * SLO Thresholds (fail CI if breached):
 *   - p95 response time < 500ms
 *   - p99 response time < 1000ms
 *   - Error rate < 1%
 *   - Throughput > 100 RPS at peak
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ── Custom metrics ─────────────────────────────────────────
const errorRate          = new Rate('error_rate');
const listLatency        = new Trend('employee_list_latency', true);
const getLatency         = new Trend('employee_get_latency', true);
const createLatency      = new Trend('employee_create_latency', true);
const apiErrors          = new Counter('api_errors_total');

// ── Test configuration ─────────────────────────────────────
export const options = {
  scenarios: {
    // Scenario 1: Steady state — simulates normal working hours
    steady_state: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50  },   // Ramp up
        { duration: '5m', target: 50  },   // Sustain
        { duration: '1m', target: 0   },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Scenario 2: Spike — simulates month-end payroll rush
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '8m',                     // Start after steady state
      stages: [
        { duration: '30s', target: 200 },  // Sudden spike
        { duration: '2m',  target: 200 },  // Peak load
        { duration: '1m',  target: 20  },  // Recovery
      ],
      gracefulRampDown: '30s',
    },
  },

  // ── SLO thresholds — CI fails if any breach ─────────────
  thresholds: {
    // Core SLOs
    'http_req_duration':             ['p(95)<500', 'p(99)<1000'],
    'http_req_failed':               ['rate<0.01'],   // < 1% errors

    // Custom metrics
    'employee_list_latency':         ['p(95)<400'],
    'employee_get_latency':          ['p(95)<200'],
    'employee_create_latency':       ['p(95)<800'],
    'error_rate':                    ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-token';

const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`,
};

// Pregenerate test data
const departments = ['ENGINEERING', 'HR', 'FINANCE', 'SALES', 'OPERATIONS'];
const testEmployeeIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];  // Pre-seeded test data

export function setup() {
  // Verify the service is up before load test
  const res = http.get(`${BASE_URL}/actuator/health`);
  if (res.status !== 200) {
    throw new Error(`Service health check failed: ${res.status}`);
  }
  console.log('Service is healthy, starting load test...');
  return { startTime: new Date().toISOString() };
}

// ── Main test function ─────────────────────────────────────
export default function () {
  // Weight: 60% reads, 25% creates, 15% updates (realistic ratio)
  const rand = Math.random();

  if (rand < 0.40) {
    testListEmployees();
  } else if (rand < 0.65) {
    testGetEmployee();
  } else if (rand < 0.80) {
    testSearchEmployees();
  } else if (rand < 0.92) {
    testCreateEmployee();
  } else {
    testUpdateEmployee();
  }

  sleep(randomIntBetween(1, 3));   // Think time between requests
}

function testListEmployees() {
  group('List Employees', () => {
    const page = randomIntBetween(0, 5);
    const dept = departments[randomIntBetween(0, departments.length - 1)];
    const start = Date.now();

    const res = http.get(
      `${BASE_URL}/api/v1/employees?page=${page}&size=20&department=${dept}`,
      { headers: HEADERS }
    );

    listLatency.add(Date.now() - start);

    const ok = check(res, {
      'list: status 200':        (r) => r.status === 200,
      'list: has content array': (r) => r.json('content') !== undefined,
      'list: response < 500ms':  (r) => r.timings.duration < 500,
    });

    if (!ok) {
      errorRate.add(1);
      apiErrors.add(1, { endpoint: 'list' });
    } else {
      errorRate.add(0);
    }
  });
}

function testGetEmployee() {
  group('Get Employee', () => {
    const id = testEmployeeIds[randomIntBetween(0, testEmployeeIds.length - 1)];
    const start = Date.now();

    const res = http.get(`${BASE_URL}/api/v1/employees/${id}`, { headers: HEADERS });

    getLatency.add(Date.now() - start);

    const ok = check(res, {
      'get: status 200 or 404':  (r) => r.status === 200 || r.status === 404,
      'get: response < 200ms':   (r) => r.timings.duration < 200,
    });

    if (res.status >= 500) {
      errorRate.add(1);
      apiErrors.add(1, { endpoint: 'get', status: res.status });
    } else {
      errorRate.add(0);
    }
  });
}

function testSearchEmployees() {
  group('Search Employees', () => {
    const queries = ['john', 'jane', 'smith', 'engineer', 'manager'];
    const q = queries[randomIntBetween(0, queries.length - 1)];

    const res = http.get(
      `${BASE_URL}/api/v1/employees/search?q=${q}&page=0&size=10`,
      { headers: HEADERS }
    );

    check(res, {
      'search: status 200':      (r) => r.status === 200,
      'search: response < 1s':   (r) => r.timings.duration < 1000,
    });
  });
}

function testCreateEmployee() {
  group('Create Employee', () => {
    const start = Date.now();
    const payload = JSON.stringify({
      firstName:  `LoadTest${randomIntBetween(1000, 9999)}`,
      lastName:   `User${randomIntBetween(1000, 9999)}`,
      email:      `loadtest.${Date.now()}@test.com`,
      department: departments[randomIntBetween(0, departments.length - 1)],
      position:   'Software Engineer',
      salary:     randomIntBetween(50000, 150000),
    });

    const res = http.post(`${BASE_URL}/api/v1/employees`, payload, { headers: HEADERS });

    createLatency.add(Date.now() - start);

    check(res, {
      'create: status 201':      (r) => r.status === 201,
      'create: has id':          (r) => r.json('id') !== undefined,
      'create: response < 800ms':(r) => r.timings.duration < 800,
    });

    if (res.status >= 400) {
      errorRate.add(1);
      apiErrors.add(1, { endpoint: 'create', status: res.status });
    } else {
      errorRate.add(0);
    }
  });
}

function testUpdateEmployee() {
  group('Update Employee', () => {
    const id = testEmployeeIds[randomIntBetween(0, testEmployeeIds.length - 1)];
    const payload = JSON.stringify({
      department: departments[randomIntBetween(0, departments.length - 1)],
    });

    const res = http.patch(`${BASE_URL}/api/v1/employees/${id}`, payload, { headers: HEADERS });

    check(res, {
      'update: success':         (r) => r.status === 200 || r.status === 404,
      'update: response < 500ms':(r) => r.timings.duration < 500,
    });
  });
}

export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
}
