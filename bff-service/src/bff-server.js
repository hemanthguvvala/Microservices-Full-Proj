/**
 * BFF (Backend for Frontend) Service
 * =====================================
 * Pattern: Rather than each frontend calling 10 microservices individually,
 * the BFF aggregates exactly what each frontend needs in ONE call.
 *
 * Why BFF?
 *  - React SPA needs employee + payroll in one payload → BFF merges them
 *  - Mobile app needs trimmed data → mobile BFF strips unneeded fields
 *  - Reduces N frontend → N microservice chatty calls to 1 BFF call
 *  - BFF owns the shaping, versioning, and caching concern
 *
 * Architecture:
 *   React SPA → BFF (/api/bff/dashboard) → employee-service + payroll-service
 *                                         → notification-service (unread count)
 */

const express = require('express');
const axios = require('axios');
const CircuitBreaker = require('opossum');
const promClient = require('prom-client');
const morgan = require('morgan');

const app = express();
app.use(express.json());
app.use(morgan('combined'));

// ── Prometheus metrics ──────────────────────────────────────
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const bffRequestDuration = new promClient.Histogram({
  name: 'bff_request_duration_seconds',
  help: 'BFF request duration in seconds',
  labelNames: ['endpoint', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

const upstreamCallsTotal = new promClient.Counter({
  name: 'bff_upstream_calls_total',
  help: 'Total upstream service calls from BFF',
  labelNames: ['service', 'status'],
  registers: [register],
});

// ── Service URLs ────────────────────────────────────────────
const EMPLOYEE_SVC = process.env.EMPLOYEE_SERVICE_URL || 'http://employee-service:8081';
const PAYROLL_SVC  = process.env.PAYROLL_SERVICE_URL  || 'http://payroll-service:8082';
const NOTIFY_SVC   = process.env.NOTIFY_SERVICE_URL   || 'http://notification-service:8083';
const GATEWAY_URL  = process.env.API_GATEWAY_URL      || 'http://api-gateway:8080';

// ── Circuit Breaker config ──────────────────────────────────
const cbOptions = {
  timeout:             3000,   // If takes > 3s, fail fast
  errorThresholdPercentage: 50, // Open after 50% failures
  resetTimeout:        30000,  // Try again after 30s
};

function makeCircuitBreaker(fn, name) {
  const cb = new CircuitBreaker(fn, cbOptions);
  cb.fallback(() => ({ _fallback: true, service: name }));
  cb.on('open',    () => console.warn(`Circuit OPEN  for ${name}`));
  cb.on('halfOpen',() => console.info(`Circuit HALF-OPEN for ${name}`));
  cb.on('close',   () => console.info(`Circuit CLOSED for ${name}`));
  return cb;
}

// ── Upstream call helpers ───────────────────────────────────
async function fetchEmployee(id, token) {
  const resp = await axios.get(`${EMPLOYEE_SVC}/api/v1/employees/${id}`, {
    headers: { Authorization: token },
    timeout: 2500,
  });
  upstreamCallsTotal.inc({ service: 'employee', status: 'success' });
  return resp.data;
}

async function fetchPayrollSummary(employeeId, token) {
  const resp = await axios.get(`${PAYROLL_SVC}/api/v1/payroll/summary/${employeeId}`, {
    headers: { Authorization: token },
    timeout: 2500,
  });
  upstreamCallsTotal.inc({ service: 'payroll', status: 'success' });
  return resp.data;
}

async function fetchUnreadCount(userId, token) {
  const resp = await axios.get(`${NOTIFY_SVC}/api/v1/notifications/unread-count/${userId}`, {
    headers: { Authorization: token },
    timeout: 1500,
  });
  upstreamCallsTotal.inc({ service: 'notification', status: 'success' });
  return resp.data;
}

async function fetchEmployeeList(queryParams, token) {
  const resp = await axios.get(`${EMPLOYEE_SVC}/api/v1/employees`, {
    params: queryParams,
    headers: { Authorization: token },
    timeout: 3000,
  });
  upstreamCallsTotal.inc({ service: 'employee', status: 'success' });
  return resp.data;
}

// Wrap each in a circuit breaker
const cbEmployee     = makeCircuitBreaker(fetchEmployee,     'employee-service');
const cbPayroll      = makeCircuitBreaker(fetchPayrollSummary,'payroll-service');
const cbNotification = makeCircuitBreaker(fetchUnreadCount,  'notification-service');
const cbEmployeeList = makeCircuitBreaker(fetchEmployeeList, 'employee-list');

// ── Route: Employee Dashboard (React SPA main view) ─────────
// Returns exactly what the dashboard page needs — no over-fetching
app.get('/api/bff/v1/dashboard/:employeeId', async (req, res) => {
  const timer = bffRequestDuration.startTimer({ endpoint: 'dashboard' });
  const { employeeId } = req.params;
  const token = req.headers.authorization;

  try {
    // Parallel calls — all 3 happen simultaneously
    const [employee, payroll, notifications] = await Promise.allSettled([
      cbEmployee.fire(employeeId, token),
      cbPayroll.fire(employeeId, token),
      cbNotification.fire(employeeId, token),
    ]);

    // Shape the response for the React dashboard — only what's needed
    const dashboard = {
      profile: employee.status === 'fulfilled' ? {
        id:         employee.value.id,
        name:       `${employee.value.firstName} ${employee.value.lastName}`,
        department: employee.value.department,
        position:   employee.value.position,
        avatar:     employee.value.profilePictureUrl,
      } : null,

      payrollSummary: payroll.status === 'fulfilled' ? {
        currentSalary:    payroll.value.currentSalary,
        lastPayDate:      payroll.value.lastPayDate,
        ytdEarnings:      payroll.value.ytdEarnings,
        pendingApprovals: payroll.value.pendingApprovals,
      } : null,

      notifications: notifications.status === 'fulfilled' ? {
        unreadCount: notifications.value.count,
        hasUrgent:   notifications.value.hasUrgent,
      } : { unreadCount: 0, hasUrgent: false },

      _meta: {
        timestamp:  new Date().toISOString(),
        dataFresh:  employee.status === 'fulfilled',
        // Partial success — return what we have, degrade gracefully
        partial:    [employee, payroll, notifications].some(r => r.status === 'rejected'),
      },
    };

    timer({ status: '200' });
    res.json(dashboard);
  } catch (err) {
    timer({ status: '500' });
    res.status(500).json({ error: 'Dashboard aggregation failed', message: err.message });
  }
});

// ── Route: Employee list with payroll totals (HR view) ───────
app.get('/api/bff/v1/hr/employees', async (req, res) => {
  const timer = bffRequestDuration.startTimer({ endpoint: 'hr-employee-list' });
  const token = req.headers.authorization;
  const { page = 0, size = 20, department, search } = req.query;

  try {
    const employees = await cbEmployeeList.fire({ page, size, department, search }, token);

    // For HR view: enrich each employee with their payroll status in parallel
    const enriched = await Promise.allSettled(
      employees.content.map(async (emp) => {
        try {
          const pay = await axios.get(`${PAYROLL_SVC}/api/v1/payroll/status/${emp.id}`, {
            headers: { Authorization: token }, timeout: 1500
          });
          return { ...emp, payrollStatus: pay.data.status };
        } catch {
          return { ...emp, payrollStatus: 'UNAVAILABLE' };
        }
      })
    );

    timer({ status: '200' });
    res.json({
      ...employees,
      content: enriched.map(r => r.status === 'fulfilled' ? r.value : r.reason),
    });
  } catch (err) {
    timer({ status: '500' });
    res.status(500).json({ error: err.message });
  }
});

// ── Route: Health check ──────────────────────────────────────
app.get('/actuator/health', (req, res) => {
  res.json({
    status: 'UP',
    circuitBreakers: {
      employee:     cbEmployee.status.stats,
      payroll:      cbPayroll.status.stats,
      notification: cbNotification.status.stats,
    }
  });
});

// ── Route: Metrics (Prometheus scrape) ──────────────────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`BFF service listening on :${PORT}`));

module.exports = app;
