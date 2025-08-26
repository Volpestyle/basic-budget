import { sign, verify, decode } from 'hono/jwt';
import { env } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import { nanoid } from 'nanoid';
import type { User } from '@prisma/client';

export interface JWTPayload {
  sub: string; // user id
  email: string;
  name?: string;
  picture?: string;
  iat: number;
  exp: number;
  jti?: string; // JWT ID for revocation
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

const ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days
const SESSION_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days

export class AuthService {
  // Generate access token
  static async generateAccessToken(user: User): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      name: user.name || undefined,
      picture: user.picture || undefined,
      iat: now,
      exp: now + ACCESS_TOKEN_EXPIRES_IN,
      jti: nanoid(),
    };
    
    return await sign(payload, env.JWT_SECRET);
  }
  
  // Generate refresh token
  static async generateRefreshToken(userId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: RefreshTokenPayload = {
      sub: userId,
      jti: nanoid(),
      iat: now,
      exp: now + REFRESH_TOKEN_EXPIRES_IN,
    };
    
    return await sign(payload, env.JWT_REFRESH_SECRET);
  }
  
  // Verify access token
  static async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      // Check token blacklist in cache first
      const isBlacklisted = await cache.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }
      
      const payload = await verify(token, env.JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  // Verify refresh token
  static async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
  
  // Create session
  static async createSession(userId: string): Promise<string> {
    const sessionToken = nanoid(32);
    const expiresAt = new Date(Date.now() + SESSION_EXPIRES_IN * 1000);
    
    await prisma.session.create({
      data: {
        userId,
        token: sessionToken,
        expiresAt,
      },
    });
    
    // Cache session for faster lookup
    await cache.set(
      `session:${sessionToken}`,
      { userId, expiresAt },
      SESSION_EXPIRES_IN
    );
    
    return sessionToken;
  }
  
  // Validate session
  static async validateSession(token: string): Promise<User | null> {
    // Check cache first
    const cachedSession = await cache.get<{ userId: string; expiresAt: Date }>(
      `session:${token}`
    );
    
    if (cachedSession) {
      if (new Date(cachedSession.expiresAt) > new Date()) {
        return await prisma.user.findUnique({
          where: { id: cachedSession.userId },
        });
      }
    }
    
    // Fallback to database
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    
    if (session) {
      // Update cache
      await cache.set(
        `session:${token}`,
        { userId: session.userId, expiresAt: session.expiresAt },
        Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
      );
      return session.user;
    }
    
    return null;
  }
  
  // Revoke session
  static async revokeSession(token: string): Promise<void> {
    await prisma.session.delete({
      where: { token },
    }).catch(() => {}); // Ignore if not found
    
    await cache.del(`session:${token}`);
  }
  
  // Blacklist access token
  static async blacklistToken(token: string): Promise<void> {
    try {
      const payload = decode(token) as { payload: JWTPayload };
      if (payload?.payload?.exp) {
        const ttl = payload.payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await cache.set(`blacklist:${token}`, true, ttl);
        }
      }
    } catch (error) {
      // Ignore decode errors
    }
  }
  
  // Clean expired sessions (run periodically)
  static async cleanExpiredSessions(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}

// Google OAuth utilities
export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export class GoogleOAuth {
  static getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account',
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  
  static async exchangeCode(code: string): Promise<{ access_token: string; refresh_token?: string }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }
    
    return response.json();
  }
  
  static async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    return response.json();
  }
}