import { z } from 'zod';

/**
 * Configuration lue dans les variables d'environnement, validée au démarrage.
 * Aucun secret dans le dépôt : voir .env.example.
 */
const ConfigSchema = z.object({
  DATABASE_URL: z
    .string()
    .startsWith('postgres', { error: 'DATABASE_URL doit être une URL PostgreSQL' }),
  JWT_SECRET: z.string().min(32, { error: 'JWT_SECRET doit faire au moins 32 caractères' }),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Origines web autorisées (séparées par des virgules) ; vide = aucune. */
  CORS_ORIGINS: z.string().default(''),
  /** Demandes de création de compte ou de jeton permises par minute et par adresse IP. */
  AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
  /** Applique les migrations au démarrage (pratique en développement et sur un seul serveur). */
  RUN_MIGRATIONS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export interface AppConfig {
  databaseUrl: string;
  jwtSecret: string;
  port: number;
  corsOrigins: string[];
  runMigrations: boolean;
  authRateLimitPerMinute: number;
  /** Durée de validité d'un jeton d'accès, en secondes. */
  accessTokenTtlSeconds: number;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')} : ${i.message}`).join('\n');
    throw new Error(`Configuration invalide :\n${details}`);
  }
  const c = parsed.data;
  return {
    databaseUrl: c.DATABASE_URL,
    jwtSecret: c.JWT_SECRET,
    port: c.PORT,
    corsOrigins: c.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0),
    runMigrations: c.RUN_MIGRATIONS,
    authRateLimitPerMinute: c.AUTH_RATE_LIMIT_PER_MINUTE,
    accessTokenTtlSeconds: 3600,
  };
}
