import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { config } from '../config';
import { nanoid } from 'nanoid';

// Create secret key for JWT signing
const secret = new TextEncoder().encode(config.JWT_SECRET);

export interface TokenPayload extends JWTPayload {
  sub: string; // User ID
  email?: string;
  name?: string;
  provider?: string;
  isAnonymous?: boolean;
  sessionId?: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string; // User ID
  sessionId: string;
}

// Parse duration string to seconds
function parseDuration(duration: string): number {
  const matches = duration.match(/^(\d+)([smhdw])$/);
  if (!matches) throw new Error(`Invalid duration: ${duration}`);
  
  const value = parseInt(matches[1]!);
  const unit = matches[2]!;
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    case 'w': return value * 604800;
    default: throw new Error(`Invalid duration unit: ${unit}`);
  }
}

export class JWT {
  // Generate access token
  static async generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'jti'>): Promise<string> {
    const duration = parseDuration(config.JWT_EXPIRES_IN);
    
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${duration}s`)
      .setJti(nanoid())
      .sign(secret);
  }
  
  // Generate refresh token
  static async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    const duration = parseDuration(config.JWT_REFRESH_EXPIRES_IN);
    
    return new SignJWT({ sub: userId, sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${duration}s`)
      .setJti(nanoid())
      .sign(secret);
  }
  
  // Verify and decode token
  static async verifyToken<T extends JWTPayload = TokenPayload>(token: string): Promise<T> {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  }
  
  // Generate token pair
  static async generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp' | 'jti'>, sessionId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload.sub, sessionId)
    ]);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: parseDuration(config.JWT_EXPIRES_IN),
      refreshExpiresIn: parseDuration(config.JWT_REFRESH_EXPIRES_IN)
    };
  }
  
  // Decode token without verification (for debugging)
  static decodeToken(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(
        Buffer.from(parts[1]!, 'base64').toString()
      );
      
      return payload;
    } catch {
      return null;
    }
  }
}