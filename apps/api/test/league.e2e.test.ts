import { LEAGUE_GROUP_SIZE } from '@gbe/domain';

import {
  lessonCompleted,
  resetDatabase,
  startTestApp,
  stopTestApp,
  type TestContext,
} from './helpers';

/** Mercredi 14 octobre 2026, 13 h au Bénin : semaine du lundi 12. */
const NOW = new Date(Date.UTC(2026, 9, 14, 12, 0));
let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestApp({}, { now: () => NOW });
});

afterAll(async () => {
  await stopTestApp(ctx);
});

beforeEach(async () => {
  await resetDatabase(ctx);
});

async function learner(pseudo: string, xpEvents: { id: string; xp: number; at?: number }[] = []) {
  const { body } = await ctx.http().post('/v1/auth/guest').expect(201);
  const auth = `Bearer ${(body as { accessToken: string }).accessToken}`;
  await ctx.http().put('/v1/me').set('Authorization', auth).send({ pseudo }).expect(204);
  if (xpEvents.length > 0) {
    await ctx
      .http()
      .post('/v1/sync/events')
      .set('Authorization', auth)
      .send({
        events: xpEvents.map((e) =>
          lessonCompleted(e.id, { xp: e.xp, ...(e.at ? { at: e.at } : {}) }),
        ),
      })
      .expect(200);
  }
  return auth;
}

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('pseudo', () => {
  it('refuse un pseudo qui ne vient pas des listes de l’appli', async () => {
    const { body } = await ctx.http().post('/v1/auth/guest').expect(201);
    const auth = `Bearer ${(body as { accessToken: string }).accessToken}`;

    const response = await ctx
      .http()
      .put('/v1/me')
      .set('Authorization', auth)
      .send({ pseudo: 'Admin' });

    expect(response.status).toBe(400);
  });

  it('exige d’être connecté', async () => {
    await ctx.http().put('/v1/me').send({ pseudo: 'Lion sage' }).expect(401);
    await ctx.http().get('/v1/league').expect(401);
  });
});

describe('Ligue de la semaine', () => {
  it('classe le groupe par XP de cette semaine seulement', async () => {
    // Préparer
    const lastSunday = Date.UTC(2026, 9, 11, 12, 0);
    const other = await learner('Tortue sage', [
      { id: uuid(1), xp: 15 },
      { id: uuid(2), xp: 999, at: lastSunday },
    ]);
    await ctx.http().get('/v1/league').set('Authorization', other).expect(200);
    const me = await learner('Lion brave', [
      { id: uuid(3), xp: 15 },
      { id: uuid(4), xp: 10 },
    ]);
    // Agir
    const { body } = await ctx.http().get('/v1/league').set('Authorization', me).expect(200);
    // Vérifier
    expect(body).toMatchObject({
      weekKey: '2026-10-12',
      endsAt: Date.UTC(2026, 9, 18, 23, 0),
      groupSize: 30,
      topCount: 5,
    });
    expect(body.members).toEqual([
      { rank: 1, pseudo: 'Lion brave', xp: 25, isMe: true },
      { rank: 2, pseudo: 'Tortue sage', xp: 15, isMe: false },
    ]);
  });

  it('ne montre que les apprenants qui ont ouvert la Ligue cette semaine', async () => {
    await learner('Tortue sage', [{ id: uuid(1), xp: 15 }]);
    const me = await learner('Lion brave');

    const { body } = await ctx.http().get('/v1/league').set('Authorization', me).expect(200);

    expect(body.members).toEqual([{ rank: 1, pseudo: 'Lion brave', xp: 0, isMe: true }]);
  });

  it('ne renvoie jamais l’identifiant des autres apprenants', async () => {
    const other = await learner('Tortue sage');
    await ctx.http().get('/v1/league').set('Authorization', other).expect(200);
    const me = await learner('Lion brave');

    const { text } = await ctx.http().get('/v1/league').set('Authorization', me).expect(200);

    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it(`ouvre un nouveau groupe après ${LEAGUE_GROUP_SIZE} apprenants`, async () => {
    for (let i = 0; i < LEAGUE_GROUP_SIZE; i += 1) {
      const auth = await learner('Hibou calme');
      await ctx.http().get('/v1/league').set('Authorization', auth).expect(200);
    }
    const late = await learner('Colibri agile');

    const { body } = await ctx.http().get('/v1/league').set('Authorization', late).expect(200);

    expect(body.members).toHaveLength(1);
    expect(body.members[0]).toMatchObject({ pseudo: 'Colibri agile', isMe: true });
  });

  it('garde l’apprenant dans le même groupe toute la semaine', async () => {
    const me = await learner('Lion brave');
    const first = await ctx.http().get('/v1/league').set('Authorization', me).expect(200);
    const again = await ctx.http().get('/v1/league').set('Authorization', me).expect(200);

    expect(again.body.members).toEqual(first.body.members);
  });
});
