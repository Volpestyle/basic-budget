import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { JWT, type TokenPayload } from '../lib/jwt';
import { db, users, sessions } from '../db';
import { eq, and, gt } from 'drizzle-orm';
import { Cache } from '../lib/redis';

// Extend context with user info
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: string;
      email?: string;
      name?: string;
      provider?: string;
      isAnonymous: boolean;
    };
    token: string;
  }
}

// Cache user data for performance
const USER_CACHE_TTL = 300; // 5 minutes

// Auth middleware - requires valid JWT
export const auth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Verify token
    const payload = await JWT.verifyToken<TokenPayload>(token);
    
    // Check user cache first
    const cacheKey = `user:${payload.sub}`;
    let user = await Cache.get<typeof users.$inferSelect>(cacheKey);
    
    if (!user) {
      // Fetch user from database
      const result = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, payload.sub),
            eq(users.status, 'active')
          )
        )
        .limit(1);
      
      user = result[0];
      
      if (!user) {
        throw new HTTPException(401, { message: 'User not found or inactive' });
      }
      
      // Cache user data
      await Cache.set(cacheKey, user, USER_CACHE_TTL);
    }
    
    // Set user context
    c.set('user', {
      id: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      provider: user.provider,
      isAnonymous: user.isAnonymous,
    });
    c.set('token', token);
    
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
});

// Optional auth middleware - doesn't require JWT but parses if present
export const optionalAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    await next();
    return;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = await JWT.verifyToken<TokenPayload>(token);
    
    // Check user cache
    const cacheKey = `user:${payload.sub}`;
    let user = await Cache.get<typeof users.$inferSelect>(cacheKey);
    
    if (!user) {
      const result = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, payload.sub),
            eq(users.status, 'active')
          )
        )
        .limit(1);
      
      user = result[0];
      
      if (user) {
        await Cache.set(cacheKey, user, USER_CACHE_TTL);
      }
    }
    
    if (user) {
      c.set('user', {
        id: user.id,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        provider: user.provider,
        isAnonymous: user.isAnonymous,
      });
      c.set('token', token);
    }
  } catch {
    // Ignore errors in optional auth
  }
  
  await next();
});

// Session validation middleware
export const validateSession = createMiddleware(async (c, next) => {
  const user = c.get('user');
  
  if (!user) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }
  
  // For non-anonymous users, validate refresh token exists
  if (!user.isAnonymous) {
    const refreshToken = c.req.header('X-Refresh-Token');
    
    if (refreshToken) {
      // Check if refresh token is valid
      const cacheKey = `session:${refreshToken}`;
      let sessionValid = await Cache.exists(cacheKey);
      
      if (!sessionValid) {
        const session = await db
          .select()
          .from(sessions)
          .where(
            and(
              eq(sessions.refreshToken, refreshToken),
              eq(sessions.userId, user.id),
              gt(sessions.expiresAt, new Date())
            )
          )
          .limit(1);
        
        sessionValid = session.length > 0;
        
        if (sessionValid) {
          // Cache session validation
          await Cache.set(cacheKey, true, 60); // 1 minute cache
        }
      }
      
      if (!sessionValid) {
        throw new HTTPException(401, { message: 'Invalid or expired session' });
      }
    }
  }
  
  await next();
});

// Rate limiting middleware using sliding window
export const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    const identifier = user?.id ?? c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    
    const key = `rate:${identifier}`;
    const requests = await Cache.increment(key, Math.floor(windowMs / 1000));
    
    if (requests > maxRequests) {
      const ttl = await Cache.ttl(key);
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());
      
      throw new HTTPException(429, { 
        message: `Too many requests. Please try again in ${ttl} seconds.` 
      });
    }
    
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - requests).toString());
    
    await next();
  });
};