import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';
import { db, users } from '../db';
import { eq } from 'drizzle-orm';
import { JWT } from '../lib/jwt';
import { Cache } from '../lib/redis';
import { nanoid } from 'nanoid';

const oauth2Client = new OAuth2Client(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  config.GOOGLE_REDIRECT_URI
);

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export class GoogleAuthService {
  // Generate OAuth URL
  static getAuthUrl(state?: string): string {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'select_account',
      state,
    });
  }
  
  // Exchange code for tokens and user info
  static async exchangeCode(code: string): Promise<GoogleUserInfo> {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Fetch user info
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }
    
    return response.json() as Promise<GoogleUserInfo>;
  }
  
  // Verify ID token (for mobile/web clients)
  static async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload) {
      throw new Error('Invalid ID token');
    }
    
    return {
      id: payload.sub,
      email: payload.email!,
      name: payload.name || payload.email!.split('@')[0]!,
      picture: payload.picture || '',
      verified_email: payload.email_verified || false,
    };
  }
  
  // Find or create user from Google info
  static async findOrCreateUser(googleUser: GoogleUserInfo) {
    // Check cache first
    const cacheKey = `google:user:${googleUser.id}`;
    let user = await Cache.get<typeof users.$inferSelect>(cacheKey);
    
    if (user) {
      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
      
      return user;
    }
    
    // Check database
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, googleUser.email))
      .limit(1);
    
    if (existingUsers.length > 0) {
      user = existingUsers[0]!;
      
      // Update user info if provider is Google
      if (user.provider === 'google') {
        user = await db
          .update(users)
          .set({
            name: googleUser.name,
            avatarUrl: googleUser.picture,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning()
          .then(r => r[0]!);
      } else {
        // Update last login only
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));
      }
    } else {
      // Create new user
      const newUsers = await db
        .insert(users)
        .values({
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          provider: 'google',
          providerId: googleUser.id,
          status: 'active',
          isAnonymous: false,
          lastLoginAt: new Date(),
          metadata: {
            emailVerified: googleUser.verified_email,
          },
        })
        .returning();
      
      user = newUsers[0]!;
    }
    
    // Cache user
    await Cache.set(cacheKey, user, 300); // 5 minutes
    
    return user;
  }
  
  // Generate tokens for user
  static async generateTokens(user: typeof users.$inferSelect) {
    const sessionId = nanoid();
    
    // Create session in database
    const { sessions } = await import('../db');
    await db.insert(sessions).values({
      userId: user.id,
      refreshToken: sessionId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    
    // Generate JWT tokens
    return JWT.generateTokenPair(
      {
        sub: user.id,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        provider: user.provider,
        isAnonymous: user.isAnonymous,
        sessionId,
      },
      sessionId
    );
  }
}