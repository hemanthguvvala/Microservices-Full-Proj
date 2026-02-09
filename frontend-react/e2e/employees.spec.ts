import { test, expect } from '@playwright/test'

/**
 * Employee Management E2E Tests
 * 
 * Tests the full CRUD flow for employees.
 * At MNCs, critical business flows get E2E coverage.
 * Uses API route interception for fast, deterministic tests.
 */

// Reusable mock data (standard at large companies)
const MOCK_EMPLOYEES = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    department: 'Engineering',
    position: 'Senior Engineer',
    salary: 120000,
    status: 'ACTIVE',
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
  },
]

test.describe('Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-authenticate
    await page.evaluate(() => {
      localStorage.setItem(
        'token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock'
      )
    })

    // Mock API endpoints
    await page.route('**/api/employees*', async (route) => {
      const url = new URL(route.request().url())
      const method = route.request().method()

      if (method === 'GET') {
        const search = url.searchParams.get('search') || ''
        const filtered = MOCK_EMPLOYEES.filter(
          (e) =>
            e.firstName.toLowerCase().includes(search.toLowerCase()) ||
            e.lastName.toLowerCase().includes(search.toLowerCase()) ||
            e.email.toLowerCase().includes(search.toLowerCase())
        )

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: filtered,
            totalElements: filtered.length,
            totalPages: 1,
            number: 0,
            size: 20,
          }),
        })
      } else if (method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}')
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '4',
            ...body,
            status: 'ACTIVE',
          }),
        })
      } else if (method === 'DELETE') {
        await route.fulfill({ status: 204 })
      }
    })
  })

  test('should display employee list', async ({ page }) => {
    await page.goto('/employees')

    // Check table/list is rendered
    await expect(page.getByText('John Doe')).toBeVisible()
    await expect(page.getByText('Jane Smith')).toBeVisible()
    await expect(page.getByText('Bob Wilson')).toBeVisible()
  })

  test('should search employees with debounce', async ({ page }) => {
    await page.goto('/employees')

    // Type in search
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('John')

    // Wait for debounce (500ms) + API response
    await page.waitForTimeout(600)

    // Only John should be visible
    await expect(page.getByText('John Doe')).toBeVisible()
    await expect(page.getByText('Jane Smith')).not.toBeVisible()
  })

  test('should create a new employee', async ({ page }) => {
    await page.goto('/employees/create')

    // Fill out the form
    await page.getByLabel(/first name/i).fill('Alice')
    await page.getByLabel(/last name/i).fill('Johnson')
    await page.getByLabel(/email/i).fill('alice.johnson@company.com')
    await page.getByLabel(/department/i).fill('Engineering')
    await page.getByLabel(/position/i).fill('Frontend Engineer')
    await page.getByLabel(/salary/i).fill('110000')

    // Submit
    await page.getByRole('button', { name: /create|save|submit/i }).click()

    // Should show success message or redirect
    await expect(
      page.getByText(/created|success/i)
    ).toBeVisible({ timeout: 5000 })
  })

  test('should handle form validation', async ({ page }) => {
    await page.goto('/employees/create')

    // Submit empty form
    await page.getByRole('button', { name: /create|save|submit/i }).click()

    // Validation errors should appear
    await expect(page.getByText(/required/i).first()).toBeVisible()
  })

  test('should export employees to CSV', async ({ page }) => {
    await page.goto('/employees')

    // Listen for download
    const downloadPromise = page.waitForEvent('download')

    // Click export button
    await page.getByRole('button', { name: /export/i }).click()
    await page.getByText(/csv/i).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.csv')
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Override route to return error
    await page.route('**/api/employees*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      })
    })

    await page.goto('/employees')

    // Should show error message, not crash
    await expect(page.getByText(/error|failed|try again/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/employees')

    // Page should still be usable
    await expect(page.getByText('John Doe')).toBeVisible()
  })
})

test.describe('Employee Management - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-token')
    })
  })

  test('should be navigable with keyboard only', async ({ page }) => {
    await page.route('**/api/employees*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: MOCK_EMPLOYEES,
          totalElements: 3,
          totalPages: 1,
          number: 0,
          size: 20,
        }),
      })
    })

    await page.goto('/employees')

    // Tab through interactive elements
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.route('**/api/employees*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: MOCK_EMPLOYEES,
          totalElements: 3,
          totalPages: 1,
          number: 0,
          size: 20,
        }),
      })
    })

    await page.goto('/employees')

    // Check for search input accessibility
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i))
    await expect(search).toBeVisible()
  })
})
