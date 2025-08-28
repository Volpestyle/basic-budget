import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { auth } from '../middleware/auth';
import { db, categories, transactions } from '../db';
import { eq, and, sql, asc, isNull } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { Cache } from '../lib/redis';

const categoriesRouter = new Hono();

// Apply auth middleware to all routes
categoriesRouter.use('*', auth);

// Validation schemas
const createCategorySchema = z.object({
  budgetId: z.string().uuid().optional(),
  name: z.string().min(1).max(50),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().uuid().optional(),
  budgetAmount: z.number().positive().optional(),
  sortOrder: z.number().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

// List categories
categoriesRouter.get('/', async (c) => {
  const user = c.get('user');
  const budgetId = c.req.query('budgetId');
  
  // Check cache
  const cacheKey = `categories:${user.id}:${budgetId || 'all'}`;
  const cached = await Cache.get<any>(cacheKey);
  
  if (cached) {
    c.header('X-Cache', 'HIT');
    return c.json(cached);
  }
  
  // Build query
  let conditions: any[] = [eq(categories.userId, user.id)];
  
  if (budgetId) {
    conditions.push(eq(categories.budgetId, budgetId));
  }
  
  // Get categories with transaction stats
  const categoryList = await db
    .select({
      category: categories,
      transactionCount: sql<number>`count(${transactions.id})::int`,
      totalSpent: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount}::numeric else 0 end), 0)`,
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  
  // Build tree structure
  const categoryMap = new Map();
  const roots: any[] = [];
  
  // First pass: create all categories
  for (const item of categoryList) {
    const cat = {
      ...item.category,
      transactionCount: item.transactionCount,
      totalSpent: item.totalSpent,
      children: [],
    };
    categoryMap.set(cat.id, cat);
  }
  
  // Second pass: build tree
  for (const cat of categoryMap.values()) {
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(cat);
      }
    } else {
      roots.push(cat);
    }
  }
  
  // Cache for 2 minutes
  await Cache.set(cacheKey, roots, 120);
  
  c.header('X-Cache', 'MISS');
  return c.json(roots);
});

// Get single category
categoriesRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const categoryId = c.req.param('id');
  
  const [category] = await db
    .select({
      category: categories,
      transactionCount: sql<number>`count(${transactions.id})::int`,
      totalSpent: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount}::numeric else 0 end), 0)`,
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, user.id)
      )
    )
    .groupBy(categories.id)
    .limit(1);
  
  if (!category) {
    throw new HTTPException(404, { message: 'Category not found' });
  }
  
  return c.json({
    ...category.category,
    stats: {
      transactionCount: category.transactionCount,
      totalSpent: category.totalSpent,
    },
  });
});

// Create category
categoriesRouter.post('/',
  zValidator('json', createCategorySchema),
  async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    
    // Validate parent category if provided
    if (data.parentId) {
      const [parent] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, data.parentId),
            eq(categories.userId, user.id)
          )
        )
        .limit(1);
      
      if (!parent) {
        throw new HTTPException(400, { message: 'Invalid parent category' });
      }
    }
    
    // Create category
    const [category] = await db
      .insert(categories)
      .values({
        userId: user.id,
        budgetId: data.budgetId,
        name: data.name,
        icon: data.icon,
        color: data.color,
        parentId: data.parentId,
        budgetAmount: data.budgetAmount?.toString(),
        sortOrder: data.sortOrder ?? 0,
        isSystem: false,
      })
      .returning();
    
    // Clear cache
    await Cache.deletePattern(`categories:${user.id}:*`);
    
    return c.json(category, 201);
  }
);

// Update category
categoriesRouter.patch('/:id',
  zValidator('json', updateCategorySchema),
  async (c) => {
    const user = c.get('user');
    const categoryId = c.req.param('id');
    const data = c.req.valid('json');
    
    // Check ownership
    const [existing] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.userId, user.id)
        )
      )
      .limit(1);
    
    if (!existing) {
      throw new HTTPException(404, { message: 'Category not found' });
    }
    
    if (existing.isSystem) {
      throw new HTTPException(400, { message: 'Cannot modify system category' });
    }
    
    // Validate new parent if provided
    if (data.parentId !== undefined) {
      if (data.parentId === categoryId) {
        throw new HTTPException(400, { message: 'Category cannot be its own parent' });
      }
      
      if (data.parentId) {
        const [parent] = await db
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.id, data.parentId),
              eq(categories.userId, user.id)
            )
          )
          .limit(1);
        
        if (!parent) {
          throw new HTTPException(400, { message: 'Invalid parent category' });
        }
      }
    }
    
    // Update category
    const updates: any = {
      updatedAt: new Date(),
    };
    
    if (data.name !== undefined) updates.name = data.name;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.color !== undefined) updates.color = data.color;
    if (data.parentId !== undefined) updates.parentId = data.parentId;
    if (data.budgetAmount !== undefined) updates.budgetAmount = data.budgetAmount.toString();
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.budgetId !== undefined) updates.budgetId = data.budgetId;
    
    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, categoryId))
      .returning();
    
    // Clear cache
    await Cache.deletePattern(`categories:${user.id}:*`);
    
    return c.json(updated);
  }
);

// Delete category
categoriesRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const categoryId = c.req.param('id');
  
  // Check ownership
  const [existing] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, user.id)
      )
    )
    .limit(1);
  
  if (!existing) {
    throw new HTTPException(404, { message: 'Category not found' });
  }
  
  if (existing.isSystem) {
    throw new HTTPException(400, { message: 'Cannot delete system category' });
  }
  
  // Check for child categories
  const [{ hasChildren }] = await db
    .select({ hasChildren: sql<boolean>`exists(select 1 from ${categories} where ${categories.parentId} = ${categoryId})` })
    .from(categories)
    .limit(1);
  
  if (hasChildren) {
    throw new HTTPException(400, { message: 'Cannot delete category with child categories' });
  }
  
  // Check for transactions
  const [{ hasTransactions }] = await db
    .select({ hasTransactions: sql<boolean>`exists(select 1 from ${transactions} where ${transactions.categoryId} = ${categoryId})` })
    .from(transactions)
    .limit(1);
  
  if (hasTransactions) {
    // Set transactions category to null instead of blocking deletion
    await db
      .update(transactions)
      .set({ categoryId: null })
      .where(eq(transactions.categoryId, categoryId));
  }
  
  // Delete category
  await db
    .delete(categories)
    .where(eq(categories.id, categoryId));
  
  // Clear cache
  await Cache.deletePattern(`categories:${user.id}:*`);
  
  return c.json({ message: 'Category deleted successfully' });
});

// Reorder categories
categoriesRouter.post('/reorder',
  zValidator('json', z.object({
    categoryOrders: z.array(z.object({
      id: z.string().uuid(),
      sortOrder: z.number(),
    })),
  })),
  async (c) => {
    const user = c.get('user');
    const { categoryOrders } = c.req.valid('json');
    
    // Update sort orders in a transaction
    for (const { id, sortOrder } of categoryOrders) {
      await db
        .update(categories)
        .set({ sortOrder, updatedAt: new Date() })
        .where(
          and(
            eq(categories.id, id),
            eq(categories.userId, user.id)
          )
        );
    }
    
    // Clear cache
    await Cache.deletePattern(`categories:${user.id}:*`);
    
    return c.json({ message: 'Categories reordered successfully' });
  }
);

export { categoriesRouter };