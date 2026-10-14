import { randomBytes } from 'node:crypto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { generateRecoveryCode, normalizeRecoveryCode } from '@gbe/domain';
import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';

import type { AppConfig } from '../config';
import type { Database } from '../db/database';
import { users } from '../db/schema';
import { CLOCK, CONFIG, DATABASE, type Clock } from '../tokens';
import { isUniqueViolation, recoveryKeyOf } from './recovery-key';

export interface AccessToken {
  accessToken: string;
  expiresIn: number;
}

export interface GuestAccount extends AccessToken {
  userId: string;
  /** Secret à garder sur le téléphone (stockage sécurisé). Il n'est jamais renvoyé ensuite. */
  secret: string;
}

/** Compte retrouvé grâce à son code : le téléphone reçoit un nouveau secret. */
export interface RecoveredAccount extends GuestAccount {
  pseudo: string | null;
}

/** Empreinte factice : vérifier même quand le compte n'existe pas évite de le révéler par le temps de réponse. */
const DUMMY_HASH_SOURCE = 'compte-inexistant';

@Injectable()
export class AuthService {
  private dummyHash: Promise<string> | null = null;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Crée un compte invité et renvoie son identifiant, son secret et un jeton d'accès. */
  async createGuest(): Promise<GuestAccount> {
    const secret = randomBytes(32).toString('base64url');
    const [user] = await this.db
      .insert(users)
      .values({ kind: 'guest', secretHash: await hash(secret) })
      .returning({ id: users.id });
    if (user === undefined) throw new Error('Création du compte impossible');
    return { userId: user.id, secret, ...(await this.sign(user.id)) };
  }

  /** Échange l'identifiant et le secret d'un compte contre un nouveau jeton d'accès. */
  async issueToken(userId: string, secret: string): Promise<AccessToken> {
    const [user] = await this.db
      .select({ id: users.id, secretHash: users.secretHash })
      .from(users)
      .where(eq(users.id, userId));
    const valid =
      user === undefined
        ? (await verify(await this.getDummyHash(), secret), false)
        : await verify(user.secretHash, secret);
    if (!valid || user === undefined) throw new UnauthorizedException('Identifiants invalides');
    await this.db.update(users).set({ lastSeenAt: this.clock.now() }).where(eq(users.id, user.id));
    return this.sign(user.id);
  }

  /** Vérifie un jeton et que le compte existe encore (un compte supprimé ne peut plus rien faire). */
  async authenticate(token: string): Promise<string> {
    let subject: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      if (typeof payload.sub !== 'string') throw new Error('sub manquant');
      subject = payload.sub;
    } catch {
      throw new UnauthorizedException('Jeton invalide ou expiré');
    }
    const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, subject));
    if (user === undefined) throw new UnauthorizedException('Compte introuvable');
    return user.id;
  }

  /**
   * Crée le code de récupération du compte et le renvoie, une seule fois : le serveur n'en garde
   * que l'empreinte. Un nouveau code remplace le précédent, qui cesse de fonctionner.
   */
  async createRecoveryCode(userId: string): Promise<{ code: string }> {
    // Deux comptes avec le même code : chance infime (60 bits), mais on retire au sort si besoin.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = generateRecoveryCode((size) => randomBytes(size));
      const canonical = normalizeRecoveryCode(code);
      if (canonical === null) throw new Error('Code de récupération mal formé');
      try {
        await this.db
          .update(users)
          .set({ recoveryKey: recoveryKeyOf(this.config.jwtSecret, canonical) })
          .where(eq(users.id, userId));
        return { code };
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    throw new Error('Code de récupération impossible à créer');
  }

  /**
   * Retrouve un compte à partir de son code (nouveau téléphone). Le secret du compte est
   * remplacé : l'ancien téléphone perd l'accès, le nouveau reçoit le secret et un jeton.
   * Le code, lui, reste valable.
   */
  async recover(code: string): Promise<RecoveredAccount> {
    const canonical = normalizeRecoveryCode(code);
    if (canonical === null) throw new UnauthorizedException('Code de récupération inconnu');
    // Le hachage précède la recherche : un code inconnu coûte autant de temps qu'un code juste.
    const secret = randomBytes(32).toString('base64url');
    const secretHash = await hash(secret);
    const [user] = await this.db
      .update(users)
      .set({ secretHash, lastSeenAt: this.clock.now() })
      .where(eq(users.recoveryKey, recoveryKeyOf(this.config.jwtSecret, canonical)))
      .returning({ id: users.id, pseudo: users.pseudo });
    if (user === undefined) throw new UnauthorizedException('Code de récupération inconnu');
    return { userId: user.id, secret, pseudo: user.pseudo, ...(await this.sign(user.id)) };
  }

  /** Supprime le compte et, en cascade, tout son journal (exigence Google Play et RGPD). */
  async deleteAccount(userId: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, userId));
  }

  private async sign(userId: string): Promise<AccessToken> {
    const expiresIn = this.config.accessTokenTtlSeconds;
    return { accessToken: await this.jwt.signAsync({ sub: userId }, { expiresIn }), expiresIn };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hash(DUMMY_HASH_SOURCE);
    return this.dummyHash;
  }
}
