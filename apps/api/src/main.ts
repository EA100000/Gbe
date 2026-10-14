import { Logger } from '@nestjs/common';

import { createApp } from './app';
import { loadConfig } from './config';
import { createDatabase, runMigrations } from './db/database';

async function bootstrap(): Promise<void> {
  const config = loadConfig(process.env);
  const { db, pool } = createDatabase(config.databaseUrl);
  if (config.runMigrations) await runMigrations(db);

  const app = await createApp({ config, db });
  const close = async () => {
    await app.close();
    await pool.end();
  };
  process.once('SIGTERM', () => void close());
  process.once('SIGINT', () => void close());

  await app.listen(config.port, '0.0.0.0');
  new Logger('Gbè').log(`API prête sur le port ${config.port}`);
}

bootstrap().catch((error: unknown) => {
  new Logger('Gbè').error(error instanceof Error ? error.message : error);
  process.exit(1);
});
