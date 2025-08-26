import { Context, Next } from 'hono';
import { cache } from '@/lib/cache';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (c: Context) => string;
}

// Sliding window rate limiter
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests',
    keyGenerator = (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
  } = options;
  
  return async (c: Context, next: Next) => {
    const key = `ratelimit:${keyGenerator(c)}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get current window data
    const windowData = await cache.get<number[]>(key) || [];
    
    // Filter out expired entries
    const validRequests = windowData.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= max) {
      const retryAfter = Math.ceil((validRequests[0] + windowMs - now) / 1000);
      
      c.header('X-RateLimit-Limit', max.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', new Date(validRequests[0] + windowMs).toISOString());
      c.header('Retry-After', retryAfter.toString());
      
      return c.json({ error: message }, 429);
    }
    
    // Add current request
    validRequests.push(now);
    
    // Update cache
    await cache.set(key, validRequests, Math.ceil(windowMs / 1000));
    
    // Set rate limit headers
    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', (max - validRequests.length).toString());
    c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    
    await next();
  };
}

// Preset rate limiters
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
});

export const standardRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
});

export const relaxedRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
});