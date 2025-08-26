import { createClient, RedisClientType } from 'redis';
import { env } from '@/config/env';

class CacheManager {
  private client: RedisClientType | null = null;
  private connected = false;
  
  async connect(): Promise<void> {
    if (!env.REDIS_URL || this.connected) return;
    
    try {
      this.client = createClient({
        url: env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) return false;
            return Math.min(retries * 100, 3000);
          },
        },
      });
      
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.connected = false;
      });
      
      await this.client.connect();
      this.connected = true;
      console.log('Redis cache connected');
    } catch (error) {
      console.warn('Redis connection failed, continuing without cache:', error);
      this.client = null;
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.connected) return null;
    
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set(key: string, value: unknown, ttl = 300): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  async del(key: string | string[]): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

export const cache = new CacheManager();

// Initialize cache connection
cache.connect().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  await cache.disconnect();
});

process.on('SIGTERM', async () => {
  await cache.disconnect();
});