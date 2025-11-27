import { test, expect } from '@playwright/test'

// Helper to set up authenticated state
async function setupAuth(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token')
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        display_name: 'Test User',
        default_currency: 'USD',
        locale: 'en-US'
      })
    )
  })
}

const mockCategories = [
  { id: 'cat-1', user_id: 'test-user-id', name: 'Groceries', type: 'expense', color: '#00F5D4', icon: 'cart', active: true },
  { id: 'cat-2', user_id: 'test-user-id', name: 'Dining', type: 'expense', color: '#F15BB5', icon: 'utensils', active: true },
  { id: 'cat-3', user_id: 'test-user-id', name: 'Entertainment', type: 'expense', color: '#9B5DE5', icon: 'film', active: true }
]

const mockBudgets = [
  { id: 'budget-1', user_id: 'test-user-id', month: '2024-01', category_id: 'cat-1', planned_amount_cents: 50000 },
  { id: 'budget-2', user_id: 'test-user-id', month: '2024-01', category_id: 'cat-2', planned_amount_cents: 20000 }
]

test.describe('Budgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth')
    await setupAuth(page)

    // Mock API responses
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()

      if (url.includes('/categories')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockCategories, total: mockCategories.length })
        })
      } else if (url.includes('/budgets') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockBudgets, total: mockBudgets.length })
        })
      } else if (url.includes('/budgets') && method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      } else if (url.includes('/summary')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            month: '2024-01',
            total_income_cents: 500000,
            total_expenses_cents: 35000,
            net_cents: 465000,
            category_breakdown: [
              { category_id: 'cat-1', category_name: 'Groceries', planned_cents: 50000, spent_cents: 25000 },
              { category_id: 'cat-2', category_name: 'Dining', planned_cents: 20000, spent_cents: 10000 }
            ]
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
  })

  test('displays budget overview', async ({ page }) => {
    await page.goto('/budgets')

    await expect(page.getByText('Budgets')).toBeVisible()
    await expect(page.getByText('Total Budget')).toBeVisible()
    await expect(page.getByText('Spent')).toBeVisible()
  })

  test('shows category budget cards', async ({ page }) => {
    await page.goto('/budgets')

    // Should show expense categories
    await expect(page.getByText('Groceries')).toBeVisible()
    await expect(page.getByText('Dining')).toBeVisible()
    await expect(page.getByText('Entertainment')).toBeVisible()
  })

  test('can enter edit mode', async ({ page }) => {
    await page.goto('/budgets')

    // Click edit button
    await page.getByRole('button', { name: 'Edit Budgets' }).click()

    // Should show input fields
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })

  test('can edit budget amounts', async ({ page }) => {
    await page.goto('/budgets')

    // Enter edit mode
    await page.getByRole('button', { name: 'Edit Budgets' }).click()

    // Find and edit a budget input
    const inputs = page.locator('input[type="number"]')
    await inputs.first().fill('600')

    // Save
    await page.getByRole('button', { name: 'Save' }).click()

    // Should exit edit mode
    await expect(page.getByRole('button', { name: 'Edit Budgets' })).toBeVisible({ timeout: 5000 })
  })

  test('can cancel editing', async ({ page }) => {
    await page.goto('/budgets')

    // Enter edit mode
    await page.getByRole('button', { name: 'Edit Budgets' }).click()

    // Modify a value
    const inputs = page.locator('input[type="number"]')
    await inputs.first().fill('9999')

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Should exit edit mode without saving
    await expect(page.getByRole('button', { name: 'Edit Budgets' })).toBeVisible()
  })

  test('displays progress bars for budgets', async ({ page }) => {
    await page.goto('/budgets')

    // Progress bars should be visible
    const progressBars = page.locator('[role="progressbar"]')
    await expect(progressBars.first()).toBeVisible()
  })
})
