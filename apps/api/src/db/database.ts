import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseHandle {
  db: Database;
  pool: Pool;
}

export function createDatabase(url: string): DatabaseHandle {
  const pool = new Pool({ connectionString: url, max: 10 });
  return { db: drizzle(pool, { schema }), pool };
}

/** Cherche le dossier database/migrations en remontant depuis `start` (code source ou build). */
export function findMigrationsFolder(start: string = __dirname): string {
  let current = start;
  for (;;) {
    const candidate = join(current, 'database', 'migrations');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) throw new Error('Dossier database/migrations introuvable');
    current = parent;
  }
}

export async function runMigrations(db: Database, folder = findMigrationsFolder()): Promise<void> {
  await migrate(db, { migrationsFolder: folder });
}
