import type { 
  users, 
  budgets, 
  categories, 
  transactions, 
  plaidConnections,
  plaidAccounts,
  paystubs 
} from '../db/schema';

// Database types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type PlaidConnection = typeof plaidConnections.$inferSelect;
export type NewPlaidConnection = typeof plaidConnections.$inferInsert;

export type PlaidAccount = typeof plaidAccounts.$inferSelect;
export type NewPlaidAccount = typeof plaidAccounts.$inferInsert;

export type Paystub = typeof paystubs.$inferSelect;
export type NewPaystub = typeof paystubs.$inferInsert;

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface AuthResponse {
  user: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'isAnonymous'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface BudgetWithStats extends Budget {
  stats: {
    categoryCount: number;
    transactionCount: number;
    totalSpent: number;
    totalIncome: number;
    remaining: number;
  };
}

export interface CategoryWithStats extends Category {
  transactionCount: number;
  totalSpent: number;
  children?: CategoryWithStats[];
}

export interface TransactionWithRelations extends Transaction {
  category?: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null;
  budget?: Pick<Budget, 'id' | 'name'> | null;
  account?: Pick<PlaidAccount, 'id' | 'name' | 'mask'> | null;
}

// Request types
export interface CreateBudgetRequest {
  name: string;
  description?: string;
  period: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  amount: number;
  currency?: string;
  startDate: string;
  endDate?: string;
}

export interface CreateCategoryRequest {
  budgetId?: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string;
  budgetAmount?: number;
  sortOrder?: number;
}

export interface CreateTransactionRequest {
  budgetId?: string;
  categoryId?: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  merchantName?: string;
  date: string;
  pending?: boolean;
  notes?: string;
  tags?: string[];
}

// Plaid types
export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
  request_id: string;
}

export interface PlaidSyncResult {
  added: number;
  modified: number;
  removed: number;
}

// Queue types
export interface PaystubProcessingJob {
  paystubId: string;
  userId: string;
  fileUrl: string;
}