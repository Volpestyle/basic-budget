import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import { authMiddleware, requireUserId } from '@/middleware/auth';
import { standardRateLimit } from '@/middleware/rateLimit';
import { 
  createTransactionSchema,
  updateTransactionSchema,
  categorizeTransactionSchema,
  paginationSchema,
  dateRangeSchema
} from '@/validators';

const transactions = new Hono();

// Apply middleware
transactions.use('*', authMiddleware, standardRateLimit);

// GET /transactions - List transactions with filtering
transactions.get('/',
  requireUserId,
  zValidator('query', paginationSchema.merge(dateRangeSchema).extend({
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    search: z.string().optional(),
    pending: z.coerce.boolean().optional(),
  })),
  async (c) => {
    const userId = c.get('userId')!;
    const { 
      page, 
      limit, 
      sort = 'date', 
      order,
      startDate,
      endDate,
      accountId,
      categoryId,
      search,
      pending
    } = c.req.valid('query');
    
    // Build cache key
    const cacheKey = `transactions:${userId}:${page}:${limit}:${sort}:${order}:${startDate}:${endDate}:${accountId}:${categoryId}:${search}:${pending}`;
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);
    
    // Build where clause
    const where: any = {
      userId,
      ...(startDate && { date: { gte: new Date(startDate) } }),
      ...(endDate && { date: { ...where?.date, lte: new Date(endDate) } }),
      ...(accountId && { plaidAccountId: accountId }),
      ...(pending !== undefined && { pending }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { merchantName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    
    // Handle category filtering
    if (categoryId) {
      where.categoryMappings = {
        some: { budgetCategoryId: categoryId },
      };
    }
    
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          plaidAccount: {
            select: {
              id: true,
              name: true,
              mask: true,
              type: true,
            },
          },
          categoryMappings: {
            include: {
              budgetCategory: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  icon: true,
                },
              },
            },
          },
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);
    
    const response = {
      data: transactions.map(t => ({
        ...t,
        amount: Number(t.amount),
        categories: t.categoryMappings.map(m => m.budgetCategory),
        categoryMappings: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    
    // Cache for 30 seconds
    await cache.set(cacheKey, response, 30);
    
    return c.json(response);
  }
);

// GET /transactions/summary - Get transaction summary
transactions.get('/summary',
  requireUserId,
  zValidator('query', dateRangeSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const { startDate, endDate } = c.req.valid('query');
    
    // Build date filter
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };
    
    // Get summary data
    const [totalSpent, transactionCount, categoryBreakdown] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          date: dateFilter,
          pending: false,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: {
          userId,
          date: dateFilter,
        },
      }),
      prisma.$queryRaw<Array<{ categoryId: string; categoryName: string; total: number }>>`
        SELECT 
          bc.id as "categoryId",
          bc.name as "categoryName",
          SUM(t.amount) as total
        FROM "Transaction" t
        INNER JOIN "TransactionCategoryMapping" tcm ON t.id = tcm."transactionId"
        INNER JOIN "BudgetCategory" bc ON tcm."budgetCategoryId" = bc.id
        WHERE t."userId" = ${userId}
          ${startDate ? Prisma.sql`AND t.date >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND t.date <= ${new Date(endDate)}` : Prisma.empty}
          AND t.pending = false
        GROUP BY bc.id, bc.name
        ORDER BY total DESC
      `,
    ]);
    
    return c.json({
      totalSpent: Number(totalSpent._sum.amount || 0),
      transactionCount,
      categoryBreakdown: categoryBreakdown.map(c => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        total: Number(c.total),
      })),
    });
  }
);

// GET /transactions/:id - Get specific transaction
transactions.get('/:id',
  requireUserId,
  async (c) => {
    const userId = c.get('userId')!;
    const transactionId = c.req.param('id');
    
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        plaidAccount: true,
        categoryMappings: {
          include: {
            budgetCategory: true,
          },
        },
      },
    });
    
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }
    
    return c.json({
      ...transaction,
      amount: Number(transaction.amount),
      categories: transaction.categoryMappings.map(m => m.budgetCategory),
      categoryMappings: undefined,
    });
  }
);

// POST /transactions - Create manual transaction
transactions.post('/',
  requireUserId,
  zValidator('json', createTransactionSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');
    
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: data.amount,
        description: data.description,
        merchantName: data.merchantName,
        date: new Date(data.date),
        category: data.category,
        isManual: true,
        // Create category mapping if provided
        ...(data.budgetCategoryId && {
          categoryMappings: {
            create: {
              budgetCategoryId: data.budgetCategoryId,
            },
          },
        }),
      },
      include: {
        categoryMappings: {
          include: {
            budgetCategory: true,
          },
        },
      },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`transactions:${userId}:*`);
    
    return c.json({
      ...transaction,
      amount: Number(transaction.amount),
      categories: transaction.categoryMappings.map(m => m.budgetCategory),
      categoryMappings: undefined,
    }, 201);
  }
);

// PUT /transactions/:id - Update transaction
transactions.put('/:id',
  requireUserId,
  zValidator('json', updateTransactionSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const transactionId = c.req.param('id');
    const data = c.req.valid('json');
    
    // Verify ownership
    const existing = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });
    
    if (!existing) {
      return c.json({ error: 'Transaction not found' }, 404);
    }
    
    // Only allow updating manual transactions
    if (!existing.isManual) {
      return c.json({ error: 'Cannot update synced transactions' }, 403);
    }
    
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        amount: data.amount,
        description: data.description,
        merchantName: data.merchantName,
        date: data.date ? new Date(data.date) : undefined,
        category: data.category,
      },
      include: {
        categoryMappings: {
          include: {
            budgetCategory: true,
          },
        },
      },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`transactions:${userId}:*`);
    
    return c.json({
      ...transaction,
      amount: Number(transaction.amount),
      categories: transaction.categoryMappings.map(m => m.budgetCategory),
      categoryMappings: undefined,
    });
  }
);

// DELETE /transactions/:id - Delete transaction
transactions.delete('/:id',
  requireUserId,
  async (c) => {
    const userId = c.get('userId')!;
    const transactionId = c.req.param('id');
    
    // Verify ownership and that it's manual
    const existing = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });
    
    if (!existing) {
      return c.json({ error: 'Transaction not found' }, 404);
    }
    
    if (!existing.isManual) {
      return c.json({ error: 'Cannot delete synced transactions' }, 403);
    }
    
    await prisma.transaction.delete({
      where: { id: transactionId },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`transactions:${userId}:*`);
    
    return c.json({ success: true });
  }
);

// POST /transactions/:id/categorize - Categorize transaction
transactions.post('/:id/categorize',
  requireUserId,
  zValidator('json', z.object({ budgetCategoryId: z.string().cuid() })),
  async (c) => {
    const userId = c.get('userId')!;
    const transactionId = c.req.param('id');
    const { budgetCategoryId } = c.req.valid('json');
    
    // Verify transaction ownership
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });
    
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }
    
    // Verify category exists
    const category = await prisma.budgetCategory.findUnique({
      where: { id: budgetCategoryId },
      include: { budget: true },
    });
    
    if (!category || category.budget.userId !== userId) {
      return c.json({ error: 'Category not found' }, 404);
    }
    
    // Create or update category mapping
    await prisma.transactionCategoryMapping.upsert({
      where: {
        transactionId_budgetCategoryId: {
          transactionId,
          budgetCategoryId,
        },
      },
      create: {
        transactionId,
        budgetCategoryId,
      },
      update: {},
    });
    
    // Update category spent amount
    await prisma.budgetCategory.update({
      where: { id: budgetCategoryId },
      data: {
        spent: {
          increment: transaction.amount,
        },
      },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`transactions:${userId}:*`);
    await cache.invalidatePattern(`budgets:${userId}:*`);
    
    return c.json({ success: true });
  }
);

// DELETE /transactions/:id/categorize/:categoryId - Remove category from transaction
transactions.delete('/:id/categorize/:categoryId',
  requireUserId,
  async (c) => {
    const userId = c.get('userId')!;
    const transactionId = c.req.param('id');
    const categoryId = c.req.param('categoryId');
    
    // Verify transaction ownership
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });
    
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }
    
    // Delete category mapping
    await prisma.transactionCategoryMapping.delete({
      where: {
        transactionId_budgetCategoryId: {
          transactionId,
          budgetCategoryId: categoryId,
        },
      },
    }).catch(() => {}); // Ignore if not found
    
    // Update category spent amount
    await prisma.budgetCategory.update({
      where: { id: categoryId },
      data: {
        spent: {
          decrement: transaction.amount,
        },
      },
    }).catch(() => {}); // Ignore if not found
    
    // Invalidate cache
    await cache.invalidatePattern(`transactions:${userId}:*`);
    await cache.invalidatePattern(`budgets:${userId}:*`);
    
    return c.json({ success: true });
  }
);

// POST /transactions/bulk-categorize - Bulk categorize transactions
transactions.post('/bulk-categorize',
  requireUserId,
  zValidator('json', z.object({
    mappings: z.array(z.object({
      transactionId: z.string().cuid(),
      budgetCategoryId: z.string().cuid(),
    })),
  })),
  async (c) => {
    const userId = c.get('userId')!;
    const { mappings } = c.req.valid('json');
    
    // Verify all transactions belong to user
    const transactionIds = mappings.map(m => m.transactionId);
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId,
      },
    });
    
    if (transactions.length !== transactionIds.length) {
      return c.json({ error: 'Some transactions not found' }, 404);
    }
    
    // Verify all categories exist
    const categoryIds = [...new Set(mappings.map(m => m.budgetCategoryId))];
    const categories = await prisma.budgetCategory.findMany({
      where: {
        id: { in: categoryIds },
        budget: { userId },
      },
    });
    
    if (categories.length !== categoryIds.length) {
      return c.json({ error: 'Some categories not found' }, 404);
    }
    
    // Create mappings in batch
    await prisma.transactionCategoryMapping.createMany({
      data: mappings,
      skipDuplicates: true,
    });
    
    // Update category spent amounts
    const categoryUpdates = categories.map(category => {
      const categoryTransactions = mappings
        .filter(m => m.budgetCategoryId === category.id)
        .map(m => transactions.find(t => t.id === m.transactionId)!)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      return prisma.budgetCategory.update({
        where: { id: category.id },
        data: {
          spent: {
            increment: categoryTransactions,
          },
        },
      });
    });
    
    await Promise.all(categoryUpdates);
    
    // Invalidate cache
    await cache.invalidatePattern(`transactions:${userId}:*`);
    await cache.invalidatePattern(`budgets:${userId}:*`);
    
    return c.json({ success: true, mapped: mappings.length });
  }
);

export default transactions;