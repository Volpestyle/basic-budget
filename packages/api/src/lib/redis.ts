import Redis from 'ioredis';
import { config } from '../config';

// Create Redis client with connection pooling and optimizations
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  keepAlive: 10000,
  connectTimeout: 10000,
  // Performance optimizations
  enableOfflineQueue: false, // Don't queue commands when offline
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Cache helper with automatic serialization
export class Cache {
  private static readonly DEFAULT_TTL = 300; // 5 minutes
  
  static async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as T;
    }
  }
  
  static async set<T>(
    key: string, 
    value: T, 
    ttl: number = Cache.DEFAULT_TTL
  ): Promise<void> {
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    await redis.setex(key, ttl, data);
  }
  
  static async delete(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      if (key.length > 0) {
        await redis.del(...key);
      }
    } else {
      await redis.del(key);
    }
  }
  
  static async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  }
  
  // Atomic increment for rate limiting
  static async increment(
    key: string, 
    ttl?: number
  ): Promise<number> {
    const multi = redis.multi();
    multi.incr(key);
    if (ttl) {
      multi.expire(key, ttl);
    }
    const results = await multi.exec();
    return results?.[0]?.[1] as number ?? 1;
  }
  
  // Get remaining TTL
  static async ttl(key: string): Promise<number> {
    return redis.ttl(key);
  }
  
  // Pattern-based key deletion
  static async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Graceful shutdown
process.on('beforeExit', () => {
  redis.disconnect();
});