import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import { authMiddleware, requireUserId } from '@/middleware/auth';
import { standardRateLimit } from '@/middleware/rateLimit';
import { 
  createBudgetSchema, 
  updateBudgetSchema,
  budgetCategorySchema,
  paginationSchema
} from '@/validators';

const budgets = new Hono();

// Apply middleware
budgets.use('*', authMiddleware, standardRateLimit);

// GET /budgets - List budgets
budgets.get('/',
  requireUserId,
  zValidator('query', paginationSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const { page, limit, sort = 'month', order } = c.req.valid('query');
    
    // Check cache
    const cacheKey = `budgets:${userId}:${page}:${limit}:${sort}:${order}`;
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);
    
    const [budgets, total] = await Promise.all([
      prisma.budget.findMany({
        where: { 
          userId,
          // For anonymous users, filter by userId pattern
          ...(userId.startsWith('anon_') ? {} : { user: { id: userId } })
        },
        include: {
          categories: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.budget.count({
        where: { userId },
      }),
    ]);
    
    const response = {
      data: budgets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    
    // Cache for 60 seconds
    await cache.set(cacheKey, response, 60);
    
    return c.json(response);
  }
);

// GET /budgets/current - Get current month's budget
budgets.get('/current',
  requireUserId,
  async (c) => {
    const userId = c.get('userId')!;
    const currentMonth = parseInt(
      new Date().toISOString().slice(0, 7).replace('-', '')
    );
    
    // Check cache
    const cacheKey = `budget:${userId}:current`;
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);
    
    const budget = await prisma.budget.findFirst({
      where: {
        userId,
        month: currentMonth,
        isActive: true,
      },
      include: {
        categories: {
          include: {
            transactions: {
              include: {
                transaction: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    
    if (!budget) {
      return c.json({ error: 'No budget found for current month' }, 404);
    }
    
    // Calculate spent amounts
    const categoriesWithSpent = budget.categories.map(category => ({
      ...category,
      spent: category.transactions.reduce(
        (sum, mapping) => sum + Number(mapping.transaction.amount),
        0
      ),
      transactions: undefined, // Remove transaction details from response
    }));
    
    const response = {
      ...budget,
      categories: categoriesWithSpent,
    };
    
    // Cache for 30 seconds
    await cache.set(cacheKey, response, 30);
    
    return c.json(response);
  }
);

// GET /budgets/:id - Get specific budget
budgets.get('/:id',
  requireUserId,
  async (c) => {
    const userId = c.get('userId')!;
    const budgetId = c.req.param('id');
    
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    
    if (!budget) {
      return c.json({ error: 'Budget not found' }, 404);
    }
    
    return c.json(budget);
  }
);

// POST /budgets - Create budget
budgets.post('/',
  requireUserId,
  zValidator('json', createBudgetSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');
    
    // Check if budget already exists for this month
    const existing = await prisma.budget.findFirst({
      where: {
        userId,
        month: data.month,
      },
    });
    
    if (existing) {
      return c.json({ error: 'Budget already exists for this month' }, 409);
    }
    
    // Create budget with categories
    const budget = await prisma.budget.create({
      data: {
        userId,
        name: data.name,
        month: data.month,
        totalIncome: data.totalIncome,
        categories: {
          create: data.categories.map((cat, index) => ({
            name: cat.name,
            planned: cat.planned,
            color: cat.color,
            icon: cat.icon,
            sortOrder: cat.sortOrder ?? index,
          })),
        },
      },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`budgets:${userId}:*`);
    await cache.del(`budget:${userId}:current`);
    
    return c.json(budget, 201);
  }
);

// PUT /budgets/:id - Update budget
budgets.put('/:id',
  requireUserId,
  zValidator('json', updateBudgetSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const budgetId = c.req.param('id');
    const data = c.req.valid('json');
    
    // Verify ownership
    const existing = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });
    
    if (!existing) {
      return c.json({ error: 'Budget not found' }, 404);
    }
    
    // Update budget
    const budget = await prisma.budget.update({
      where: { id: budgetId },
      data: {
        name: data.name,
        totalIncome: data.totalIncome,
        // Handle categories update if provided
        ...(data.categories && {
          categories: {
            deleteMany: {}, // Remove all existing categories
            create: data.categories.map((cat, index) => ({
              name: cat.name,
              planned: cat.planned,
              color: cat.color,
              icon: cat.icon,
              sortOrder: cat.sortOrder ?? index,
            })),
          },
        }),
      },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`budgets:${userId}:*`);
    await cache.del(`budget:${userId}:current`);
    
    return c.json(budget);
  }
);

// DELETE /budgets/:id - Delete budget
budgets.delete('/:id',
  requireUserId,
  async (c) => {
    const userId = c.get('userId')!;
    const budgetId = c.req.param('id');
    
    // Verify ownership
    const existing = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });
    
    if (!existing) {
      return c.json({ error: 'Budget not found' }, 404);
    }
    
    // Delete budget (cascade will handle categories)
    await prisma.budget.delete({
      where: { id: budgetId },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`budgets:${userId}:*`);
    await cache.del(`budget:${userId}:current`);
    
    return c.json({ success: true });
  }
);

// POST /budgets/:id/categories - Add category to budget
budgets.post('/:id/categories',
  requireUserId,
  zValidator('json', budgetCategorySchema),
  async (c) => {
    const userId = c.get('userId')!;
    const budgetId = c.req.param('id');
    const data = c.req.valid('json');
    
    // Verify ownership
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });
    
    if (!budget) {
      return c.json({ error: 'Budget not found' }, 404);
    }
    
    // Get max sort order
    const maxSortOrder = await prisma.budgetCategory.findFirst({
      where: { budgetId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    
    // Create category
    const category = await prisma.budgetCategory.create({
      data: {
        budgetId,
        name: data.name,
        planned: data.planned,
        color: data.color,
        icon: data.icon,
        sortOrder: (maxSortOrder?.sortOrder ?? -1) + 1,
      },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`budgets:${userId}:*`);
    await cache.del(`budget:${userId}:current`);
    
    return c.json(category, 201);
  }
);

// PUT /budgets/:id/categories/:categoryId - Update category
budgets.put('/:id/categories/:categoryId',
  requireUserId,
  zValidator('json', budgetCategorySchema.partial()),
  async (c) => {
    const userId = c.get('userId')!;
    const budgetId = c.req.param('id');
    const categoryId = c.req.param('categoryId');
    const data = c.req.valid('json');
    
    // Verify ownership
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });
    
    if (!budget) {
      return c.json({ error: 'Budget not found' }, 404);
    }
    
    // Update category
    const category = await prisma.budgetCategory.update({
      where: { id: categoryId },
      data,
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`budgets:${userId}:*`);
    await cache.del(`budget:${userId}:current`);
    
    return c.json(category);
  }
);

// DELETE /budgets/:id/categories/:categoryId - Delete category
budgets.delete('/:id/categories/:categoryId',
  requireUserId,
  async (c) => {
    const userId = c.get('userId')!;
    const budgetId = c.req.param('id');
    const categoryId = c.req.param('categoryId');
    
    // Verify ownership
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });
    
    if (!budget) {
      return c.json({ error: 'Budget not found' }, 404);
    }
    
    // Delete category
    await prisma.budgetCategory.delete({
      where: { id: categoryId },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`budgets:${userId}:*`);
    await cache.del(`budget:${userId}:current`);
    
    return c.json({ success: true });
  }
);

// POST /budgets/:id/duplicate - Duplicate budget to another month
budgets.post('/:id/duplicate',
  requireUserId,
  zValidator('json', z.object({ month: z.number() })),
  async (c) => {
    const userId = c.get('userId')!;
    const budgetId = c.req.param('id');
    const { month } = c.req.valid('json');
    
    // Get source budget
    const sourceBudget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
      include: {
        categories: true,
      },
    });
    
    if (!sourceBudget) {
      return c.json({ error: 'Budget not found' }, 404);
    }
    
    // Check if target month already has a budget
    const existing = await prisma.budget.findFirst({
      where: {
        userId,
        month,
      },
    });
    
    if (existing) {
      return c.json({ error: 'Budget already exists for target month' }, 409);
    }
    
    // Create duplicate
    const newBudget = await prisma.budget.create({
      data: {
        userId,
        name: sourceBudget.name,
        month,
        totalIncome: sourceBudget.totalIncome,
        categories: {
          create: sourceBudget.categories.map(cat => ({
            name: cat.name,
            planned: cat.planned,
            color: cat.color,
            icon: cat.icon,
            sortOrder: cat.sortOrder,
          })),
        },
      },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`budgets:${userId}:*`);
    
    return c.json(newBudget, 201);
  }
);

export default budgets;