import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './queries';

const connectionString = process.env.DATABASE_URL!;

// Create the connection
const client = postgres(connectionString);

// Create the database instance with schema and relations
export const db = drizzle(client, { 
  schema: {
    ...schema,
    ...relations,
  }
}); 