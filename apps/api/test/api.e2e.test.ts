import { eq } from 'drizzle-orm';

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

async function createGuest() {
  const response = await ctx.http().post('/v1/auth/guest').expect(201);
  return response.body as { userId: string; secret: string; accessToken: string };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('santé', () => {
  it('répond « ok » quand la base répond', async () => {
    const response = await ctx.http().get('/v1/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('comptes invités', () => {
  it('crée un compte avec un identifiant, un secret et un jeton', async () => {
    const guest = await createGuest();
    expect(guest.userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(guest.secret.length).toBeGreaterThanOrEqual(40);
    expect(guest.accessToken.split('.')).toHaveLength(3);
  });

  it('ne stocke jamais le secret en clair, seulement son empreinte Argon2', async () => {
    const guest = await createGuest();
    const [row] = await ctx.handle.db.select().from(users).where(eq(users.id, guest.userId));
    expect(row?.secretHash.startsWith('$argon2')).toBe(true);
    expect(row?.secretHash).not.toContain(guest.secret);
  });

  it('donne un nouveau jeton contre le bon secret', async () => {
    const guest = await createGuest();
    const response = await ctx
      .http()
      .post('/v1/auth/token')
      .send({ userId: guest.userId, secret: guest.secret })
      .expect(200);
    expect(response.body.expiresIn).toBe(3600);
  });

  it('refuse un mauvais secret', async () => {
    const guest = await createGuest();
    await ctx
      .http()
      .post('/v1/auth/token')
      .send({ userId: guest.userId, secret: 'x'.repeat(43) })
      .expect(401);
  });

  it('refuse un compte inconnu avec la même réponse qu’un mauvais secret', async () => {
    const response = await ctx
      .http()
      .post('/v1/auth/token')
      .send({ userId: '00000000-0000-4000-8000-000000000000', secret: 'x'.repeat(43) })
      .expect(401);
    expect(response.body.message).toBe('Identifiants invalides');
  });

  it('refuse une demande de jeton mal formée', async () => {
    const response = await ctx.http().post('/v1/auth/token').send({ userId: 'abc' }).expect(400);
    expect(response.body.issues.length).toBeGreaterThan(0);
  });
});

describe('synchronisation du journal', () => {
  it('exige un jeton', async () => {
    await ctx
      .http()
      .post('/v1/sync/events')
      .send({ events: [lessonCompleted('e1')] })
      .expect(401);
  });

  it('refuse un jeton falsifié', async () => {
    await ctx
      .http()
      .get('/v1/progress')
      .set(auth('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.signature-fausse'))
      .expect(401);
  });

  it('enregistre les événements reçus', async () => {
    const guest = await createGuest();
    const response = await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(guest.accessToken))
      .send({ events: [lessonCompleted('e1'), lessonCompleted('e2', { lessonId: 'u01-l02' })] })
      .expect(200);
    expect(response.body).toEqual({ accepted: 2, duplicates: 0 });
  });

  it('ne compte jamais deux fois un lot renvoyé après une coupure', async () => {
    // Préparer
    const guest = await createGuest();
    const batch = { events: [lessonCompleted('e1'), lessonCompleted('e2', { xp: 10 })] };
    await ctx.http().post('/v1/sync/events').set(auth(guest.accessToken)).send(batch).expect(200);
    // Agir
    const replay = await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(guest.accessToken))
      .send(batch)
      .expect(200);
    // Vérifier
    expect(replay.body).toEqual({ accepted: 0, duplicates: 2 });
    const progress = await ctx.http().get('/v1/progress').set(auth(guest.accessToken)).expect(200);
    expect(progress.body.totalXp).toBe(25);
  });

  it('ignore un doublon à l’intérieur d’un même lot', async () => {
    const guest = await createGuest();
    const response = await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(guest.accessToken))
      .send({ events: [lessonCompleted('e1'), lessonCompleted('e1')] })
      .expect(200);
    expect(response.body).toEqual({ accepted: 1, duplicates: 1 });
  });

  it('refuse un lot qui contient un événement invalide, sans rien enregistrer', async () => {
    const guest = await createGuest();
    await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(guest.accessToken))
      .send({ events: [lessonCompleted('e1'), lessonCompleted('e2', { dayKey: '13/10/2026' })] })
      .expect(400);
    const rows = await ctx.handle.db.select().from(events);
    expect(rows).toHaveLength(0);
  });

  it('refuse un lot vide ou trop gros', async () => {
    const guest = await createGuest();
    await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(guest.accessToken))
      .send({ events: [] })
      .expect(400);
    const tooMany = Array.from({ length: 501 }, (_, i) => lessonCompleted(`e${i}`));
    await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(guest.accessToken))
      .send({ events: tooMany })
      .expect(400);
  });

  it('calcule la progression avec les règles du jeu partagées', async () => {
    const guest = await createGuest();
    await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(guest.accessToken))
      .send({
        events: [
          lessonCompleted('e1'),
          lessonCompleted('e2', {
            lessonId: 'u01-l02',
            xp: 10,
            dayKey: '2026-10-14',
            at: Date.UTC(2026, 9, 14),
          }),
          {
            id: 'chest:u01-calebasse',
            type: 'chest_opened',
            at: Date.UTC(2026, 9, 14, 1),
            dayKey: '2026-10-14',
            chestId: 'u01-calebasse',
            cauris: 20,
          },
          {
            id: 'h1',
            type: 'heart_lost',
            at: Date.UTC(2026, 9, 14, 2),
            dayKey: '2026-10-14',
            lessonId: 'u01-l03',
          },
        ],
      })
      .expect(200);
    const response = await ctx.http().get('/v1/progress').set(auth(guest.accessToken)).expect(200);
    expect(response.body).toEqual({
      totalXp: 25,
      cauris: 20,
      completedLessons: ['u01-l01', 'u01-l02'],
      activeDays: ['2026-10-13', '2026-10-14'],
      eventCount: 4,
    });
  });

  it('isole les comptes : chacun ne voit que son propre journal', async () => {
    const alice = await createGuest();
    const bob = await createGuest();
    await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(alice.accessToken))
      .send({ events: [lessonCompleted('meme-id')] })
      .expect(200);
    const bobSync = await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(bob.accessToken))
      .send({ events: [lessonCompleted('meme-id', { xp: 10 })] })
      .expect(200);
    expect(bobSync.body.accepted).toBe(1);
    const bobProgress = await ctx.http().get('/v1/progress').set(auth(bob.accessToken)).expect(200);
    expect(bobProgress.body.totalXp).toBe(10);
  });
});

describe('suppression du compte', () => {
  it('efface le compte et tout son journal, puis refuse ses jetons', async () => {
    // Préparer
    const guest = await createGuest();
    await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(guest.accessToken))
      .send({ events: [lessonCompleted('e1')] })
      .expect(200);
    // Agir
    await ctx.http().delete('/v1/account').set(auth(guest.accessToken)).expect(204);
    // Vérifier
    expect(await ctx.handle.db.select().from(events)).toHaveLength(0);
    expect(await ctx.handle.db.select().from(users)).toHaveLength(0);
    const after = await ctx.http().get('/v1/progress').set(auth(guest.accessToken)).expect(401);
    expect(after.body.message).toBe('Compte introuvable');
    await ctx
      .http()
      .post('/v1/auth/token')
      .send({ userId: guest.userId, secret: guest.secret })
      .expect(401);
  });
});
