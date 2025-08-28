import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { GoogleAuthService } from '../services/google-auth';
import { JWT } from '../lib/jwt';
import { db, users, sessions } from '../db';
import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { Cache } from '../lib/redis';
import { HTTPException } from 'hono/http-exception';
import { auth } from '../middleware/auth';

const authRouter = new Hono();

// Google OAuth login
authRouter.get('/google', (c) => {
  const state = c.req.query('state');
  const redirectUrl = GoogleAuthService.getAuthUrl(state);
  return c.redirect(redirectUrl);
});

// Google OAuth callback
authRouter.get('/google/callback', 
  zValidator('query', z.object({
    code: z.string(),
    state: z.string().optional(),
  })),
  async (c) => {
    const { code } = c.req.valid('query');
    
    try {
      // Exchange code for user info
      const googleUser = await GoogleAuthService.exchangeCode(code);
      
      // Find or create user
      const user = await GoogleAuthService.findOrCreateUser(googleUser);
      
      // Generate tokens
      const tokens = await GoogleAuthService.generateTokens(user);
      
      // Return tokens (in production, redirect with tokens or set cookies)
      return c.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        ...tokens,
      });
    } catch (error) {
      throw new HTTPException(400, { 
        message: 'Failed to authenticate with Google' 
      });
    }
  }
);

// Direct Google ID token login (for mobile/web clients)
authRouter.post('/google/verify',
  zValidator('json', z.object({
    idToken: z.string(),
  })),
  async (c) => {
    const { idToken } = c.req.valid('json');
    
    try {
      // Verify ID token
      const googleUser = await GoogleAuthService.verifyIdToken(idToken);
      
      // Find or create user
      const user = await GoogleAuthService.findOrCreateUser(googleUser);
      
      // Generate tokens
      const tokens = await GoogleAuthService.generateTokens(user);
      
      return c.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        ...tokens,
      });
    } catch (error) {
      throw new HTTPException(400, { 
        message: 'Invalid Google ID token' 
      });
    }
  }
);

// Anonymous login
authRouter.post('/anonymous', async (c) => {
  const sessionId = nanoid(32);
  
  // Create anonymous user
  const [user] = await db
    .insert(users)
    .values({
      provider: 'anonymous',
      isAnonymous: true,
      anonymousSessionId: sessionId,
      status: 'active',
      lastLoginAt: new Date(),
    })
    .returning();
  
  if (!user) {
    throw new HTTPException(500, { message: 'Failed to create anonymous user' });
  }
  
  // Generate tokens
  const tokens = await JWT.generateTokenPair(
    {
      sub: user.id,
      provider: 'anonymous',
      isAnonymous: true,
      sessionId,
    },
    sessionId
  );
  
  // Create session
  await db.insert(sessions).values({
    userId: user.id,
    refreshToken: tokens.refreshToken,
    userAgent: c.req.header('user-agent'),
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    expiresAt: new Date(Date.now() + tokens.refreshExpiresIn * 1000),
  });
  
  return c.json({
    user: {
      id: user.id,
      isAnonymous: true,
    },
    ...tokens,
  });
});

// Refresh token
authRouter.post('/refresh',
  zValidator('json', z.object({
    refreshToken: z.string(),
  })),
  async (c) => {
    const { refreshToken } = c.req.valid('json');
    
    try {
      // Verify refresh token
      const payload = await JWT.verifyToken<{ sub: string; sessionId: string }>(refreshToken);
      
      // Check session in database
      const [session] = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.refreshToken, refreshToken),
            eq(sessions.userId, payload.sub),
            gt(sessions.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!session) {
        throw new HTTPException(401, { message: 'Invalid refresh token' });
      }
      
      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      
      if (!user || user.status !== 'active') {
        throw new HTTPException(401, { message: 'User not found or inactive' });
      }
      
      // Generate new access token
      const accessToken = await JWT.generateAccessToken({
        sub: user.id,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        provider: user.provider,
        isAnonymous: user.isAnonymous,
        sessionId: payload.sessionId,
      });
      
      // Update session activity
      await db
        .update(sessions)
        .set({ updatedAt: new Date() })
        .where(eq(sessions.id, session.id));
      
      return c.json({
        accessToken,
        refreshToken, // Return same refresh token
        expiresIn: 7 * 24 * 60 * 60, // 7 days
      });
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(401, { message: 'Invalid refresh token' });
    }
  }
);

// Logout
authRouter.post('/logout', auth, async (c) => {
  const user = c.get('user');
  const refreshToken = c.req.header('X-Refresh-Token');
  
  // Delete session
  if (refreshToken) {
    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.refreshToken, refreshToken),
          eq(sessions.userId, user.id)
        )
      );
  }
  
  // Clear cache
  await Cache.delete(`user:${user.id}`);
  
  return c.json({ message: 'Logged out successfully' });
});

// Logout all sessions
authRouter.post('/logout-all', auth, async (c) => {
  const user = c.get('user');
  
  // Delete all sessions for user
  await db
    .delete(sessions)
    .where(eq(sessions.userId, user.id));
  
  // Clear cache
  await Cache.delete(`user:${user.id}`);
  
  return c.json({ message: 'All sessions logged out successfully' });
});

// Get current user
authRouter.get('/me', auth, async (c) => {
  const user = c.get('user');
  
  // Get full user data
  const [fullUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  
  if (!fullUser) {
    throw new HTTPException(404, { message: 'User not found' });
  }
  
  return c.json({
    id: fullUser.id,
    email: fullUser.email,
    name: fullUser.name,
    avatarUrl: fullUser.avatarUrl,
    provider: fullUser.provider,
    isAnonymous: fullUser.isAnonymous,
    createdAt: fullUser.createdAt,
    lastLoginAt: fullUser.lastLoginAt,
  });
});

export { authRouter };