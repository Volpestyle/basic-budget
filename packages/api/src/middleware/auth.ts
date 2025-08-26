import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

// Extend Hono context with user
declare module 'hono' {
  interface ContextVariableMap {
    user: User | null;
    userId: string | null;
    isAuthenticated: boolean;
  }
}

// Auth middleware - extracts user from JWT or session
export async function authMiddleware(c: Context, next: Next) {
  let user: User | null = null;
  let userId: string | null = null;
  
  try {
    // Check Authorization header for JWT
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await AuthService.verifyAccessToken(token);
      
      // Fetch user from database
      user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });
      
      if (user) {
        userId = user.id;
      }
    }
    
    // Check session cookie as fallback
    if (!user) {
      const sessionToken = getCookie(c, 'session');
      if (sessionToken) {
        user = await AuthService.validateSession(sessionToken);
        if (user) {
          userId = user.id;
        }
      }
    }
    
    // Check for anonymous user ID (for unauthenticated mode)
    if (!userId) {
      const anonymousId = c.req.header('X-Anonymous-Id');
      if (anonymousId && /^anon_[a-zA-Z0-9_-]{21}$/.test(anonymousId)) {
        userId = anonymousId;
      }
    }
  } catch (error) {
    // Continue without authentication
    console.error('Auth middleware error:', error);
  }
  
  // Set context variables
  c.set('user', user);
  c.set('userId', userId);
  c.set('isAuthenticated', !!user);
  
  await next();
}

// Require authentication middleware
export async function requireAuth(c: Context, next: Next) {
  const user = c.get('user');
  
  if (!user) {
    return c.json(
      { error: 'Authentication required' },
      401
    );
  }
  
  await next();
}

// Require user ID (authenticated or anonymous)
export async function requireUserId(c: Context, next: Next) {
  const userId = c.get('userId');
  
  if (!userId) {
    return c.json(
      { error: 'User ID required. Provide JWT token or X-Anonymous-Id header' },
      401
    );
  }
  
  await next();
}