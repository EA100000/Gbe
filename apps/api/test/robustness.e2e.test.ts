import { createApp } from '../src/app';
import { createDatabase } from '../src/db/database';
import { resetDatabase, startTestApp, stopTestApp, testConfig } from './helpers';
import request from 'supertest';

describe('limitation de débit', () => {
  it('bloque la création de comptes en masse depuis la même adresse', async () => {
    const ctx = await startTestApp({ authRateLimitPerMinute: 10 });
    try {
      await resetDatabase(ctx);
      for (let i = 0; i < 10; i++) await ctx.http().post('/v1/auth/guest').expect(201);
      await ctx.http().post('/v1/auth/guest').expect(429);
    } finally {
      await stopTestApp(ctx);
    }
  });
});

describe('base de données injoignable', () => {
  it('le signale par la sonde de santé (503)', async () => {
    // Préparer : une base sur un port où rien n'écoute
    const handle = createDatabase('postgresql://gbe@127.0.0.1:1/aucune');
    const app = await createApp({ config: testConfig(), db: handle.db }, false);
    await app.init();
    try {
      // Agir et vérifier
      await request(app.getHttpServer()).get('/v1/health').expect(503);
    } finally {
      await app.close();
      await handle.pool.end();
    }
  });
});

describe('CORS', () => {
  it('autorise seulement les origines web configurées', async () => {
    const ctx = await startTestApp({ corsOrigins: ['https://gbe.example'] });
    try {
      const allowed = await ctx.http().get('/v1/health').set('Origin', 'https://gbe.example');
      expect(allowed.headers['access-control-allow-origin']).toBe('https://gbe.example');
      const other = await ctx.http().get('/v1/health').set('Origin', 'https://autre.example');
      expect(other.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      await stopTestApp(ctx);
    }
  });
});
