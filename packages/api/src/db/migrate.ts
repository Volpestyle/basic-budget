import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index';
import { config } from '../config';

async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigrations();