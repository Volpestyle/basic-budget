import { defineConfig } from 'drizzle-kit';
import { config } from './src/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});