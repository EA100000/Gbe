import {
  createParamDecorator,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

/** Exige un jeton « Bearer » valide ; place l'identifiant du compte sur la requête. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || token === undefined || token.length === 0) {
      throw new UnauthorizedException('Jeton manquant');
    }
    request.userId = await this.auth.authenticate(token);
    return true;
  }
}

/** Identifiant du compte authentifié (à utiliser derrière AuthGuard). */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const userId = context.switchToHttp().getRequest<AuthenticatedRequest>().userId;
  if (userId === undefined) throw new UnauthorizedException('Jeton manquant');
  return userId;
});
