import type { GameEvent } from '@gbe/domain';
import { z } from 'zod';

/** Le serveur a répondu par une erreur (4xx, 5xx). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Pas de réseau, serveur injoignable ou réponse inattendue : on réessaiera plus tard. */
export class OfflineError extends Error {
  constructor(cause: unknown) {
    super('Serveur injoignable');
    this.name = 'OfflineError';
    this.cause = cause;
  }
}

const AccessTokenSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().positive(),
});
const GuestSchema = AccessTokenSchema.extend({
  userId: z.string().min(1),
  secret: z.string().min(20),
});
const SyncResultSchema = z.object({ accepted: z.number(), duplicates: z.number() });
const LeagueSchema = z.object({
  weekKey: z.string(),
  endsAt: z.number(),
  groupSize: z.number().int().positive(),
  topCount: z.number().int().nonnegative(),
  members: z.array(
    z.object({
      rank: z.number().int().positive(),
      pseudo: z.string().nullable(),
      xp: z.number().int().nonnegative(),
      isMe: z.boolean(),
    }),
  ),
});

export type AccessToken = z.infer<typeof AccessTokenSchema>;
export type GuestAccount = z.infer<typeof GuestSchema>;
export type SyncResult = z.infer<typeof SyncResultSchema>;
export type League = z.infer<typeof LeagueSchema>;
export type LeagueMember = League['members'][number];

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface ApiClient {
  createGuest(): Promise<GuestAccount>;
  token(userId: string, secret: string): Promise<AccessToken>;
  sendEvents(accessToken: string, events: readonly GameEvent[]): Promise<SyncResult>;
  /** Supprime le compte et tout son journal sur le serveur. */
  deleteAccount(accessToken: string): Promise<void>;
  /** Enregistre le pseudo tiré par l'appli (le serveur refuse tout texte hors des listes). */
  setPseudo(accessToken: string, pseudo: string): Promise<void>;
  /** Groupe de la Ligue de la semaine, classé. */
  league(accessToken: string): Promise<League>;
}

/** Client HTTP de l'API Gbè. Toute réponse est validée par Zod avant usage. */
export function createApiClient(baseUrl: string, fetchImpl: FetchLike = fetch): ApiClient {
  const root = baseUrl.replace(/\/+$/, '');

  async function send(
    path: string,
    init: { method: string; body?: unknown; token?: string },
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(`${root}/v1${path}`, {
        method: init.method,
        headers: {
          'Content-Type': 'application/json',
          ...(init.token === undefined ? {} : { Authorization: `Bearer ${init.token}` }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch (error) {
      throw new OfflineError(error);
    }
    if (!response.ok) throw new ApiError(response.status, `Erreur ${response.status} sur ${path}`);
    return response;
  }

  async function call<S extends z.ZodType>(
    path: string,
    schema: S,
    init: { method: string; body?: unknown; token?: string },
  ): Promise<z.infer<S>> {
    const response = await send(path, init);
    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      throw new OfflineError(error);
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new OfflineError(parsed.error);
    return parsed.data;
  }

  return {
    createGuest: () => call('/auth/guest', GuestSchema, { method: 'POST' }),
    token: (userId, secret) =>
      call('/auth/token', AccessTokenSchema, { method: 'POST', body: { userId, secret } }),
    sendEvents: (accessToken, events) =>
      call('/sync/events', SyncResultSchema, {
        method: 'POST',
        body: { events },
        token: accessToken,
      }),
    deleteAccount: async (accessToken) => {
      await send('/account', { method: 'DELETE', token: accessToken });
    },
    setPseudo: async (accessToken, pseudo) => {
      await send('/me', { method: 'PUT', body: { pseudo }, token: accessToken });
    },
    league: (accessToken) => call('/league', LeagueSchema, { method: 'GET', token: accessToken }),
  };
}
