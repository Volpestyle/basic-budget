#!/usr/bin/env bun

import { config } from './src/config';

// Simple test to ensure the API can start
console.log('Testing API configuration...\n');

// Check required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL', 
  'JWT_SECRET',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'PLAID_CLIENT_ID',
  'PLAID_SECRET'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.log('⚠️  Missing required environment variables:');
  missingVars.forEach(v => console.log(`   - ${v}`));
  console.log('\nPlease copy .env.example to .env and fill in the values.\n');
  process.exit(1);
}

console.log('✅ All required environment variables are set\n');

// Test database connection
import { db } from './src/db';
import { sql } from 'drizzle-orm';

try {
  const result = await db.execute(sql`SELECT 1 as test`);
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Test Redis connection  
import { redis } from './src/lib/redis';

try {
  await redis.ping();
  console.log('✅ Redis connection successful');
} catch (error) {
  console.error('❌ Redis connection failed:', error);
  process.exit(1);
}

console.log('\n✅ All systems operational! You can start the API with: bun dev\n');

process.exit(0);