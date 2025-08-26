import { z } from 'zod';

// Common validators
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Budget validators
export const createBudgetSchema = z.object({
  name: z.string().min(1).max(100),
  month: z.number().int().min(202001).max(209912), // YYYYMM format
  totalIncome: z.number().positive(),
  categories: z.array(z.object({
    name: z.string().min(1).max(50),
    planned: z.number().min(0),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    icon: z.string().max(50).optional(),
    sortOrder: z.number().int().optional(),
  })).min(1).max(50),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export const budgetCategorySchema = z.object({
  name: z.string().min(1).max(50),
  planned: z.number().min(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().max(50).optional(),
});

// Transaction validators
export const createTransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  merchantName: z.string().max(100).optional(),
  date: z.string().datetime(),
  category: z.string().max(50).optional(),
  budgetCategoryId: z.string().cuid().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const categorizeTransactionSchema = z.object({
  transactionId: z.string().cuid(),
  budgetCategoryId: z.string().cuid(),
});

// Plaid validators
export const plaidPublicTokenSchema = z.object({
  publicToken: z.string().min(1),
  metadata: z.object({
    institution: z.object({
      name: z.string().optional(),
      institution_id: z.string().optional(),
    }).optional(),
    accounts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      mask: z.string().optional(),
      type: z.string(),
      subtype: z.string().optional(),
    })).optional(),
  }).optional(),
});

export const plaidWebhookSchema = z.object({
  webhook_type: z.string(),
  webhook_code: z.string(),
  item_id: z.string(),
  error: z.any().optional(),
  new_transactions: z.number().optional(),
  removed_transactions: z.array(z.string()).optional(),
});

// Paystub validators
export const paystubUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(10 * 1024 * 1024), // 10MB max
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
});

export const paystubDataSchema = z.object({
  employerName: z.string().max(100).optional(),
  payPeriodStart: z.string().datetime().optional(),
  payPeriodEnd: z.string().datetime().optional(),
  payDate: z.string().datetime().optional(),
  grossPay: z.number().min(0).optional(),
  netPay: z.number().min(0).optional(),
  federalTax: z.number().min(0).optional(),
  stateTax: z.number().min(0).optional(),
  socialSecurity: z.number().min(0).optional(),
  medicare: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional(),
});

// Auth validators
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const googleAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});