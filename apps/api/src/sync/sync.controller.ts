import { GameEventSchema } from '@gbe/domain';
import { Body, Controller, Get, HttpCode, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  SyncService,
  type EventsPage,
  type ProgressSummary,
  type SyncResult,
} from './sync.service';

/** Taille maximale d'un lot : l'appli envoie par paquets plus petits. */
export const MAX_BATCH = 500;

const SyncRequestSchema = z.object({
  events: z.array(GameEventSchema).min(1).max(MAX_BATCH),
});

const EventsQuerySchema = z.object({ cursor: z.string().min(1).max(400).optional() });

@Controller()
@UseGuards(AuthGuard)
export class SyncController {
  constructor(@Inject(SyncService) private readonly sync: SyncService) {}

  /** Reçoit le journal du téléphone. Rejouable sans doublon. */
  @Post('sync/events')
  @HttpCode(200)
  record(
    @CurrentUser() userId: string,
    @Body(new ZodBodyPipe(SyncRequestSchema)) body: z.infer<typeof SyncRequestSchema>,
  ): Promise<SyncResult> {
    return this.sync.record(userId, body.events);
  }

  /** Journal du compte, page par page (récupération sur un nouveau téléphone). */
  @Get('sync/events')
  list(
    @CurrentUser() userId: string,
    @Query(new ZodBodyPipe(EventsQuerySchema)) query: z.infer<typeof EventsQuerySchema>,
  ): Promise<EventsPage> {
    return this.sync.list(userId, query.cursor ?? null);
  }

  /** Progression calculée côté serveur, à partir du journal reçu. */
  @Get('progress')
  progress(@CurrentUser() userId: string): Promise<ProgressSummary> {
    return this.sync.progress(userId);
  }
}
