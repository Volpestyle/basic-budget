import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { env } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import type { Transaction as PlaidTransaction } from 'plaid';

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export class PlaidService {
  // Create Link token for Plaid Link initialization
  static async createLinkToken(userId: string, isUpdate = false, accessToken?: string) {
    const request = {
      client_name: 'Basic Budget',
      country_codes: env.PLAID_COUNTRY_CODES.split(',') as CountryCode[],
      language: 'en',
      user: {
        client_user_id: userId,
      },
      products: env.PLAID_PRODUCTS.split(',') as Products[],
      ...(isUpdate && accessToken ? { access_token: accessToken } : {}),
      ...(env.PLAID_REDIRECT_URI ? { redirect_uri: env.PLAID_REDIRECT_URI } : {}),
    };
    
    const response = await plaidClient.linkTokenCreate(request);
    return response.data;
  }
  
  // Exchange public token for access token
  static async exchangePublicToken(publicToken: string, userId: string) {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    
    const { access_token, item_id } = response.data;
    
    // Get item details
    const itemResponse = await plaidClient.itemGet({ access_token });
    const institution = itemResponse.data.item.institution_id
      ? await this.getInstitution(itemResponse.data.item.institution_id)
      : null;
    
    // Store in database
    const plaidItem = await prisma.plaidItem.create({
      data: {
        userId,
        accessToken: access_token,
        itemId: item_id,
        institutionId: itemResponse.data.item.institution_id || undefined,
        institutionName: institution?.name,
        consentExpirationTime: itemResponse.data.item.consent_expiration_time
          ? new Date(itemResponse.data.item.consent_expiration_time)
          : undefined,
      },
    });
    
    // Sync accounts
    await this.syncAccounts(plaidItem.id, access_token);
    
    // Initial transaction sync
    await this.syncTransactions(plaidItem.id, userId);
    
    return plaidItem;
  }
  
  // Sync accounts for a Plaid item
  static async syncAccounts(plaidItemId: string, accessToken: string) {
    const response = await plaidClient.accountsGet({ access_token: accessToken });
    
    // Batch upsert accounts
    const accountPromises = response.data.accounts.map(account =>
      prisma.plaidAccount.upsert({
        where: { accountId: account.account_id },
        create: {
          plaidItemId,
          accountId: account.account_id,
          name: account.name,
          officialName: account.official_name,
          type: account.type,
          subtype: account.subtype || undefined,
          mask: account.mask || undefined,
          currentBalance: account.balances.current || undefined,
          availableBalance: account.balances.available || undefined,
          isoCurrencyCode: account.balances.iso_currency_code || undefined,
        },
        update: {
          name: account.name,
          officialName: account.official_name,
          currentBalance: account.balances.current || undefined,
          availableBalance: account.balances.available || undefined,
        },
      })
    );
    
    await Promise.all(accountPromises);
    
    // Invalidate cache
    await cache.invalidatePattern(`accounts:${plaidItemId}:*`);
    
    return response.data.accounts;
  }
  
  // Sync transactions using cursor-based pagination
  static async syncTransactions(plaidItemId: string, userId: string) {
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { id: plaidItemId },
      include: { accounts: true },
    });
    
    if (!plaidItem) throw new Error('Plaid item not found');
    
    let hasMore = true;
    let cursor = plaidItem.cursor;
    const allTransactions: PlaidTransaction[] = [];
    
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: plaidItem.accessToken,
        cursor: cursor || undefined,
        count: 500, // Max allowed
      });
      
      allTransactions.push(...response.data.added);
      
      // Handle removed transactions
      if (response.data.removed.length > 0) {
        await prisma.transaction.deleteMany({
          where: {
            transactionId: { in: response.data.removed.map(t => t.transaction_id) },
          },
        });
      }
      
      // Handle modified transactions
      if (response.data.modified.length > 0) {
        allTransactions.push(...response.data.modified);
      }
      
      hasMore = response.data.has_more;
      cursor = response.data.next_cursor;
    }
    
    // Batch upsert transactions
    if (allTransactions.length > 0) {
      const accountMap = new Map(
        plaidItem.accounts.map(acc => [acc.accountId, acc.id])
      );
      
      const transactionPromises = allTransactions.map(transaction =>
        prisma.transaction.upsert({
          where: { transactionId: transaction.transaction_id },
          create: {
            userId,
            plaidAccountId: accountMap.get(transaction.account_id),
            transactionId: transaction.transaction_id,
            amount: Math.abs(transaction.amount), // Plaid uses negative for debits
            description: transaction.name,
            merchantName: transaction.merchant_name || undefined,
            date: new Date(transaction.date),
            pending: transaction.pending,
            category: transaction.category?.[0],
            subcategory: transaction.category?.[1],
            isoCurrencyCode: transaction.iso_currency_code || 'USD',
            accountOwner: transaction.account_owner || undefined,
          },
          update: {
            amount: Math.abs(transaction.amount),
            description: transaction.name,
            merchantName: transaction.merchant_name || undefined,
            pending: transaction.pending,
            category: transaction.category?.[0],
            subcategory: transaction.category?.[1],
          },
        })
      );
      
      await Promise.all(transactionPromises);
    }
    
    // Update cursor
    await prisma.plaidItem.update({
      where: { id: plaidItemId },
      data: {
        cursor,
        lastSyncedAt: new Date(),
      },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`transactions:${userId}:*`);
    
    return allTransactions.length;
  }
  
  // Get institution details
  static async getInstitution(institutionId: string) {
    try {
      // Check cache first
      const cacheKey = `institution:${institutionId}`;
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
      
      const response = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: env.PLAID_COUNTRY_CODES.split(',') as CountryCode[],
      });
      
      const institution = response.data.institution;
      
      // Cache for 24 hours
      await cache.set(cacheKey, institution, 86400);
      
      return institution;
    } catch (error) {
      console.error('Failed to get institution:', error);
      return null;
    }
  }
  
  // Remove Plaid item
  static async removeItem(plaidItemId: string) {
    const plaidItem = await prisma.plaidItem.findUnique({
      where: { id: plaidItemId },
    });
    
    if (!plaidItem) throw new Error('Plaid item not found');
    
    // Remove from Plaid
    try {
      await plaidClient.itemRemove({
        access_token: plaidItem.accessToken,
      });
    } catch (error) {
      console.error('Failed to remove item from Plaid:', error);
    }
    
    // Remove from database (cascade will handle accounts and transactions)
    await prisma.plaidItem.delete({
      where: { id: plaidItemId },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`plaid:${plaidItem.userId}:*`);
  }
  
  // Webhook signature verification
  static verifyWebhookSignature(
    signatureHeader: string,
    body: string,
    secret: string
  ): boolean {
    // Implement Plaid webhook verification
    // This would involve JWT verification with the webhook secret
    // For now, returning true for development
    return true;
  }
}