import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

let instance: Db | null = null;

function getDb(): Db {
  if (!instance) {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    instance = drizzle(postgres(connectionString), { schema });
  }

  return instance;
}

// Lazily connects on first query, so importing this module is safe even when
// DATABASE_URL isn't set (e.g. during the Angular build's prerender step).
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
