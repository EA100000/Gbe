import { createHmac } from 'node:crypto';

/**
 * Empreinte stockée d'un code de récupération : HMAC-SHA256 avec une clé dérivée du secret
 * des jetons, propre à cet usage. Elle est déterministe (on retrouve le compte à partir du code
 * seul) mais inutilisable sans la clé du serveur si la base fuitait.
 * Conséquence assumée (ADR 0011) : changer JWT_SECRET rend caducs les codes déjà donnés.
 */
export function recoveryKeyOf(jwtSecret: string, canonicalCode: string): string {
  const key = createHmac('sha256', jwtSecret).update('gbe:code-de-recuperation:v1').digest();
  return createHmac('sha256', key).update(canonicalCode).digest('hex');
}

/** Violation d'unicité PostgreSQL (23505), qu'elle soit renvoyée telle quelle ou enveloppée. */
export function isUniqueViolation(error: unknown): boolean {
  for (let current: unknown = error; typeof current === 'object' && current !== null;) {
    if ('code' in current && current.code === '23505') return true;
    current = 'cause' in current ? current.cause : null;
  }
  return false;
}
