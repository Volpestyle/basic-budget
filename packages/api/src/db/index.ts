import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '../config';

// Create a connection pool with optimal settings for performance
const queryClient = postgres(config.DATABASE_URL, {
  max: 20, // Maximum number of connections in pool
  idle_timeout: 20, // Idle connection timeout in seconds
  connect_timeout: 10, // Connection timeout in seconds
  prepare: true, // Use prepared statements for better performance
  ssl: config.NODE_ENV === 'production' ? 'require' : false,
  // Performance optimizations
  transform: {
    undefined: null, // Transform undefined to null for consistency
  },
});

// Initialize Drizzle with the schema
export const db = drizzle(queryClient, {
  schema,
  logger: config.NODE_ENV === 'development',
});

// Export schema for easy access
export * from './schema';

// Graceful shutdown
process.on('beforeExit', async () => {
  await queryClient.end();
});