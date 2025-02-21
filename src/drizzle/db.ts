import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { todos } from './schema';

// Create database instance
export const db = drizzle(sql);

// Export table schemas
export { todos };

// Export types
export type { Todo, NewTodo } from './schema'; 