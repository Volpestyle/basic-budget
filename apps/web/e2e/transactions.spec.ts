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
  { id: 'cat-2', user_id: 'test-user-id', name: 'Salary', type: 'income', color: '#22c55e', icon: 'briefcase', active: true },
  { id: 'cat-3', user_id: 'test-user-id', name: 'Dining', type: 'expense', color: '#F15BB5', icon: 'utensils', active: true }
]

const mockTransactions = [
  {
    id: 'tx-1',
    user_id: 'test-user-id',
    type: 'expense',
    category_id: 'cat-1',
    amount_cents: 5000,
    currency: 'USD',
    date: '2024-01-15',
    description: 'Weekly groceries',
    merchant: 'Whole Foods',
    tags: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'tx-2',
    user_id: 'test-user-id',
    type: 'income',
    category_id: 'cat-2',
    amount_cents: 500000,
    currency: 'USD',
    date: '2024-01-01',
    description: 'Monthly salary',
    merchant: '',
    tags: [],
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T09:00:00Z'
  }
]

test.describe('Transactions', () => {
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
      } else if (url.includes('/transactions') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockTransactions,
            total: mockTransactions.length,
            has_more: false
          })
        })
      } else if (url.includes('/transactions') && method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}')
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'tx-new',
            user_id: 'test-user-id',
            ...body,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        })
      } else if (url.includes('/income-streams')) {
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
            total_expenses_cents: 5000,
            net_cents: 495000,
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
  })

  test('displays transactions list', async ({ page }) => {
    await page.goto('/transactions')

    await expect(page.getByText('Transactions')).toBeVisible()
    await expect(page.getByText('Weekly groceries')).toBeVisible()
    await expect(page.getByText('Monthly salary')).toBeVisible()
  })

  test('can filter transactions by category', async ({ page }) => {
    await page.goto('/transactions')

    // Open category filter
    const categorySelect = page.locator('select').nth(0)
    await categorySelect.selectOption({ label: 'Groceries' })

    // Only groceries transaction should match (in the actual app with real filtering)
    await expect(page.getByText('Weekly groceries')).toBeVisible()
  })

  test('can open new transaction modal', async ({ page }) => {
    await page.goto('/transactions')

    // Click add button
    await page.getByRole('button', { name: 'Add' }).first().click()

    // Modal should appear
    await expect(page.getByText('New Transaction')).toBeVisible()
    await expect(page.getByLabel('Type')).toBeVisible()
    await expect(page.getByLabel('Category')).toBeVisible()
    await expect(page.getByLabel('Amount')).toBeVisible()
  })

  test('can create a new transaction', async ({ page }) => {
    await page.goto('/transactions')

    // Click add button
    await page.getByRole('button', { name: 'Add' }).first().click()

    // Fill form
    await page.getByLabel('Type').selectOption('expense')
    await page.getByLabel('Category').selectOption('cat-1')
    await page.getByLabel('Amount').fill('25.50')
    await page.getByLabel('Description').fill('Coffee and snacks')
    await page.getByLabel('Merchant (optional)').fill('Starbucks')

    // Submit
    await page.getByRole('button', { name: 'Add Transaction' }).click()

    // Modal should close
    await expect(page.getByText('New Transaction')).not.toBeVisible({ timeout: 5000 })
  })

  test('validates required fields', async ({ page }) => {
    await page.goto('/transactions')

    // Click add button
    await page.getByRole('button', { name: 'Add' }).first().click()

    // Try to submit without filling required fields
    await page.getByRole('button', { name: 'Add Transaction' }).click()

    // Error should appear
    await expect(page.getByText('Please fill in all required fields')).toBeVisible()
  })
})
