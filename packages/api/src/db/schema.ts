import { 
  pgTable, 
  text, 
  timestamp, 
  uuid, 
  boolean, 
  integer, 
  decimal, 
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Enums
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);
export const authProviderEnum = pgEnum('auth_provider', ['google', 'anonymous']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);
export const budgetPeriodEnum = pgEnum('budget_period', ['weekly', 'biweekly', 'monthly', 'yearly']);
export const paystubStatusEnum = pgEnum('paystub_status', ['pending', 'processing', 'completed', 'failed']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  provider: authProviderEnum('provider').notNull(),
  providerId: text('provider_id'),
  status: userStatusEnum('status').default('active').notNull(),
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
  anonymousSessionId: text('anonymous_session_id').unique(),
  metadata: jsonb('metadata'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  providerIdx: index('users_provider_idx').on(table.provider, table.providerId),
  sessionIdx: index('users_session_idx').on(table.anonymousSessionId),
}));

// Sessions table (for JWT refresh tokens)
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  refreshToken: text('refresh_token').unique().notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
  tokenIdx: uniqueIndex('sessions_token_idx').on(table.refreshToken),
  expiresIdx: index('sessions_expires_idx').on(table.expiresAt),
}));

// Budgets table
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  period: budgetPeriodEnum('period').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').default('USD').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('budgets_user_idx').on(table.userId),
  activeIdx: index('budgets_active_idx').on(table.isActive),
  dateIdx: index('budgets_date_idx').on(table.startDate, table.endDate),
}));

// Categories table
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  isSystem: boolean('is_system').default(false).notNull(),
  parentId: uuid('parent_id'),
  budgetAmount: decimal('budget_amount', { precision: 12, scale: 2 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('categories_user_idx').on(table.userId),
  budgetIdx: index('categories_budget_idx').on(table.budgetId),
  parentIdx: index('categories_parent_idx').on(table.parentId),
  nameIdx: index('categories_name_idx').on(table.userId, table.name),
}));

// Plaid connections
export const plaidConnections = pgTable('plaid_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  itemId: text('item_id').unique().notNull(),
  accessToken: text('access_token').notNull(), // Should be encrypted in production
  institutionId: text('institution_id'),
  institutionName: text('institution_name'),
  cursor: text('cursor'),
  lastSyncedAt: timestamp('last_synced_at'),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('plaid_user_idx').on(table.userId),
  itemIdx: uniqueIndex('plaid_item_idx').on(table.itemId),
  activeIdx: index('plaid_active_idx').on(table.isActive),
}));

// Plaid accounts
export const plaidAccounts = pgTable('plaid_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').references(() => plaidConnections.id, { onDelete: 'cascade' }).notNull(),
  accountId: text('account_id').unique().notNull(),
  name: text('name').notNull(),
  officialName: text('official_name'),
  type: text('type').notNull(),
  subtype: text('subtype'),
  mask: text('mask'),
  currentBalance: decimal('current_balance', { precision: 12, scale: 2 }),
  availableBalance: decimal('available_balance', { precision: 12, scale: 2 }),
  currency: text('currency').default('USD'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  connectionIdx: index('accounts_connection_idx').on(table.connectionId),
  accountIdx: uniqueIndex('accounts_account_idx').on(table.accountId),
}));

// Transactions table
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'set null' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  plaidAccountId: uuid('plaid_account_id').references(() => plaidAccounts.id, { onDelete: 'set null' }),
  plaidTransactionId: text('plaid_transaction_id').unique(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum('type').notNull(),
  description: text('description').notNull(),
  merchantName: text('merchant_name'),
  date: timestamp('date').notNull(),
  pending: boolean('pending').default(false).notNull(),
  notes: text('notes'),
  tags: text('tags').array(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('transactions_user_idx').on(table.userId),
  budgetIdx: index('transactions_budget_idx').on(table.budgetId),
  categoryIdx: index('transactions_category_idx').on(table.categoryId),
  dateIdx: index('transactions_date_idx').on(table.date),
  plaidIdx: index('transactions_plaid_idx').on(table.plaidTransactionId),
  accountIdx: index('transactions_account_idx').on(table.plaidAccountId),
}));

// Paystubs table
export const paystubs = pgTable('paystubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  status: paystubStatusEnum('status').default('pending').notNull(),
  processedData: jsonb('processed_data'),
  grossPay: decimal('gross_pay', { precision: 12, scale: 2 }),
  netPay: decimal('net_pay', { precision: 12, scale: 2 }),
  payDate: timestamp('pay_date'),
  payPeriodStart: timestamp('pay_period_start'),
  payPeriodEnd: timestamp('pay_period_end'),
  employerName: text('employer_name'),
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('paystubs_user_idx').on(table.userId),
  statusIdx: index('paystubs_status_idx').on(table.status),
  dateIdx: index('paystubs_date_idx').on(table.payDate),
}));

// Webhook logs for Plaid
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source').notNull(), // 'plaid', 'stripe', etc.
  webhookType: text('webhook_type').notNull(),
  webhookCode: text('webhook_code'),
  itemId: text('item_id'),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').default(false).notNull(),
  errorMessage: text('error_message'),
  attempts: integer('attempts').default(0).notNull(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('webhooks_source_idx').on(table.source),
  processedIdx: index('webhooks_processed_idx').on(table.processed),
  itemIdx: index('webhooks_item_idx').on(table.itemId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  budgets: many(budgets),
  categories: many(categories),
  transactions: many(transactions),
  plaidConnections: many(plaidConnections),
  paystubs: many(paystubs),
}));

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  categories: many(categories),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  budget: one(budgets, {
    fields: [categories.budgetId],
    references: [budgets.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  budget: one(budgets, {
    fields: [transactions.budgetId],
    references: [budgets.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  plaidAccount: one(plaidAccounts, {
    fields: [transactions.plaidAccountId],
    references: [plaidAccounts.id],
  }),
}));

export const plaidConnectionsRelations = relations(plaidConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [plaidConnections.userId],
    references: [users.id],
  }),
  accounts: many(plaidAccounts),
}));

export const plaidAccountsRelations = relations(plaidAccounts, ({ one, many }) => ({
  connection: one(plaidConnections, {
    fields: [plaidAccounts.connectionId],
    references: [plaidConnections.id],
  }),
  transactions: many(transactions),
}));