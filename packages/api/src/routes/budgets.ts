import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { auth } from '../middleware/auth';
import { db, budgets, categories, transactions } from '../db';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { Cache } from '../lib/redis';

const budgetsRouter = new Hono();

// Apply auth middleware to all routes
budgetsRouter.use('*', auth);

// Validation schemas
const createBudgetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  period: z.enum(['weekly', 'biweekly', 'monthly', 'yearly']),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

const updateBudgetSchema = createBudgetSchema.partial();

const budgetQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  period: z.enum(['weekly', 'biweekly', 'monthly', 'yearly']).optional(),
  limit: z.string().transform(Number).default('10'),
  offset: z.string().transform(Number).default('0'),
});

// List budgets
budgetsRouter.get('/',
  zValidator('query', budgetQuerySchema),
  async (c) => {
    const user = c.get('user');
    const query = c.req.valid('query');
    
    // Check cache
    const cacheKey = `budgets:${user.id}:${JSON.stringify(query)}`;
    const cached = await Cache.get<any>(cacheKey);
    
    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json(cached);
    }
    
    // Build query
    let conditions = [eq(budgets.userId, user.id)];
    
    if (query.active !== undefined) {
      conditions.push(eq(budgets.isActive, query.active === 'true'));
    }
    
    if (query.period) {
      conditions.push(eq(budgets.period, query.period));
    }
    
    // Get budgets with category count
    const budgetList = await db
      .select({
        budget: budgets,
        categoryCount: sql<number>`count(${categories.id})::int`,
      })
      .from(budgets)
      .leftJoin(categories, eq(categories.budgetId, budgets.id))
      .where(and(...conditions))
      .groupBy(budgets.id)
      .orderBy(desc(budgets.createdAt))
      .limit(query.limit)
      .offset(query.offset);
    
    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(budgets)
      .where(and(...conditions));
    
    const result = {
      budgets: budgetList.map(b => ({
        ...b.budget,
        categoryCount: b.categoryCount,
      })),
      total: count,
      limit: query.limit,
      offset: query.offset,
    };
    
    // Cache for 1 minute
    await Cache.set(cacheKey, result, 60);
    
    c.header('X-Cache', 'MISS');
    return c.json(result);
  }
);

// Get single budget
budgetsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const budgetId = c.req.param('id');
  
  // Check cache
  const cacheKey = `budget:${budgetId}`;
  const cached = await Cache.get<any>(cacheKey);
  
  if (cached) {
    c.header('X-Cache', 'HIT');
    return c.json(cached);
  }
  
  // Get budget with stats
  const [budget] = await db
    .select({
      budget: budgets,
      categoryCount: sql<number>`count(distinct ${categories.id})::int`,
      transactionCount: sql<number>`count(distinct ${transactions.id})::int`,
      totalSpent: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount}::numeric else 0 end), 0)`,
      totalIncome: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount}::numeric else 0 end), 0)`,
    })
    .from(budgets)
    .leftJoin(categories, eq(categories.budgetId, budgets.id))
    .leftJoin(transactions, eq(transactions.budgetId, budgets.id))
    .where(
      and(
        eq(budgets.id, budgetId),
        eq(budgets.userId, user.id)
      )
    )
    .groupBy(budgets.id)
    .limit(1);
  
  if (!budget) {
    throw new HTTPException(404, { message: 'Budget not found' });
  }
  
  const result = {
    ...budget.budget,
    stats: {
      categoryCount: budget.categoryCount,
      transactionCount: budget.transactionCount,
      totalSpent: budget.totalSpent,
      totalIncome: budget.totalIncome,
      remaining: Number(budget.budget.amount) - budget.totalSpent,
    },
  };
  
  // Cache for 30 seconds
  await Cache.set(cacheKey, result, 30);
  
  c.header('X-Cache', 'MISS');
  return c.json(result);
});

// Create budget
budgetsRouter.post('/',
  zValidator('json', createBudgetSchema),
  async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    
    // Create budget
    const [budget] = await db
      .insert(budgets)
      .values({
        userId: user.id,
        name: data.name,
        description: data.description,
        period: data.period,
        amount: data.amount.toString(),
        currency: data.currency,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        isActive: true,
      })
      .returning();
    
    // Clear cache
    await Cache.deletePattern(`budgets:${user.id}:*`);
    
    return c.json(budget, 201);
  }
);

// Update budget
budgetsRouter.patch('/:id',
  zValidator('json', updateBudgetSchema),
  async (c) => {
    const user = c.get('user');
    const budgetId = c.req.param('id');
    const data = c.req.valid('json');
    
    // Check ownership
    const [existing] = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.id, budgetId),
          eq(budgets.userId, user.id)
        )
      )
      .limit(1);
    
    if (!existing) {
      throw new HTTPException(404, { message: 'Budget not found' });
    }
    
    // Update budget
    const updates: any = {
      updatedAt: new Date(),
    };
    
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.period !== undefined) updates.period = data.period;
    if (data.amount !== undefined) updates.amount = data.amount.toString();
    if (data.currency !== undefined) updates.currency = data.currency;
    if (data.startDate !== undefined) updates.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updates.endDate = new Date(data.endDate);
    
    const [updated] = await db
      .update(budgets)
      .set(updates)
      .where(eq(budgets.id, budgetId))
      .returning();
    
    // Clear cache
    await Cache.deletePattern(`budget*:${budgetId}*`);
    await Cache.deletePattern(`budgets:${user.id}:*`);
    
    return c.json(updated);
  }
);

// Delete budget
budgetsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const budgetId = c.req.param('id');
  
  // Check ownership
  const [existing] = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.id, budgetId),
        eq(budgets.userId, user.id)
      )
    )
    .limit(1);
  
  if (!existing) {
    throw new HTTPException(404, { message: 'Budget not found' });
  }
  
  // Soft delete by setting inactive
  await db
    .update(budgets)
    .set({ 
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(budgets.id, budgetId));
  
  // Clear cache
  await Cache.deletePattern(`budget*:${budgetId}*`);
  await Cache.deletePattern(`budgets:${user.id}:*`);
  
  return c.json({ message: 'Budget deleted successfully' });
});

// Get budget summary/analytics
budgetsRouter.get('/:id/summary', async (c) => {
  const user = c.get('user');
  const budgetId = c.req.param('id');
  
  // Check ownership
  const [budget] = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.id, budgetId),
        eq(budgets.userId, user.id)
      )
    )
    .limit(1);
  
  if (!budget) {
    throw new HTTPException(404, { message: 'Budget not found' });
  }
  
  // Get category breakdown
  const categoryBreakdown = await db
    .select({
      category: categories,
      spent: sql<number>`coalesce(sum(${transactions.amount}::numeric), 0)`,
      transactionCount: sql<number>`count(${transactions.id})::int`,
    })
    .from(categories)
    .leftJoin(transactions, 
      and(
        eq(transactions.categoryId, categories.id),
        eq(transactions.type, 'expense')
      )
    )
    .where(eq(categories.budgetId, budgetId))
    .groupBy(categories.id);
  
  // Get daily spending for the budget period
  const dailySpending = await db
    .select({
      date: sql<string>`date(${transactions.date})`,
      amount: sql<number>`sum(${transactions.amount}::numeric)`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.budgetId, budgetId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, budget.startDate),
        budget.endDate ? lte(transactions.date, budget.endDate) : sql`true`
      )
    )
    .groupBy(sql`date(${transactions.date})`)
    .orderBy(sql`date(${transactions.date})`);
  
  return c.json({
    budget,
    categoryBreakdown: categoryBreakdown.map(cb => ({
      ...cb.category,
      spent: cb.spent,
      transactionCount: cb.transactionCount,
      percentOfBudget: cb.category.budgetAmount 
        ? (cb.spent / Number(cb.category.budgetAmount)) * 100
        : 0,
    })),
    dailySpending,
    summary: {
      totalBudget: Number(budget.amount),
      totalSpent: categoryBreakdown.reduce((sum, cb) => sum + cb.spent, 0),
      remaining: Number(budget.amount) - categoryBreakdown.reduce((sum, cb) => sum + cb.spent, 0),
      daysRemaining: budget.endDate 
        ? Math.max(0, Math.ceil((new Date(budget.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
    },
  });
});

export { budgetsRouter };