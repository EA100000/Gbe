import { eq, sql } from 'drizzle-orm';

import { RetentionService } from '../src/account/retention.service';
import { events, users } from '../src/db/schema';
import {
  lessonCompleted,
  resetDatabase,
  startTestApp,
  stopTestApp,
  type TestContext,
} from './helpers';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestApp();
});

afterAll(async () => {
  await stopTestApp(ctx);
});

beforeEach(async () => {
  await resetDatabase(ctx);
});

async function guest() {
  const response = await ctx.http().post('/v1/auth/guest').expect(201);
  return response.body as { userId: string; accessToken: string };
}

describe('pages publiques (fiche Google Play)', () => {
  it('sert la page Confidentialité hors du préfixe de l’API', async () => {
    const response = await ctx.http().get('/confidentialite').expect(200);

    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<h1>Confidentialité</h1>');
    expect(response.text).toContain('mailto:contact@gbe.test');
    expect(response.text).toContain('365 jours');
  });

  it('explique comment supprimer son compte', async () => {
    const response = await ctx.http().get('/suppression-du-compte').expect(200);

    expect(response.text).toContain('Supprimer mon compte');
  });

  it('ne sert pas ces pages sous /v1', async () => {
    await ctx.http().get('/v1/confidentialite').expect(404);
  });
});

describe('conservation limitée', () => {
  it('supprime les comptes inactifs depuis plus d’un an, avec leur journal', async () => {
    // Préparer : un compte actif, un compte inactif depuis 400 jours.
    const active = await guest();
    const inactive = await guest();
    await ctx
      .http()
      .post('/v1/sync/events')
      .set('Authorization', `Bearer ${inactive.accessToken}`)
      .send({ events: [lessonCompleted('00000000-0000-4000-8000-000000000001')] })
      .expect(200);
    await ctx.handle.db
      .update(users)
      .set({ lastSeenAt: sql`now() - interval '400 days'` })
      .where(eq(users.id, inactive.userId));

    // Agir
    const deleted = await ctx.app.get(RetentionService).purgeInactive();

    // Vérifier
    expect(deleted).toBe(1);
    const remaining = await ctx.handle.db.select({ id: users.id }).from(users);
    expect(remaining).toEqual([{ id: active.userId }]);
    expect(await ctx.handle.db.select().from(events)).toEqual([]);
  });
});

describe('ménage automatique', () => {
  it('fait le ménage dès le démarrage du serveur, puis à intervalle régulier', async () => {
    // Préparer : un compte inactif depuis 400 jours dans la base partagée.
    const inactive = await guest();
    await ctx.handle.db
      .update(users)
      .set({ lastSeenAt: sql`now() - interval '400 days'` })
      .where(eq(users.id, inactive.userId));

    // Agir : un second serveur démarre avec le ménage activé.
    const other = await startTestApp({ retentionIntervalMs: 60_000 });
    try {
      for (let i = 0; i < 50; i += 1) {
        const left = await ctx.handle.db.select({ id: users.id }).from(users);
        if (left.length === 0) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      // Vérifier
      expect(await ctx.handle.db.select({ id: users.id }).from(users)).toEqual([]);
    } finally {
      await stopTestApp(other);
    }
  });
});
