import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string().url(),
  
  // Plaid
  PLAID_CLIENT_ID: z.string(),
  PLAID_SECRET: z.string(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),
  PLAID_WEBHOOK_URL: z.string().url().optional(),
  
  // AWS S3
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  
  // CORS
  ALLOWED_ORIGINS: z.string().transform(val => val.split(',')),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  
  // Session
  SESSION_SECRET: z.string().min(32),
  ANONYMOUS_SESSION_DURATION: z.string().default('24h'),
});

// Validate and export config
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const config = parseResult.data;

// Performance-optimized config access
export const isDev = config.NODE_ENV === 'development';
export const isProd = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';