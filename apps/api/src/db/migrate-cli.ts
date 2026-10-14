// Applique les migrations en attente : npm run db:migrate (DATABASE_URL requis).
import { Logger } from '@nestjs/common';

import { createDatabase, runMigrations } from './database';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_URL manquant');
  const { db, pool } = createDatabase(url);
  try {
    await runMigrations(db);
    new Logger('Migrations').log('Base à jour');
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  new Logger('Migrations').error(error);
  process.exit(1);
});
