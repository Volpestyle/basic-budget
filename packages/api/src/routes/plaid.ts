import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { auth } from '../middleware/auth';
import { PlaidService } from '../services/plaid';
import { db, plaidConnections, webhookLogs } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { Cache } from '../lib/redis';

const plaidRouter = new Hono();

// Public webhook endpoint (no auth)
plaidRouter.post('/webhook', async (c) => {
  const body = await c.req.text();
  const headers = c.req.header();
  
  // Verify webhook signature
  if (!PlaidService.verifyWebhook(body, headers)) {
    throw new HTTPException(401, { message: 'Invalid webhook signature' });
  }
  
  const webhook = JSON.parse(body);
  
  // Log webhook
  await db.insert(webhookLogs).values({
    source: 'plaid',
    webhookType: webhook.webhook_type,
    webhookCode: webhook.webhook_code,
    itemId: webhook.item_id,
    payload: webhook,
  });
  
  // Process webhook based on type
  switch (webhook.webhook_type) {
    case 'TRANSACTIONS':
      await handleTransactionWebhook(webhook);
      break;
    case 'ITEM':
      await handleItemWebhook(webhook);
      break;
    case 'ASSETS':
      // Handle assets webhooks
      break;
    default:
      console.log('Unhandled webhook type:', webhook.webhook_type);
  }
  
  return c.json({ received: true });
});

// Protected routes
plaidRouter.use('*', auth);

// Create link token
plaidRouter.post('/link-token', async (c) => {
  const user = c.get('user');
  const redirectUri = c.req.query('redirect_uri');
  
  const linkToken = await PlaidService.createLinkToken(user.id, redirectUri);
  
  return c.json(linkToken);
});

// Exchange public token
plaidRouter.post('/exchange-token',
  zValidator('json', z.object({
    publicToken: z.string(),
  })),
  async (c) => {
    const user = c.get('user');
    const { publicToken } = c.req.valid('json');
    
    try {
      const connection = await PlaidService.exchangePublicToken(publicToken, user.id);
      
      return c.json({
        message: 'Account linked successfully',
        connectionId: connection?.id,
      });
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new HTTPException(400, { 
        message: 'Failed to link account. Please try again.' 
      });
    }
  }
);

// List connected accounts
plaidRouter.get('/connections', async (c) => {
  const user = c.get('user');
  
  // Check cache
  const cacheKey = `plaid:connections:${user.id}`;
  const cached = await Cache.get<any>(cacheKey);
  
  if (cached) {
    c.header('X-Cache', 'HIT');
    return c.json(cached);
  }
  
  const connections = await db
    .select()
    .from(plaidConnections)
    .where(
      and(
        eq(plaidConnections.userId, user.id),
        eq(plaidConnections.isActive, true)
      )
    );
  
  // Don't expose access tokens
  const sanitized = connections.map(c => ({
    id: c.id,
    institutionId: c.institutionId,
    institutionName: c.institutionName,
    lastSyncedAt: c.lastSyncedAt,
    createdAt: c.createdAt,
  }));
  
  // Cache for 5 minutes
  await Cache.set(cacheKey, sanitized, 300);
  
  c.header('X-Cache', 'MISS');
  return c.json(sanitized);
});

// Sync transactions for a connection
plaidRouter.post('/connections/:id/sync', async (c) => {
  const user = c.get('user');
  const connectionId = c.req.param('id');
  
  // Check ownership
  const [connection] = await db
    .select()
    .from(plaidConnections)
    .where(
      and(
        eq(plaidConnections.id, connectionId),
        eq(plaidConnections.userId, user.id),
        eq(plaidConnections.isActive, true)
      )
    )
    .limit(1);
  
  if (!connection) {
    throw new HTTPException(404, { message: 'Connection not found' });
  }
  
  try {
    const result = await PlaidService.syncTransactions(connectionId, user.id);
    
    return c.json({
      message: 'Transactions synced successfully',
      ...result,
    });
  } catch (error) {
    console.error('Sync error:', error);
    throw new HTTPException(500, { 
      message: 'Failed to sync transactions' 
      });
  }
});

// Remove connection
plaidRouter.delete('/connections/:id', async (c) => {
  const user = c.get('user');
  const connectionId = c.req.param('id');
  
  // Check ownership
  const [connection] = await db
    .select()
    .from(plaidConnections)
    .where(
      and(
        eq(plaidConnections.id, connectionId),
        eq(plaidConnections.userId, user.id)
      )
    )
    .limit(1);
  
  if (!connection) {
    throw new HTTPException(404, { message: 'Connection not found' });
  }
  
  await PlaidService.removeConnection(connectionId);
  
  // Clear cache
  await Cache.delete(`plaid:connections:${user.id}`);
  
  return c.json({ message: 'Connection removed successfully' });
});

// Webhook handlers
async function handleTransactionWebhook(webhook: any) {
  const { item_id, webhook_code } = webhook;
  
  // Get connection by item ID
  const [connection] = await db
    .select()
    .from(plaidConnections)
    .where(eq(plaidConnections.itemId, item_id))
    .limit(1);
  
  if (!connection) {
    console.error('Connection not found for item:', item_id);
    return;
  }
  
  switch (webhook_code) {
    case 'SYNC_UPDATES_AVAILABLE':
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
    case 'DEFAULT_UPDATE':
      // Sync transactions
      try {
        await PlaidService.syncTransactions(connection.id, connection.userId);
      } catch (error) {
        console.error('Failed to sync transactions:', error);
      }
      break;
    
    case 'TRANSACTIONS_REMOVED':
      // Handle removed transactions
      console.log('Transactions removed for item:', item_id);
      break;
  }
  
  // Mark webhook as processed
  await db
    .update(webhookLogs)
    .set({
      processed: true,
      processedAt: new Date(),
    })
    .where(
      and(
        eq(webhookLogs.itemId, item_id),
        eq(webhookLogs.webhookCode, webhook_code)
      )
    );
}

async function handleItemWebhook(webhook: any) {
  const { item_id, webhook_code } = webhook;
  
  switch (webhook_code) {
    case 'ERROR':
      console.error('Item error for:', item_id, webhook.error);
      // Update connection status
      await db
        .update(plaidConnections)
        .set({
          metadata: sql`jsonb_set(metadata, '{error}', ${JSON.stringify(webhook.error)}::jsonb)`,
          updatedAt: new Date(),
        })
        .where(eq(plaidConnections.itemId, item_id));
      break;
    
    case 'PENDING_EXPIRATION':
      console.warn('Item pending expiration:', item_id);
      // Notify user to re-authenticate
      break;
    
    case 'USER_PERMISSION_REVOKED':
      console.log('User permission revoked for:', item_id);
      // Deactivate connection
      await db
        .update(plaidConnections)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(plaidConnections.itemId, item_id));
      break;
  }
}

export { plaidRouter };