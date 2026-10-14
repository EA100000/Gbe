import { applyEvents, dedupeEvents, parseGameEvent, type GameEvent } from '@gbe/domain';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, or } from 'drizzle-orm';
import { z } from 'zod';

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

/** Taille d'une page du journal renvoyé au téléphone. */
export const EVENTS_PAGE = 500;

export interface EventsPage {
  events: GameEvent[];
  /** À renvoyer pour la page suivante ; `null` à la dernière page. */
  nextCursor: string | null;
}

const CursorSchema = z.tuple([z.number().int().nonnegative(), z.string().min(1).max(200)]);

/** Position dans le journal (date, identifiant), opaque pour le téléphone. */
function encodeCursor(at: number, id: string): string {
  return Buffer.from(JSON.stringify([at, id])).toString('base64url');
}

function decodeCursor(cursor: string): { at: number; id: string } {
  try {
    const [at, id] = CursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
    return { at, id };
  } catch {
    throw new BadRequestException('Curseur invalide');
  }
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

  /** Une page du journal, dans l'ordre (date, identifiant), à partir d'un curseur. */
  async list(userId: string, cursor: string | null, pageSize = EVENTS_PAGE): Promise<EventsPage> {
    const after = cursor === null ? null : decodeCursor(cursor);
    const rows = await this.db
      .select({ at: events.at, id: events.id, payload: events.payload })
      .from(events)
      .where(
        after === null
          ? eq(events.userId, userId)
          : and(
              eq(events.userId, userId),
              or(gt(events.at, after.at), and(eq(events.at, after.at), gt(events.id, after.id))),
            ),
      )
      .orderBy(asc(events.at), asc(events.id))
      .limit(pageSize + 1);
    const page = rows.slice(0, pageSize);
    const last = page.at(-1);
    return {
      events: page
        .map((row) => parseGameEvent(row.payload))
        .filter((event): event is GameEvent => event !== null),
      nextCursor:
        rows.length > pageSize && last !== undefined ? encodeCursor(last.at, last.id) : null,
    };
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
