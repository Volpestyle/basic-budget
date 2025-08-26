import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { AuthService, GoogleOAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import { nanoid } from 'nanoid';
import { strictRateLimit } from '@/middleware/rateLimit';
import { authMiddleware } from '@/middleware/auth';
import { googleAuthCallbackSchema, refreshTokenSchema } from '@/validators';

const auth = new Hono();

// Apply rate limiting to all auth routes
auth.use('*', strictRateLimit);

// GET /auth/google - Initiate Google OAuth flow
auth.get('/google', async (c) => {
  const state = nanoid(32);
  
  // Store state in cache for CSRF protection (5 minutes TTL)
  await cache.set(`oauth:state:${state}`, true, 300);
  
  const authUrl = GoogleOAuth.getAuthUrl(state);
  
  return c.json({ authUrl, state });
});

// GET /auth/google/callback - Google OAuth callback
auth.get('/google/callback', 
  zValidator('query', googleAuthCallbackSchema),
  async (c) => {
    const { code, state } = c.req.valid('query');
    
    // Verify state for CSRF protection
    const validState = await cache.get(`oauth:state:${state}`);
    if (!validState) {
      return c.json({ error: 'Invalid state parameter' }, 400);
    }
    
    // Clean up state
    await cache.del(`oauth:state:${state}`);
    
    try {
      // Exchange code for tokens
      const { access_token, refresh_token } = await GoogleOAuth.exchangeCode(code);
      
      // Get user info
      const googleUser = await GoogleOAuth.getUserInfo(access_token);
      
      // Create or update user
      const user = await prisma.user.upsert({
        where: { googleId: googleUser.id },
        create: {
          email: googleUser.email,
          googleId: googleUser.id,
          name: googleUser.name,
          picture: googleUser.picture,
          refreshToken: refresh_token,
        },
        update: {
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          refreshToken: refresh_token || undefined,
        },
      });
      
      // Generate tokens
      const [accessToken, refreshToken, sessionToken] = await Promise.all([
        AuthService.generateAccessToken(user),
        AuthService.generateRefreshToken(user.id),
        AuthService.createSession(user.id),
      ]);
      
      // Set secure session cookie
      setCookie(c, 'session', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
      
      // Invalidate user cache
      await cache.invalidatePattern(`user:${user.id}:*`);
      
      return c.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Google OAuth error:', error);
      return c.json({ error: 'Authentication failed' }, 500);
    }
  }
);

// POST /auth/refresh - Refresh access token
auth.post('/refresh',
  zValidator('json', refreshTokenSchema),
  async (c) => {
    const { refreshToken } = c.req.valid('json');
    
    try {
      const payload = await AuthService.verifyRefreshToken(refreshToken);
      
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });
      
      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }
      
      const accessToken = await AuthService.generateAccessToken(user);
      
      return c.json({ accessToken });
    } catch (error) {
      return c.json({ error: 'Invalid refresh token' }, 401);
    }
  }
);

// POST /auth/logout - Logout user
auth.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');
  const sessionCookie = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
  
  // Revoke session
  if (sessionCookie) {
    await AuthService.revokeSession(sessionCookie);
  }
  
  // Blacklist current access token
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    await AuthService.blacklistToken(token);
  }
  
  // Clear session cookie
  deleteCookie(c, 'session');
  
  // Clear user cache
  if (user) {
    await cache.invalidatePattern(`user:${user.id}:*`);
  }
  
  return c.json({ success: true });
});

// GET /auth/me - Get current user
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });
});

// DELETE /auth/account - Delete user account
auth.delete('/account', authMiddleware, async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401);
  }
  
  try {
    // Delete user and all associated data (cascade)
    await prisma.user.delete({
      where: { id: user.id },
    });
    
    // Clear all caches
    await cache.invalidatePattern(`*:${user.id}:*`);
    
    // Clear session cookie
    deleteCookie(c, 'session');
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

export default auth;