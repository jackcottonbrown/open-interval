import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// check if we have the database URL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set in .env.local');
}

// create the connection
const client = postgres(process.env.DATABASE_URL);

// create the db instance
export const db = drizzle(client, { schema });

// export the client for direct usage if needed
export { client }; 