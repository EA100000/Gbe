import type { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import request from 'supertest';

import { createApp } from '../src/app';
import type { AppConfig } from '../src/config';
import { createDatabase, runMigrations, type DatabaseHandle } from '../src/db/database';

/**
 * Les tests de l'API tournent sur une vraie base PostgreSQL jetable :
 * TEST_DATABASE_URL (service PostgreSQL de la CI, ou base locale de développement).
 */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error(
      'TEST_DATABASE_URL manquant. Lance une base de test (docker compose up postgres) ' +
        'puis : TEST_DATABASE_URL=postgresql://gbe:motdepasse@localhost:5432/gbe_test npm test',
    );
  }
  return url;
}

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    databaseUrl: testDatabaseUrl(),
    jwtSecret: 'secret-de-test-assez-long-pour-hs256-0123456789',
    port: 0,
    corsOrigins: [],
    runMigrations: true,
    authRateLimitPerMinute: 1000,
    accessTokenTtlSeconds: 3600,
    ...overrides,
  };
}

export interface TestContext {
  app: INestApplication;
  handle: DatabaseHandle;
  http: () => ReturnType<typeof request>;
}

export async function startTestApp(overrides: Partial<AppConfig> = {}): Promise<TestContext> {
  const config = testConfig(overrides);
  const handle = createDatabase(config.databaseUrl);
  await runMigrations(handle.db);
  const app = await createApp({ config, db: handle.db }, false);
  await app.init();
  return { app, handle, http: () => request(app.getHttpServer()) };
}

export async function stopTestApp(context: TestContext): Promise<void> {
  await context.app.close();
  await context.handle.pool.end();
}

/** Vide les tables entre deux tests. */
export async function resetDatabase(context: TestContext): Promise<void> {
  await context.handle.db.execute(sql`truncate table events, users cascade`);
}

/** Événement de jeu valide, modifiable. */
export function lessonCompleted(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: 'lesson_completed',
    at: Date.UTC(2026, 9, 13, 9, 0),
    dayKey: '2026-10-13',
    lessonId: 'u01-l01',
    unitId: 'u01',
    packId: 'u01-salutations',
    packVersion: 1,
    xp: 15,
    accuracy: 0.9,
    durationMs: 168_000,
    ...overrides,
  };
}
