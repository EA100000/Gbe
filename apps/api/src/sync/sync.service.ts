import { applyEvents, dedupeEvents, parseGameEvent, type GameEvent } from '@gbe/domain';
import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import type { Database } from '../db/database';
import { events } from '../db/schema';
import { DATABASE } from '../tokens';

export interface SyncResult {
  accepted: number;
  duplicates: number;
}

export interface ProgressSummary {
  totalXp: number;
  cauris: number;
  completedLessons: string[];
  activeDays: string[];
  eventCount: number;
}

@Injectable()
export class SyncService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Enregistre un lot d'événements. Un événement déjà reçu (même identifiant pour ce compte)
   * est ignoré : renvoyer le même lot après une coupure réseau ne double jamais l'XP.
   */
  async record(userId: string, batch: readonly GameEvent[]): Promise<SyncResult> {
    const unique = dedupeEvents(batch);
    const inserted = await this.db
      .insert(events)
      .values(
        unique.map((event) => ({
          userId,
          id: event.id,
          type: event.type,
          at: event.at,
          dayKey: event.dayKey,
          payload: event,
        })),
      )
      .onConflictDoNothing({ target: [events.userId, events.id] })
      .returning({ id: events.id });
    return { accepted: inserted.length, duplicates: batch.length - inserted.length };
  }

  /** Progression recalculée avec les mêmes règles que l'appli (paquet domain). */
  async progress(userId: string): Promise<ProgressSummary> {
    const rows = await this.db
      .select({ payload: events.payload })
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(asc(events.at), asc(events.id));
    const journal = rows
      .map((row) => parseGameEvent(row.payload))
      .filter((event): event is GameEvent => event !== null);
    const progress = applyEvents(journal);
    return {
      totalXp: progress.totalXp,
      cauris: progress.cauris,
      completedLessons: [...progress.completedLessons].sort(),
      activeDays: [...progress.activeDays].sort(),
      eventCount: journal.length,
    };
  }
}
