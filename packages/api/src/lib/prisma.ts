import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

// Singleton pattern for Prisma client with connection pooling
class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;
  
  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        datasources: {
          db: {
            url: env.DATABASE_URL,
          },
        },
      });
      
      // Optimize connection pool for production
      if (env.NODE_ENV === 'production') {
        // @ts-ignore - Prisma internal optimization
        this.instance.$connect();
      }
    }
    return this.instance;
  }
  
  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
    }
  }
}

export const prisma = PrismaClientSingleton.getInstance();

// Graceful shutdown
process.on('SIGINT', async () => {
  await PrismaClientSingleton.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await PrismaClientSingleton.disconnect();
  process.exit(0);
});