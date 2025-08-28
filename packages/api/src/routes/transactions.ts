import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { auth } from '../middleware/auth';
import { db, transactions, categories, budgets, plaidAccounts } from '../db';
import { eq, and, gte, lte, sql, desc, asc, or, ilike } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { Cache } from '../lib/redis';

const transactionsRouter = new Hono();

// Apply auth middleware to all routes
transactionsRouter.use('*', auth);

// Validation schemas
const createTransactionSchema = z.object({
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  description: z.string().min(1).max(200),
  merchantName: z.string().optional(),
  date: z.string().datetime(),
  pending: z.boolean().default(false),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTransactionSchema = createTransactionSchema.partial();

const transactionQuerySchema = z.object({
  budgetId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['income', 'expense']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  pending: z.enum(['true', 'false']).optional(),
  limit: z.string().transform(Number).default('50'),
  offset: z.string().transform(Number).default('0'),
  sort: z.enum(['date', 'amount', 'description']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// List transactions
transactionsRouter.get('/',
  zValidator('query', transactionQuerySchema),
  async (c) => {
    const user = c.get('user');
    const query = c.req.valid('query');
    
    // Check cache for simple queries
    const cacheKey = `transactions:${user.id}:${JSON.stringify(query)}`;
    if (!query.search && query.limit <= 50) {
      const cached = await Cache.get<any>(cacheKey);
      if (cached) {
        c.header('X-Cache', 'HIT');
        return c.json(cached);
      }
    }
    
    // Build query conditions
    let conditions: any[] = [eq(transactions.userId, user.id)];
    
    if (query.budgetId) {
      conditions.push(eq(transactions.budgetId, query.budgetId));
    }
    
    if (query.categoryId) {
      conditions.push(eq(transactions.categoryId, query.categoryId));
    }
    
    if (query.type) {
      conditions.push(eq(transactions.type, query.type));
    }
    
    if (query.startDate) {
      conditions.push(gte(transactions.date, new Date(query.startDate)));
    }
    
    if (query.endDate) {
      conditions.push(lte(transactions.date, new Date(query.endDate)));
    }
    
    if (query.pending !== undefined) {
      conditions.push(eq(transactions.pending, query.pending === 'true'));
    }
    
    if (query.search) {
      conditions.push(
        or(
          ilike(transactions.description, `%${query.search}%`),
          ilike(transactions.merchantName, `%${query.search}%`),
          ilike(transactions.notes, `%${query.search}%`)
        )
      );
    }
    
    // Determine sort order
    let orderBy;
    switch (query.sort) {
      case 'amount':
        orderBy = query.order === 'asc' ? asc(transactions.amount) : desc(transactions.amount);
        break;
      case 'description':
        orderBy = query.order === 'asc' ? asc(transactions.description) : desc(transactions.description);
        break;
      default:
        orderBy = query.order === 'asc' ? asc(transactions.date) : desc(transactions.date);
    }
    
    // Execute query with joins
    const transactionList = await db
      .select({
        transaction: transactions,
        category: categories,
        budget: budgets,
        account: plaidAccounts,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(budgets, eq(transactions.budgetId, budgets.id))
      .leftJoin(plaidAccounts, eq(transactions.plaidAccountId, plaidAccounts.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(query.limit)
      .offset(query.offset);
    
    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(...conditions));
    
    const result = {
      transactions: transactionList.map(t => ({
        ...t.transaction,
        category: t.category ? {
          id: t.category.id,
          name: t.category.name,
          color: t.category.color,
          icon: t.category.icon,
        } : null,
        budget: t.budget ? {
          id: t.budget.id,
          name: t.budget.name,
        } : null,
        account: t.account ? {
          id: t.account.id,
          name: t.account.name,
          mask: t.account.mask,
        } : null,
      })),
      total: count,
      limit: query.limit,
      offset: query.offset,
    };
    
    // Cache for 30 seconds if not searching
    if (!query.search && query.limit <= 50) {
      await Cache.set(cacheKey, result, 30);
    }
    
    c.header('X-Cache', query.search ? 'BYPASS' : 'MISS');
    return c.json(result);
  }
);

// Get single transaction
transactionsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const transactionId = c.req.param('id');
  
  const [transaction] = await db
    .select({
      transaction: transactions,
      category: categories,
      budget: budgets,
      account: plaidAccounts,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(budgets, eq(transactions.budgetId, budgets.id))
    .leftJoin(plaidAccounts, eq(transactions.plaidAccountId, plaidAccounts.id))
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, user.id)
      )
    )
    .limit(1);
  
  if (!transaction) {
    throw new HTTPException(404, { message: 'Transaction not found' });
  }
  
  return c.json({
    ...transaction.transaction,
    category: transaction.category,
    budget: transaction.budget,
    account: transaction.account,
  });
});

// Create transaction
transactionsRouter.post('/',
  zValidator('json', createTransactionSchema),
  async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    
    // Validate category ownership if provided
    if (data.categoryId) {
      const [category] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.userId, user.id)
          )
        )
        .limit(1);
      
      if (!category) {
        throw new HTTPException(400, { message: 'Invalid category' });
      }
    }
    
    // Validate budget ownership if provided
    if (data.budgetId) {
      const [budget] = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.id, data.budgetId),
            eq(budgets.userId, user.id)
          )
        )
        .limit(1);
      
      if (!budget) {
        throw new HTTPException(400, { message: 'Invalid budget' });
      }
    }
    
    // Create transaction
    const [transaction] = await db
      .insert(transactions)
      .values({
        userId: user.id,
        budgetId: data.budgetId,
        categoryId: data.categoryId,
        amount: data.amount.toString(),
        type: data.type,
        description: data.description,
        merchantName: data.merchantName,
        date: new Date(data.date),
        pending: data.pending,
        notes: data.notes,
        tags: data.tags,
      })
      .returning();
    
    // Clear cache
    await Cache.deletePattern(`transactions:${user.id}:*`);
    if (data.budgetId) {
      await Cache.delete(`budget:${data.budgetId}`);
    }
    
    return c.json(transaction, 201);
  }
);

// Update transaction
transactionsRouter.patch('/:id',
  zValidator('json', updateTransactionSchema),
  async (c) => {
    const user = c.get('user');
    const transactionId = c.req.param('id');
    const data = c.req.valid('json');
    
    // Check ownership
    const [existing] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, user.id)
        )
      )
      .limit(1);
    
    if (!existing) {
      throw new HTTPException(404, { message: 'Transaction not found' });
    }
    
    // Don't allow editing Plaid transactions
    if (existing.plaidTransactionId) {
      throw new HTTPException(400, { message: 'Cannot edit synced transactions' });
    }
    
    // Validate new category if provided
    if (data.categoryId) {
      const [category] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.userId, user.id)
          )
        )
        .limit(1);
      
      if (!category) {
        throw new HTTPException(400, { message: 'Invalid category' });
      }
    }
    
    // Update transaction
    const updates: any = {
      updatedAt: new Date(),
    };
    
    if (data.amount !== undefined) updates.amount = data.amount.toString();
    if (data.type !== undefined) updates.type = data.type;
    if (data.description !== undefined) updates.description = data.description;
    if (data.merchantName !== undefined) updates.merchantName = data.merchantName;
    if (data.date !== undefined) updates.date = new Date(data.date);
    if (data.pending !== undefined) updates.pending = data.pending;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.categoryId !== undefined) updates.categoryId = data.categoryId;
    if (data.budgetId !== undefined) updates.budgetId = data.budgetId;
    
    const [updated] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, transactionId))
      .returning();
    
    // Clear cache
    await Cache.deletePattern(`transactions:${user.id}:*`);
    if (existing.budgetId) {
      await Cache.delete(`budget:${existing.budgetId}`);
    }
    if (data.budgetId && data.budgetId !== existing.budgetId) {
      await Cache.delete(`budget:${data.budgetId}`);
    }
    
    return c.json(updated);
  }
);

// Delete transaction
transactionsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const transactionId = c.req.param('id');
  
  // Check ownership
  const [existing] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, user.id)
      )
    )
    .limit(1);
  
  if (!existing) {
    throw new HTTPException(404, { message: 'Transaction not found' });
  }
  
  // Don't allow deleting Plaid transactions
  if (existing.plaidTransactionId) {
    throw new HTTPException(400, { message: 'Cannot delete synced transactions' });
  }
  
  // Delete transaction
  await db
    .delete(transactions)
    .where(eq(transactions.id, transactionId));
  
  // Clear cache
  await Cache.deletePattern(`transactions:${user.id}:*`);
  if (existing.budgetId) {
    await Cache.delete(`budget:${existing.budgetId}`);
  }
  
  return c.json({ message: 'Transaction deleted successfully' });
});

// Bulk categorize transactions
transactionsRouter.post('/bulk-categorize',
  zValidator('json', z.object({
    transactionIds: z.array(z.string().uuid()),
    categoryId: z.string().uuid(),
  })),
  async (c) => {
    const user = c.get('user');
    const { transactionIds, categoryId } = c.req.valid('json');
    
    // Validate category ownership
    const [category] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.userId, user.id)
        )
      )
      .limit(1);
    
    if (!category) {
      throw new HTTPException(400, { message: 'Invalid category' });
    }
    
    // Update transactions
    const result = await db
      .update(transactions)
      .set({
        categoryId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.userId, user.id),
          sql`${transactions.id} = any(${transactionIds})`
        )
      );
    
    // Clear cache
    await Cache.deletePattern(`transactions:${user.id}:*`);
    
    return c.json({ 
      message: 'Transactions categorized successfully',
      updated: result.rowCount,
    });
  }
);

export { transactionsRouter };