import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import type { Database } from '../db/database';
import { DATABASE } from '../tokens';

/** Sonde de santé pour l'hébergeur : le serveur répond et la base aussi. */
@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException('Base de données injoignable');
    }
    return { status: 'ok' };
  }
}
