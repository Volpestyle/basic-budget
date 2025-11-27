// User
export interface User {
  id: string
  google_sub: string
  email: string
  display_name: string
  avatar_url: string
  default_currency: string
  locale: string
  created_at: string
}

// Category
export type CategoryType = 'expense' | 'income' | 'transfer'

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  color: string
  icon: string
  sort_order: number
  is_archived: boolean
  created_at: string
}

export interface CreateCategoryRequest {
  name: string
  type: CategoryType
  color: string
  icon: string
  sort_order?: number
}

export interface UpdateCategoryRequest {
  name?: string
  type?: CategoryType
  color?: string
  icon?: string
  sort_order?: number
  is_archived?: boolean
}

// Month Budget
export interface MonthBudget {
  id: string
  user_id: string
  month: string // YYYY-MM format
  category_id: string
  planned_amount_cents: number
}

export interface BulkBudgetRequest {
  budgets: Array<{
    category_id: string
    planned_amount_cents: number
  }>
}

// Income Stream
export type IncomePeriod = 'monthly' | 'biweekly' | 'once'

export interface IncomeStream {
  id: string
  user_id: string
  name: string
  default_category_id: string
  period: IncomePeriod
  expected_amount_cents: number
  start_date: string
  end_date?: string | null
  active: boolean
  created_at: string
}

export interface CreateIncomeStreamRequest {
  name: string
  default_category_id: string
  period: IncomePeriod
  expected_amount_cents: number
  start_date: string
  end_date?: string | null
}

export interface UpdateIncomeStreamRequest {
  name?: string
  default_category_id?: string
  period?: IncomePeriod
  expected_amount_cents?: number
  start_date?: string
  end_date?: string | null
  active?: boolean
}

// Recurring Rule
export type RecurringInterval = 'monthly' | 'weekly' | 'biweekly'
export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export interface RecurringRule {
  id: string
  user_id: string
  type: 'expense' | 'income'
  label: string
  category_id: string
  amount_cents: number
  currency: string
  interval: RecurringInterval
  day_of_month: number | null
  weekday: Weekday | null
  start_date: string
  end_date: string | null
  next_occurrence: string
  linked_income_stream_id: string | null
}

export interface CreateRecurringRuleRequest {
  type: 'expense' | 'income'
  label: string
  category_id: string
  amount_cents: number
  currency: string
  interval: RecurringInterval
  day_of_month?: number
  weekday?: Weekday
  start_date: string
  end_date?: string
  linked_income_stream_id?: string
}

export interface UpdateRecurringRuleRequest {
  type?: 'expense' | 'income'
  label?: string
  category_id?: string
  amount_cents?: number
  currency?: string
  interval?: RecurringInterval
  day_of_month?: number | null
  weekday?: Weekday | null
  start_date?: string
  end_date?: string | null
  linked_income_stream_id?: string | null
}

// Transaction
export type TransactionType = 'expense' | 'income' | 'transfer'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  income_stream_id: string | null
  recurring_rule_id: string | null
  category_id: string
  amount_cents: number
  currency: string
  date: string
  description: string
  merchant: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface CreateTransactionRequest {
  type: TransactionType
  income_stream_id?: string
  recurring_rule_id?: string
  category_id: string
  amount_cents: number
  currency: string
  date: string
  description: string
  merchant?: string
  tags?: string[]
}

export interface UpdateTransactionRequest {
  type?: TransactionType
  income_stream_id?: string | null
  recurring_rule_id?: string | null
  category_id?: string
  amount_cents?: number
  currency?: string
  date?: string
  description?: string
  merchant?: string
  tags?: string[]
}

export interface TransactionFilters {
  from?: string
  to?: string
  category_id?: string
  income_stream_id?: string
  type?: TransactionType
  limit?: number
  cursor?: string
}

// Analytics / Summary
export interface CategoryBreakdown {
  category_id: string
  category_name: string
  category_color: string
  spent_cents: number
  planned_cents: number
}

export interface MonthlySummary {
  month: string
  income_total_cents: number
  expense_total_cents: number
  net_cents: number
  category_breakdown: CategoryBreakdown[]
  recurring_vs_variable: {
    recurring_expenses_cents: number
    variable_expenses_cents: number
  }
}

export interface CashFlowDataPoint {
  period: string
  income_cents: number
  expense_cents: number
  net_cents: number
}

export interface CashFlowSummary {
  data: CashFlowDataPoint[]
  total_income_cents: number
  total_expense_cents: number
  total_net_cents: number
}

// Auth
export interface AuthResponse {
  token: string
  user: User
}

export interface GoogleAuthRequest {
  id_token: string
}

// User Settings
export interface UpdateUserRequest {
  display_name?: string
  default_currency?: string
  locale?: string
}

// API Response Wrapper
export interface ApiError {
  error: string
  code: string
}

export interface PaginatedResponse<T> {
  data: T[]
  next_cursor?: string
  has_more: boolean
}
