import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as relations from './queries';

// Check if we have a database URL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the database instance with schema and relations
export const db = drizzle(pool, { 
  schema: {
    ...schema,
    ...relations,
  }
});

// Export schema for use in other files
export * from './schema'; 