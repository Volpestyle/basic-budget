import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import { PlaidService, plaidClient } from '@/lib/plaid';
import { authMiddleware, requireAuth } from '@/middleware/auth';
import { standardRateLimit, strictRateLimit } from '@/middleware/rateLimit';
import { plaidPublicTokenSchema, plaidWebhookSchema } from '@/validators';
import { env } from '@/config/env';

const plaid = new Hono();

// Apply middleware
plaid.use('*', authMiddleware);
plaid.use('/link/*', requireAuth, strictRateLimit);
plaid.use('/accounts/*', requireAuth, standardRateLimit);

// POST /plaid/link/token - Create Link token
plaid.post('/link/token',
  requireAuth,
  zValidator('json', z.object({
    isUpdate: z.boolean().optional(),
    accessToken: z.string().optional(),
  }).optional()),
  async (c) => {
    const user = c.get('user')!;
    const body = c.req.valid('json');
    
    try {
      const linkToken = await PlaidService.createLinkToken(
        user.id,
        body?.isUpdate || false,
        body?.accessToken
      );
      
      return c.json({ 
        linkToken: linkToken.link_token,
        expiration: linkToken.expiration,
      });
    } catch (error) {
      console.error('Link token creation error:', error);
      return c.json({ error: 'Failed to create Link token' }, 500);
    }
  }
);

// POST /plaid/link/exchange - Exchange public token
plaid.post('/link/exchange',
  requireAuth,
  zValidator('json', plaidPublicTokenSchema),
  async (c) => {
    const user = c.get('user')!;
    const { publicToken, metadata } = c.req.valid('json');
    
    try {
      const plaidItem = await PlaidService.exchangePublicToken(publicToken, user.id);
      
      // Invalidate cache
      await cache.invalidatePattern(`plaid:${user.id}:*`);
      
      return c.json({
        success: true,
        item: {
          id: plaidItem.id,
          institutionName: plaidItem.institutionName,
        },
      });
    } catch (error) {
      console.error('Public token exchange error:', error);
      return c.json({ error: 'Failed to exchange public token' }, 500);
    }
  }
);

// GET /plaid/accounts - Get connected accounts
plaid.get('/accounts',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    
    // Check cache
    const cacheKey = `plaid:${user.id}:accounts`;
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);
    
    const items = await prisma.plaidItem.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        accounts: {
          where: { isActive: true },
          select: {
            id: true,
            accountId: true,
            name: true,
            officialName: true,
            type: true,
            subtype: true,
            mask: true,
            currentBalance: true,
            availableBalance: true,
            isoCurrencyCode: true,
          },
        },
      },
    });
    
    const response = items.map(item => ({
      id: item.id,
      institutionName: item.institutionName,
      lastSyncedAt: item.lastSyncedAt,
      accounts: item.accounts.map(acc => ({
        ...acc,
        currentBalance: acc.currentBalance ? Number(acc.currentBalance) : null,
        availableBalance: acc.availableBalance ? Number(acc.availableBalance) : null,
      })),
    }));
    
    // Cache for 60 seconds
    await cache.set(cacheKey, response, 60);
    
    return c.json(response);
  }
);

// POST /plaid/accounts/:itemId/sync - Sync accounts for an item
plaid.post('/accounts/:itemId/sync',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    const itemId = c.req.param('itemId');
    
    // Verify ownership
    const plaidItem = await prisma.plaidItem.findFirst({
      where: {
        id: itemId,
        userId: user.id,
      },
    });
    
    if (!plaidItem) {
      return c.json({ error: 'Item not found' }, 404);
    }
    
    try {
      const accounts = await PlaidService.syncAccounts(itemId, plaidItem.accessToken);
      
      // Invalidate cache
      await cache.invalidatePattern(`plaid:${user.id}:*`);
      
      return c.json({
        success: true,
        accountsSynced: accounts.length,
      });
    } catch (error) {
      console.error('Account sync error:', error);
      return c.json({ error: 'Failed to sync accounts' }, 500);
    }
  }
);

// POST /plaid/transactions/sync - Sync transactions
plaid.post('/transactions/sync',
  requireAuth,
  zValidator('json', z.object({
    itemId: z.string().optional(),
  }).optional()),
  async (c) => {
    const user = c.get('user')!;
    const body = c.req.valid('json');
    
    // Get items to sync
    const items = await prisma.plaidItem.findMany({
      where: {
        userId: user.id,
        isActive: true,
        ...(body?.itemId && { id: body.itemId }),
      },
    });
    
    if (items.length === 0) {
      return c.json({ error: 'No items to sync' }, 404);
    }
    
    // Sync transactions for each item
    const results = await Promise.allSettled(
      items.map(item => PlaidService.syncTransactions(item.id, user.id))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    // Invalidate cache
    await cache.invalidatePattern(`transactions:${user.id}:*`);
    await cache.invalidatePattern(`plaid:${user.id}:*`);
    
    return c.json({
      success: true,
      itemsSynced: successful.length,
      itemsFailed: failed.length,
      transactionsSynced: successful.reduce(
        (sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0),
        0
      ),
    });
  }
);

// DELETE /plaid/items/:itemId - Remove Plaid item
plaid.delete('/items/:itemId',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    const itemId = c.req.param('itemId');
    
    // Verify ownership
    const plaidItem = await prisma.plaidItem.findFirst({
      where: {
        id: itemId,
        userId: user.id,
      },
    });
    
    if (!plaidItem) {
      return c.json({ error: 'Item not found' }, 404);
    }
    
    try {
      await PlaidService.removeItem(itemId);
      
      // Invalidate cache
      await cache.invalidatePattern(`plaid:${user.id}:*`);
      await cache.invalidatePattern(`transactions:${user.id}:*`);
      
      return c.json({ success: true });
    } catch (error) {
      console.error('Item removal error:', error);
      return c.json({ error: 'Failed to remove item' }, 500);
    }
  }
);

// POST /plaid/webhook - Plaid webhook endpoint
plaid.post('/webhook',
  zValidator('json', plaidWebhookSchema),
  async (c) => {
    const webhook = c.req.valid('json');
    const signature = c.req.header('plaid-verification') || '';
    
    // Verify webhook signature (implement in production)
    // if (!PlaidService.verifyWebhookSignature(signature, await c.req.text(), env.PLAID_WEBHOOK_SECRET)) {
    //   return c.json({ error: 'Invalid signature' }, 401);
    // }
    
    try {
      switch (webhook.webhook_type) {
        case 'TRANSACTIONS': {
          switch (webhook.webhook_code) {
            case 'SYNC_UPDATES_AVAILABLE': {
              // Find the Plaid item
              const plaidItem = await prisma.plaidItem.findUnique({
                where: { itemId: webhook.item_id },
              });
              
              if (plaidItem) {
                // Sync transactions in background
                PlaidService.syncTransactions(plaidItem.id, plaidItem.userId)
                  .then(() => {
                    // Invalidate cache
                    cache.invalidatePattern(`transactions:${plaidItem.userId}:*`);
                    cache.invalidatePattern(`plaid:${plaidItem.userId}:*`);
                  })
                  .catch(console.error);
              }
              break;
            }
            
            case 'REMOVED': {
              // Handle removed transactions
              if (webhook.removed_transactions?.length) {
                await prisma.transaction.deleteMany({
                  where: {
                    transactionId: { in: webhook.removed_transactions },
                  },
                });
              }
              break;
            }
          }
          break;
        }
        
        case 'ITEM': {
          switch (webhook.webhook_code) {
            case 'ERROR': {
              // Log error for monitoring
              console.error('Plaid item error:', webhook.error);
              
              // Update item status
              await prisma.plaidItem.update({
                where: { itemId: webhook.item_id },
                data: { isActive: false },
              });
              break;
            }
            
            case 'PENDING_EXPIRATION': {
              // Handle consent expiration
              console.warn('Plaid item pending expiration:', webhook.item_id);
              break;
            }
          }
          break;
        }
      }
      
      return c.json({ success: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return c.json({ error: 'Webhook processing failed' }, 500);
    }
  }
);

// GET /plaid/categories - Get Plaid categories for mapping
plaid.get('/categories',
  requireAuth,
  async (c) => {
    // Cache Plaid categories
    const cacheKey = 'plaid:categories';
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);
    
    try {
      const response = await plaidClient.categoriesGet({});
      
      const categories = response.data.categories.map(cat => ({
        categoryId: cat.category_id,
        group: cat.group,
        hierarchy: cat.hierarchy,
      }));
      
      // Cache for 24 hours
      await cache.set(cacheKey, categories, 86400);
      
      return c.json(categories);
    } catch (error) {
      console.error('Categories fetch error:', error);
      return c.json({ error: 'Failed to fetch categories' }, 500);
    }
  }
);

// POST /plaid/items/:itemId/refresh - Force refresh an item
plaid.post('/items/:itemId/refresh',
  requireAuth,
  async (c) => {
    const user = c.get('user')!;
    const itemId = c.req.param('itemId');
    
    // Verify ownership
    const plaidItem = await prisma.plaidItem.findFirst({
      where: {
        id: itemId,
        userId: user.id,
      },
    });
    
    if (!plaidItem) {
      return c.json({ error: 'Item not found' }, 404);
    }
    
    try {
      // Sync accounts
      await PlaidService.syncAccounts(itemId, plaidItem.accessToken);
      
      // Sync transactions
      const transactionCount = await PlaidService.syncTransactions(itemId, user.id);
      
      // Update last synced
      await prisma.plaidItem.update({
        where: { id: itemId },
        data: { lastSyncedAt: new Date() },
      });
      
      // Invalidate cache
      await cache.invalidatePattern(`plaid:${user.id}:*`);
      await cache.invalidatePattern(`transactions:${user.id}:*`);
      
      return c.json({
        success: true,
        transactionsSynced: transactionCount,
      });
    } catch (error) {
      console.error('Item refresh error:', error);
      return c.json({ error: 'Failed to refresh item' }, 500);
    }
  }
);

export default plaid;