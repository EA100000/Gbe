import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { lt } from 'drizzle-orm';

import type { AppConfig } from '../config';
import type { Database } from '../db/database';
import { users } from '../db/schema';
import { CLOCK, CONFIG, DATABASE, type Clock } from '../tokens';

const DAY_MS = 24 * 60 * 60_000;

/**
 * Conservation limitée : un compte invité sans connexion depuis `inactiveAccountDays` jours
 * est supprimé avec tout son journal (suppression en cascade). Personne ne peut le réclamer :
 * il n'est relié à aucun nom ni e-mail.
 */
@Injectable()
export class RetentionService implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly logger = new Logger('Conservation');

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.retentionIntervalMs <= 0) return;
    const run = () => {
      this.purgeInactive()
        .then((n) => n > 0 && this.logger.log(`${n} compte(s) inactif(s) supprimé(s)`))
        .catch((error: unknown) => this.logger.warn(`Ménage impossible : ${String(error)}`));
    };
    run();
    this.timer = setInterval(run, this.config.retentionIntervalMs);
    // Le ménage ne doit pas empêcher le serveur de s'arrêter.
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer !== null) clearInterval(this.timer);
  }

  /** Supprime les comptes inactifs ; renvoie leur nombre. */
  async purgeInactive(): Promise<number> {
    const cutoff = new Date(this.clock.now().getTime() - this.config.inactiveAccountDays * DAY_MS);
    const deleted = await this.db
      .delete(users)
      .where(lt(users.lastSeenAt, cutoff))
      .returning({ id: users.id });
    return deleted.length;
  }
}
