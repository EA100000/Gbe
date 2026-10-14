import { isValidPseudo } from '@gbe/domain';
import { Body, Controller, Get, HttpCode, Inject, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { LeagueService, type LeagueView } from './league.service';

const PseudoSchema = z.object({
  pseudo: z
    .string()
    .refine(isValidPseudo, { error: 'Pseudo inconnu : il doit venir des listes de l’appli' })
    .transform((p) => p.normalize('NFC')),
});

@Controller()
@UseGuards(AuthGuard)
export class LeagueController {
  constructor(@Inject(LeagueService) private readonly league: LeagueService) {}

  /** Enregistre le pseudo tiré par l'appli (jamais un texte libre). */
  @Put('me')
  @HttpCode(204)
  async setPseudo(
    @CurrentUser() userId: string,
    @Body(new ZodBodyPipe(PseudoSchema)) body: z.infer<typeof PseudoSchema>,
  ): Promise<void> {
    await this.league.setPseudo(userId, body.pseudo);
  }

  /** Groupe de la semaine de l'apprenant, classé par XP de la semaine. */
  @Get('league')
  view(@CurrentUser() userId: string): Promise<LeagueView> {
    return this.league.leagueFor(userId);
  }
}
