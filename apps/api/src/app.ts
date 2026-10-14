import 'reflect-metadata';

import { Module, type INestApplication, type LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerModule } from '@nestjs/throttler';
import helmet from 'helmet';

import { RetentionService } from './account/retention.service';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import type { AppConfig } from './config';
import type { Database } from './db/database';
import { HealthController } from './health/health.controller';
import { PagesController, PUBLIC_PAGES } from './pages/pages.controller';
import { SyncController } from './sync/sync.controller';
import { SyncService } from './sync/sync.service';
import { CLOCK, CONFIG, DATABASE, systemClock, type Clock } from './tokens';

export interface AppDependencies {
  config: AppConfig;
  db: Database;
  clock?: Clock;
}

/** Module racine, construit avec ses dépendances (base réelle en production, base de test sinon). */
export function createAppModule(deps: AppDependencies) {
  @Module({
    imports: [
      JwtModule.register({ secret: deps.config.jwtSecret }),
      // Limite appliquée aux routes de comptes (ThrottlerGuard), par route et par adresse IP.
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: deps.config.authRateLimitPerMinute }]),
    ],
    controllers: [AuthController, SyncController, HealthController, PagesController],
    providers: [
      { provide: CONFIG, useValue: deps.config },
      { provide: DATABASE, useValue: deps.db },
      { provide: CLOCK, useValue: deps.clock ?? systemClock },
      AuthService,
      SyncService,
      AuthGuard,
      RetentionService,
    ],
  })
  class AppModule {}
  return AppModule;
}

export async function createApp(
  deps: AppDependencies,
  logger?: LoggerService | false,
): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(createAppModule(deps), {
    logger: logger ?? ['log', 'warn', 'error'],
  });
  app.useBodyParser('json', { limit: '1mb' });
  app.use(helmet());
  app.setGlobalPrefix('v1', { exclude: [...PUBLIC_PAGES] });
  if (deps.config.corsOrigins.length > 0) {
    app.enableCors({ origin: deps.config.corsOrigins });
  }
  app.enableShutdownHooks();
  return app;
}
