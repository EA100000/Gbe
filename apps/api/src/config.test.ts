import { join } from 'node:path';

import { loadConfig } from './config';
import { findMigrationsFolder } from './db/database';

const valid = {
  DATABASE_URL: 'postgresql://gbe:mdp@localhost:5432/gbe',
  JWT_SECRET: 'x'.repeat(32),
};

describe('loadConfig', () => {
  it('applique les valeurs par défaut', () => {
    expect(loadConfig(valid)).toEqual({
      databaseUrl: valid.DATABASE_URL,
      jwtSecret: valid.JWT_SECRET,
      port: 3000,
      corsOrigins: [],
      runMigrations: true,
      authRateLimitPerMinute: 10,
      accessTokenTtlSeconds: 3600,
      contactEmail: null,
      inactiveAccountDays: 365,
      retentionIntervalMs: 86_400_000,
    });
  });

  it('lit l’adresse de contact et refuse une adresse invalide', () => {
    expect(loadConfig({ ...valid, CONTACT_EMAIL: 'bonjour@gbe.app' }).contactEmail).toBe(
      'bonjour@gbe.app',
    );
    expect(() => loadConfig({ ...valid, CONTACT_EMAIL: 'pas-une-adresse' })).toThrow(
      /CONTACT_EMAIL/,
    );
  });

  it('lit le port, les origines web et le choix des migrations', () => {
    const config = loadConfig({
      ...valid,
      PORT: '8080',
      CORS_ORIGINS: 'https://a.example, https://b.example',
      RUN_MIGRATIONS: 'false',
    });
    expect(config.port).toBe(8080);
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.runMigrations).toBe(false);
  });

  it('refuse un secret JWT trop court, avec un message clair', () => {
    expect(() => loadConfig({ ...valid, JWT_SECRET: 'court' })).toThrow(
      'JWT_SECRET doit faire au moins 32 caractères',
    );
  });

  it('refuse une configuration sans base de données', () => {
    expect(() => loadConfig({ JWT_SECRET: valid.JWT_SECRET })).toThrow('DATABASE_URL');
  });
});

describe('findMigrationsFolder', () => {
  it('trouve database/migrations en remontant les dossiers', () => {
    expect(findMigrationsFolder(__dirname)).toBe(
      join(__dirname, '..', '..', '..', 'database', 'migrations'),
    );
  });

  it('échoue clairement quand le dossier n’existe pas', () => {
    expect(() => findMigrationsFolder('/')).toThrow('introuvable');
  });
});
