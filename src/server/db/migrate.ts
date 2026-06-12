import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const queryClient = postgres(connectionString, { max: 1 });
const db = drizzle(queryClient);

async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  await queryClient.end();
  console.log('Migrations applied successfully.');
}

main();
