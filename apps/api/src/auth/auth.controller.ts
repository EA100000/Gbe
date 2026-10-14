import { Body, Controller, Delete, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';

import { ZodBodyPipe } from '../common/zod-body.pipe';
import { AuthGuard, CurrentUser } from './auth.guard';
import { AuthService, type AccessToken, type GuestAccount } from './auth.service';

const TokenRequestSchema = z.object({
  userId: z.uuid(),
  secret: z.string().min(20).max(200),
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

  /** Supprime le compte et toutes ses données. */
  @Delete('account')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async deleteAccount(@CurrentUser() userId: string): Promise<void> {
    await this.auth.deleteAccount(userId);
  }
}
