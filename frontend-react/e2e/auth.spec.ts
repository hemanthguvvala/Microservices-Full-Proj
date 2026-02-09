import { test, expect } from '@playwright/test'

/**
 * Authentication E2E Tests
 * 
 * Tests the full login flow as a user would experience it.
 * At MNCs, auth flows are the MOST tested because a broken login = 100% revenue loss.
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click()

    // Expect validation messages
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid credentials/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    // Mock the API response (real MNC approach — don't hit real backend in E2E)
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-jwt-token',
          user: {
            id: '1',
            email: 'admin@company.com',
            name: 'Admin User',
            role: 'ADMIN',
          },
        }),
      })
    })

    await page.getByLabel(/email/i).fill('admin@company.com')
    await page.getByLabel(/password/i).fill('Password123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/)
    await expect(page.getByText(/dashboard/i)).toBeVisible()
  })

  test('should persist session after page reload', async ({ page }) => {
    // Set token in localStorage (simulating logged-in state)
    await page.evaluate(() => {
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock')
    })

    await page.goto('/dashboard')

    // Should stay on dashboard (not redirect to login)
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('should logout and redirect to login', async ({ page }) => {
    // Pre-authenticate
    await page.evaluate(() => {
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock')
    })

    await page.goto('/dashboard')

    // Click logout
    await page.getByRole('button', { name: /logout|sign out/i }).click()

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/)

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeNull()
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/employees')
    await expect(page).toHaveURL(/.*login/)
  })
})
