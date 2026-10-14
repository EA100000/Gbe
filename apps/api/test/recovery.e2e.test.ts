import { eq } from 'drizzle-orm';

import { events, users } from '../src/db/schema';
import { EVENTS_PAGE } from '../src/sync/sync.service';
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

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function createGuest() {
  const response = await ctx.http().post('/v1/auth/guest').expect(201);
  return response.body as { userId: string; secret: string; accessToken: string };
}

async function recoveryCode(accessToken: string): Promise<string> {
  const response = await ctx
    .http()
    .post('/v1/account/recovery-code')
    .set(auth(accessToken))
    .expect(201);
  return (response.body as { code: string }).code;
}

describe('code de récupération', () => {
  it('est donné une fois, en trois groupes de quatre, et seule son empreinte est gardée', async () => {
    // Préparer
    const guest = await createGuest();
    // Agir
    const code = await recoveryCode(guest.accessToken);
    // Vérifier
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    const [row] = await ctx.handle.db
      .select({ key: users.recoveryKey })
      .from(users)
      .where(eq(users.id, guest.userId));
    expect(row?.key).toMatch(/^[0-9a-f]{64}$/);
    expect(row?.key).not.toContain(code.replace(/-/g, ''));
  });

  it('exige d’être connecté', async () => {
    await ctx.http().post('/v1/account/recovery-code').expect(401);
  });

  it('remplace le précédent, qui ne marche plus', async () => {
    const guest = await createGuest();
    const first = await recoveryCode(guest.accessToken);

    const second = await recoveryCode(guest.accessToken);

    expect(second).not.toBe(first);
    await ctx.http().post('/v1/auth/recover').send({ code: first }).expect(401);
    await ctx.http().post('/v1/auth/recover').send({ code: second }).expect(200);
  });
});

describe('récupération du compte', () => {
  it('rend le compte avec son pseudo et un nouveau secret ; l’ancien est refusé', async () => {
    // Préparer : un compte avec un pseudo et un code.
    const guest = await createGuest();
    await ctx
      .http()
      .put('/v1/me')
      .set(auth(guest.accessToken))
      .send({ pseudo: 'Tortue sage' })
      .expect(204);
    const code = await recoveryCode(guest.accessToken);

    // Agir : le code est tapé sur un autre téléphone, en minuscules et sans tirets.
    const response = await ctx
      .http()
      .post('/v1/auth/recover')
      .send({ code: code.replace(/-/g, '').toLowerCase() })
      .expect(200);

    // Vérifier
    const recovered = response.body as {
      userId: string;
      secret: string;
      accessToken: string;
      pseudo: string | null;
    };
    expect(recovered.userId).toBe(guest.userId);
    expect(recovered.pseudo).toBe('Tortue sage');
    expect(recovered.secret).not.toBe(guest.secret);
    await ctx
      .http()
      .post('/v1/auth/token')
      .send({ userId: guest.userId, secret: recovered.secret })
      .expect(200);
    await ctx
      .http()
      .post('/v1/auth/token')
      .send({ userId: guest.userId, secret: guest.secret })
      .expect(401);
  });

  it('garde le code valable après usage', async () => {
    const guest = await createGuest();
    const code = await recoveryCode(guest.accessToken);

    await ctx.http().post('/v1/auth/recover').send({ code }).expect(200);

    await ctx.http().post('/v1/auth/recover').send({ code }).expect(200);
  });

  it('refuse un code inconnu sans dire pourquoi', async () => {
    await createGuest();

    const response = await ctx
      .http()
      .post('/v1/auth/recover')
      .send({ code: 'K7QM-3XRP-T9WB' })
      .expect(401);

    expect(JSON.stringify(response.body)).not.toContain('K7QM');
  });

  it('refuse un code mal formé (400)', async () => {
    await ctx.http().post('/v1/auth/recover').send({ code: 'K7QM-3XRP' }).expect(400);
    await ctx.http().post('/v1/auth/recover').send({}).expect(400);
  });
});

describe('journal renvoyé au téléphone', () => {
  it('rend les événements du compte, dans l’ordre, page par page', async () => {
    // Préparer : une page pleine et deux événements de plus, insérés directement.
    const guest = await createGuest();
    const total = EVENTS_PAGE + 2;
    const journal = Array.from({ length: total }, (_, i) =>
      lessonCompleted(`evt-${String(i).padStart(4, '0')}`, { at: Date.UTC(2026, 9, 13) + i }),
    );
    await ctx.handle.db.insert(events).values(
      journal.map((event) => ({
        userId: guest.userId,
        id: event.id,
        type: event.type,
        at: event.at,
        dayKey: event.dayKey,
        payload: event,
      })),
    );

    // Agir
    const first = await ctx.http().get('/v1/sync/events').set(auth(guest.accessToken)).expect(200);
    const page1 = first.body as { events: { id: string }[]; nextCursor: string | null };
    const second = await ctx
      .http()
      .get('/v1/sync/events')
      .query({ cursor: page1.nextCursor })
      .set(auth(guest.accessToken))
      .expect(200);
    const page2 = second.body as { events: { id: string }[]; nextCursor: string | null };

    // Vérifier
    expect(page1.events).toHaveLength(EVENTS_PAGE);
    expect(page1.events[0]).toEqual(journal[0]);
    expect(page2.events.map((e) => e.id)).toEqual(['evt-0500', 'evt-0501']);
    expect(page2.nextCursor).toBeNull();
  });

  it('ne rend jamais le journal d’un autre compte', async () => {
    const owner = await createGuest();
    const other = await createGuest();
    await ctx
      .http()
      .post('/v1/sync/events')
      .set(auth(owner.accessToken))
      .send({ events: [lessonCompleted('evt-1')] })
      .expect(200);

    const response = await ctx
      .http()
      .get('/v1/sync/events')
      .set(auth(other.accessToken))
      .expect(200);

    expect(response.body).toEqual({ events: [], nextCursor: null });
  });

  it('refuse un curseur abîmé', async () => {
    const guest = await createGuest();

    await ctx
      .http()
      .get('/v1/sync/events')
      .query({ cursor: 'pas-un-curseur' })
      .set(auth(guest.accessToken))
      .expect(400);
  });

  it('exige d’être connecté', async () => {
    await ctx.http().get('/v1/sync/events').expect(401);
  });
});
