import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to auth page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/auth')
  })

  test('displays Google Sign-In button on auth page', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByText('Basic Budget')).toBeVisible()
    await expect(page.getByText('Sign in with Google')).toBeVisible()
  })

  test('shows app shell after authentication', async ({ page, context }) => {
    // Mock authenticated state by setting localStorage token
    await page.goto('/auth')

    // Simulate successful auth by setting token and user data
    await page.evaluate(() => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        display_name: 'Test User',
        default_currency: 'USD',
        locale: 'en-US'
      }
      localStorage.setItem('auth_token', 'mock-jwt-token')
      localStorage.setItem('user', JSON.stringify(mockUser))
    })

    // Mock API responses
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url()

      if (url.includes('/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-id',
            email: 'test@example.com',
            display_name: 'Test User',
            default_currency: 'USD',
            locale: 'en-US'
          })
        })
      } else if (url.includes('/categories')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 })
        })
      } else if (url.includes('/summary')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            month: '2024-01',
            total_income_cents: 500000,
            total_expenses_cents: 300000,
            net_cents: 200000,
            category_breakdown: []
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], total: 0 })
        })
      }
    })

    await page.goto('/')

    // Should show dashboard
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 10000 })
  })

  test('logout clears auth state and redirects', async ({ page }) => {
    // Set up authenticated state
    await page.goto('/auth')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token')
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          display_name: 'Test User'
        })
      )
    })

    // Mock API
    await page.route('**/api/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 })
      })
    })

    await page.goto('/settings')

    // Click sign out
    await page.getByRole('button', { name: 'Sign Out' }).click()

    // Should redirect to auth
    await expect(page).toHaveURL('/auth')

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'))
    expect(token).toBeNull()
  })
})
