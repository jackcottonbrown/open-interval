import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const runMigrations = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log('Running migrations...');

  await migrate(db, { migrationsFolder: 'drizzle' });

  console.log('Migrations complete!');

  await sql.end();
};

runMigrations()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration script failed:', err);
    process.exit(1);
  }); 