import { 
  Configuration, 
  PlaidApi, 
  PlaidEnvironments,
  Products,
  CountryCode,
  type TransactionsGetRequest,
  type AccountsGetRequest,
  type ItemGetRequest,
} from 'plaid';
import { config } from '../config';
import { db, plaidConnections, plaidAccounts, transactions } from '../db';
import { eq, and, inArray } from 'drizzle-orm';
import { Cache } from '../lib/redis';
import crypto from 'crypto';

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[config.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': config.PLAID_CLIENT_ID,
      'PLAID-SECRET': config.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export class PlaidService {
  // Create Link token for Plaid Link flow
  static async createLinkToken(userId: string, redirectUri?: string) {
    const cacheKey = `plaid:link:${userId}`;
    const cached = await Cache.get<{ link_token: string; expiration: string }>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Basic Budget',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      redirect_uri: redirectUri,
      webhook: config.PLAID_WEBHOOK_URL,
    };
    
    const response = await plaidClient.linkTokenCreate(request);
    
    // Cache for 25 minutes (link tokens expire in 30)
    await Cache.set(cacheKey, response.data, 1500);
    
    return response.data;
  }
  
  // Exchange public token for access token
  static async exchangePublicToken(publicToken: string, userId: string) {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    
    const { access_token: accessToken, item_id: itemId } = response.data;
    
    // Get item metadata
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    } as ItemGetRequest);
    
    const item = itemResponse.data.item;
    
    // Get institution info
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: item.institution_id!,
      country_codes: [CountryCode.Us],
    });
    
    const institution = institutionResponse.data.institution;
    
    // Store connection
    const [connection] = await db
      .insert(plaidConnections)
      .values({
        userId,
        itemId,
        accessToken, // In production, encrypt this
        institutionId: institution.institution_id,
        institutionName: institution.name,
        metadata: {
          products: item.products,
          webhook: item.webhook,
        },
      })
      .returning();
    
    // Fetch and store accounts
    await this.syncAccounts(connection!.id, accessToken);
    
    // Initial transaction sync
    await this.syncTransactions(connection!.id, userId);
    
    return connection;
  }
  
  // Sync accounts for a connection
  static async syncAccounts(connectionId: string, accessToken: string) {
    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    } as AccountsGetRequest);
    
    const accountsData = response.data.accounts;
    
    // Upsert accounts
    for (const account of accountsData) {
      await db
        .insert(plaidAccounts)
        .values({
          connectionId,
          accountId: account.account_id,
          name: account.name,
          officialName: account.official_name ?? undefined,
          type: account.type,
          subtype: account.subtype ?? undefined,
          mask: account.mask ?? undefined,
          currentBalance: account.balances.current?.toString(),
          availableBalance: account.balances.available?.toString(),
          currency: account.balances.iso_currency_code ?? 'USD',
        })
        .onConflictDoUpdate({
          target: plaidAccounts.accountId,
          set: {
            name: account.name,
            officialName: account.official_name ?? undefined,
            currentBalance: account.balances.current?.toString(),
            availableBalance: account.balances.available?.toString(),
            updatedAt: new Date(),
          },
        });
    }
    
    return accountsData;
  }
  
  // Sync transactions for a connection
  static async syncTransactions(connectionId: string, userId: string) {
    // Get connection
    const [connection] = await db
      .select()
      .from(plaidConnections)
      .where(eq(plaidConnections.id, connectionId))
      .limit(1);
    
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    // Get accounts for this connection
    const accounts = await db
      .select()
      .from(plaidAccounts)
      .where(eq(plaidAccounts.connectionId, connectionId));
    
    const accountMap = new Map(accounts.map(a => [a.accountId, a.id]));
    
    let cursor = connection.cursor;
    let hasMore = true;
    let added: string[] = [];
    let modified: string[] = [];
    let removed: string[] = [];
    
    while (hasMore) {
      const request: TransactionsGetRequest = {
        access_token: connection.accessToken,
      } as TransactionsGetRequest;
      
      if (cursor) {
        request.cursor = cursor;
      } else {
        // Initial sync - get last 30 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        request.start_date = startDate.toISOString().split('T')[0]!;
        request.end_date = new Date().toISOString().split('T')[0]!;
      }
      
      const response = await plaidClient.transactionsSync(request);
      
      added = [...added, ...response.data.added];
      modified = [...modified, ...response.data.modified];
      removed = [...removed, ...response.data.removed.map(r => r.transaction_id)];
      
      hasMore = response.data.has_more;
      cursor = response.data.next_cursor;
    }
    
    // Process added transactions
    if (added.length > 0) {
      const transactionsToInsert = added
        .filter(t => accountMap.has(t.account_id))
        .map(t => ({
          userId,
          plaidAccountId: accountMap.get(t.account_id)!,
          plaidTransactionId: t.transaction_id,
          amount: Math.abs(t.amount).toString(),
          type: t.amount < 0 ? 'income' : 'expense',
          description: t.name,
          merchantName: t.merchant_name ?? undefined,
          date: new Date(t.date),
          pending: t.pending,
          metadata: {
            category: t.category,
            location: t.location,
            paymentMeta: t.payment_meta,
          },
        }));
      
      if (transactionsToInsert.length > 0) {
        await db
          .insert(transactions)
          .values(transactionsToInsert as any)
          .onConflictDoNothing();
      }
    }
    
    // Process modified transactions
    if (modified.length > 0) {
      for (const t of modified) {
        if (!accountMap.has(t.account_id)) continue;
        
        await db
          .update(transactions)
          .set({
            amount: Math.abs(t.amount).toString(),
            type: t.amount < 0 ? 'income' : 'expense',
            description: t.name,
            merchantName: t.merchant_name ?? undefined,
            date: new Date(t.date),
            pending: t.pending,
            metadata: {
              category: t.category,
              location: t.location,
              paymentMeta: t.payment_meta,
            },
            updatedAt: new Date(),
          })
          .where(eq(transactions.plaidTransactionId, t.transaction_id));
      }
    }
    
    // Process removed transactions
    if (removed.length > 0) {
      await db
        .delete(transactions)
        .where(inArray(transactions.plaidTransactionId, removed));
    }
    
    // Update cursor
    await db
      .update(plaidConnections)
      .set({
        cursor,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plaidConnections.id, connectionId));
    
    // Clear transaction cache for user
    await Cache.deletePattern(`transactions:${userId}:*`);
    
    return {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
    };
  }
  
  // Verify webhook
  static verifyWebhook(body: string, headers: Record<string, string>): boolean {
    const signedJwt = headers['plaid-verification'] || headers['Plaid-Verification'];
    
    if (!signedJwt) {
      return false;
    }
    
    // In production, verify the JWT signature
    // For now, just check if it exists
    return true;
  }
  
  // Remove connection
  static async removeConnection(connectionId: string) {
    const [connection] = await db
      .select()
      .from(plaidConnections)
      .where(eq(plaidConnections.id, connectionId))
      .limit(1);
    
    if (!connection) {
      throw new Error('Connection not found');
    }
    
    // Remove from Plaid
    try {
      await plaidClient.itemRemove({
        access_token: connection.accessToken,
      });
    } catch (error) {
      console.error('Failed to remove item from Plaid:', error);
    }
    
    // Soft delete connection
    await db
      .update(plaidConnections)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(plaidConnections.id, connectionId));
    
    // Clear caches
    await Cache.deletePattern(`plaid:*:${connection.userId}`);
  }
}