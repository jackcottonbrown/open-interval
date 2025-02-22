import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const resetDatabase = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const sql = postgres(connectionString, { max: 1 });

  console.log('Dropping existing tables...');

  try {
    // Drop existing tables
    await sql`DROP TABLE IF EXISTS todos CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP TABLE IF EXISTS drizzle.migrations CASCADE`;
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;

    console.log('Tables dropped successfully!');
  } catch (err) {
    console.error('Error dropping tables:', err);
    throw err;
  } finally {
    await sql.end();
  }
};

resetDatabase()
  .then(() => {
    console.log('Database reset completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database reset failed:', err);
    process.exit(1);
  }); 