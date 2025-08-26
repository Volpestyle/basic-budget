import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string().url(),
  
  // Plaid
  PLAID_CLIENT_ID: z.string(),
  PLAID_SECRET: z.string(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']),
  PLAID_PRODUCTS: z.string().default('transactions'),
  PLAID_COUNTRY_CODES: z.string().default('US'),
  PLAID_REDIRECT_URI: z.string().url().optional(),
  
  // AWS S3
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  
  // Redis
  REDIS_URL: z.string().url().optional(),
  
  // CORS
  FRONTEND_URL: z.string().url(),
  
  // Server
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;

// Export typed environment for better DX
export type Env = z.infer<typeof envSchema>;