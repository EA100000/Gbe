import { Body, Controller, Delete, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { normalizeRecoveryCode } from '@gbe/domain';
import { z } from 'zod';

import { ZodBodyPipe } from '../common/zod-body.pipe';
import { AuthGuard, CurrentUser } from './auth.guard';
import {
  AuthService,
  type AccessToken,
  type GuestAccount,
  type RecoveredAccount,
} from './auth.service';

const TokenRequestSchema = z.object({
  userId: z.uuid(),
  secret: z.string().min(20).max(200),
});

const RecoverRequestSchema = z.object({
  code: z
    .string()
    .max(40)
    .refine((code) => normalizeRecoveryCode(code) !== null, {
      error: 'Code de récupération mal formé : 12 lettres et chiffres',
    }),
});

/** Comptes invités : création, connexion, suppression. */
@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  /** Crée un compte invité. Limité pour éviter la création de comptes en masse. */
  @Post('auth/guest')
  @UseGuards(ThrottlerGuard)
  createGuest(): Promise<GuestAccount> {
    return this.auth.createGuest();
  }

  /** Nouveau jeton d'accès à partir du secret du téléphone. */
  @Post('auth/token')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  token(
    @Body(new ZodBodyPipe(TokenRequestSchema)) body: z.infer<typeof TokenRequestSchema>,
  ): Promise<AccessToken> {
    return this.auth.issueToken(body.userId, body.secret);
  }

  /** Retrouve un compte sur un nouveau téléphone grâce à son code. Limité comme la connexion. */
  @Post('auth/recover')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  recover(
    @Body(new ZodBodyPipe(RecoverRequestSchema)) body: z.infer<typeof RecoverRequestSchema>,
  ): Promise<RecoveredAccount> {
    return this.auth.recover(body.code);
  }

  /** Crée (ou remplace) le code de récupération du compte, renvoyé une seule fois. */
  @Post('account/recovery-code')
  @UseGuards(AuthGuard)
  createRecoveryCode(@CurrentUser() userId: string): Promise<{ code: string }> {
    return this.auth.createRecoveryCode(userId);
  }

  /** Supprime le compte et toutes ses données. */
  @Delete('account')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async deleteAccount(@CurrentUser() userId: string): Promise<void> {
    await this.auth.deleteAccount(userId);
  }
}
