import { http, HttpResponse, delay } from 'msw'

/**
 * MSW API Handlers — Mock Service Worker
 * 
 * Used by: GitHub, Google Chrome team, Remix, Apollo GraphQL, React Query
 * 
 * Why MNCs use MSW:
 * - Frontend development without waiting for backend
 * - Consistent test data across unit + integration + E2E tests
 * - Network-level interception (works with fetch, axios, any HTTP client)
 * - No changes to application code (intercepted at service worker level)
 * - Same handlers for development AND testing
 * - Enables parallel frontend/backend development (critical at scale)
 * 
 * This is NOT mock data inside components — this is network-level interception
 * that your real axios/fetch calls hit, making the app think it's talking to a real API.
 */

// ─── Mock Data ────────────────────────────────────────────────────────────

let employees = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    department: 'Engineering',
    position: 'Senior Engineer',
    salary: 120000,
    status: 'ACTIVE',
    hireDate: '2022-01-15',
    createdAt: '2022-01-15T10:00:00Z',
    updatedAt: '2024-01-10T14:30:00Z',
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@company.com',
    department: 'Product',
    position: 'Product Manager',
    salary: 130000,
    status: 'ACTIVE',
    hireDate: '2021-06-01',
    createdAt: '2021-06-01T09:00:00Z',
    updatedAt: '2024-01-05T11:00:00Z',
  },
  {
    id: '3',
    firstName: 'Bob',
    lastName: 'Wilson',
    email: 'bob.wilson@company.com',
    department: 'Marketing',
    position: 'Marketing Lead',
    salary: 100000,
    status: 'INACTIVE',
    hireDate: '2020-03-20',
    createdAt: '2020-03-20T08:00:00Z',
    updatedAt: '2023-12-01T16:00:00Z',
  },
  {
    id: '4',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@company.com',
    department: 'Engineering',
    position: 'Frontend Engineer',
    salary: 110000,
    status: 'ACTIVE',
    hireDate: '2023-02-10',
    createdAt: '2023-02-10T10:00:00Z',
    updatedAt: '2024-01-12T09:30:00Z',
  },
  {
    id: '5',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie.brown@company.com',
    department: 'Engineering',
    position: 'Backend Engineer',
    salary: 115000,
    status: 'ACTIVE',
    hireDate: '2023-05-01',
    createdAt: '2023-05-01T08:00:00Z',
    updatedAt: '2024-01-08T13:00:00Z',
  },
]

let nextId = 6

// ─── Handlers ─────────────────────────────────────────────────────────────

export const handlers = [
  // ── Authentication ──────────────────────────────────────────────────
  http.post('*/api/auth/login', async ({ request }) => {
    await delay(300) // Simulate network latency

    const body = (await request.json()) as { email: string; password: string }

    if (body.email === 'admin@company.com' && body.password === 'Password123!') {
      return HttpResponse.json({
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBjb21wYW55LmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTcwNzM4NDAwMCwiZXhwIjoxNzA3NDcwNDAwfQ.mock-signature',
        user: {
          id: '1',
          email: body.email,
          name: 'Admin User',
          role: 'ADMIN',
        },
      })
    }

    return HttpResponse.json(
      { message: 'Invalid email or password' },
      { status: 401 }
    )
  }),

  http.post('*/api/auth/refresh', async () => {
    await delay(100)
    return HttpResponse.json({
      token: 'eyJhbGciOiJIUzI1NiJ9.refreshed-token',
    })
  }),

  // ── Employees CRUD ──────────────────────────────────────────────────

  // GET /api/employees — List with pagination, search, sort
  http.get('*/api/employees', async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '0')
    const size = parseInt(url.searchParams.get('size') || '20')
    const search = url.searchParams.get('search') || ''
    const department = url.searchParams.get('department') || ''
    const status = url.searchParams.get('status') || ''
    const sortBy = url.searchParams.get('sortBy') || 'lastName'
    const sortDir = url.searchParams.get('sortDir') || 'asc'

    let filtered = [...employees]

    // Search
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      )
    }

    // Filter by department
    if (department) {
      filtered = filtered.filter(
        (e) => e.department.toLowerCase() === department.toLowerCase()
      )
    }

    // Filter by status
    if (status) {
      filtered = filtered.filter(
        (e) => e.status.toLowerCase() === status.toLowerCase()
      )
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy] || ''
      const bVal = (b as any)[sortBy] || ''
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'desc' ? -cmp : cmp
    })

    // Paginate
    const start = page * size
    const paged = filtered.slice(start, start + size)

    return HttpResponse.json({
      content: paged,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
      number: page,
      size,
      first: page === 0,
      last: start + size >= filtered.length,
    })
  }),

  // GET /api/employees/:id — Single employee
  http.get('*/api/employees/:id', async ({ params }) => {
    await delay(100)

    const employee = employees.find((e) => e.id === params.id)
    if (!employee) {
      return HttpResponse.json(
        { message: `Employee ${params.id} not found` },
        { status: 404 }
      )
    }

    return HttpResponse.json(employee)
  }),

  // POST /api/employees — Create employee
  http.post('*/api/employees', async ({ request }) => {
    await delay(300)

    const body = (await request.json()) as any
    const newEmployee = {
      id: String(nextId++),
      ...body,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    employees.push(newEmployee)

    return HttpResponse.json(newEmployee, { status: 201 })
  }),

  // PUT /api/employees/:id — Update employee
  http.put('*/api/employees/:id', async ({ params, request }) => {
    await delay(200)

    const index = employees.findIndex((e) => e.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { message: `Employee ${params.id} not found` },
        { status: 404 }
      )
    }

    const body = (await request.json()) as any
    employees[index] = {
      ...employees[index],
      ...body,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(employees[index])
  }),

  // DELETE /api/employees/:id — Delete employee
  http.delete('*/api/employees/:id', async ({ params }) => {
    await delay(150)

    const index = employees.findIndex((e) => e.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { message: `Employee ${params.id} not found` },
        { status: 404 }
      )
    }

    employees.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Dashboard / Analytics ───────────────────────────────────────────
  http.get('*/api/dashboard/stats', async () => {
    await delay(200)

    return HttpResponse.json({
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e) => e.status === 'ACTIVE').length,
      departments: [...new Set(employees.map((e) => e.department))].length,
      averageSalary:
        employees.reduce((sum, e) => sum + e.salary, 0) / employees.length,
      newHiresThisMonth: 2,
      turnoverRate: 5.2,
    })
  }),

  // ── Saga operations ─────────────────────────────────────────────────
  http.post('*/api/sagas/hire', async ({ request }) => {
    await delay(500)

    const body = (await request.json()) as any
    return HttpResponse.json({
      sagaId: `saga-${Date.now()}`,
      type: 'EMPLOYEE_HIRING',
      status: 'STARTED',
      employeeId: body.employeeId,
      steps: [
        { name: 'CREATE_EMPLOYEE', status: 'COMPLETED' },
        { name: 'SETUP_PAYROLL', status: 'IN_PROGRESS' },
        { name: 'SEND_WELCOME_EMAIL', status: 'PENDING' },
        { name: 'PROVISION_EQUIPMENT', status: 'PENDING' },
      ],
      createdAt: new Date().toISOString(),
    })
  }),

  http.get('*/api/sagas/:id', async ({ params }) => {
    await delay(100)

    return HttpResponse.json({
      sagaId: params.id,
      type: 'EMPLOYEE_HIRING',
      status: 'COMPLETED',
      steps: [
        { name: 'CREATE_EMPLOYEE', status: 'COMPLETED' },
        { name: 'SETUP_PAYROLL', status: 'COMPLETED' },
        { name: 'SEND_WELCOME_EMAIL', status: 'COMPLETED' },
        { name: 'PROVISION_EQUIPMENT', status: 'COMPLETED' },
      ],
      completedAt: new Date().toISOString(),
    })
  }),

  // ── Feature Flags ───────────────────────────────────────────────────
  http.get('*/api/feature-flags', async () => {
    await delay(50)

    return HttpResponse.json({
      flags: {
        'dark-mode': true,
        'new-dashboard': true,
        'bulk-import': false,
        'ai-search': false,
        'advanced-analytics': true,
      },
    })
  }),
]
