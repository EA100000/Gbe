/**
 * Code de récupération d'un compte (écrans 13 et 14) : 12 caractères en 3 groupes de 4,
 * par exemple « K7QM-3XRP-T9WD ». Alphabet de Crockford (base 32) : chiffres et majuscules
 * sans I, L, O ni U, pour éviter les confusions à la lecture et à la saisie.
 * 12 caractères × 5 bits = 60 bits de hasard.
 */
export const RECOVERY_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const RECOVERY_CODE_LENGTH = 12;
const GROUP = 4;

/** Lettres souvent confondues, ramenées au caractère de l'alphabet qu'elles imitent. */
const LOOKALIKES: Readonly<Record<string, string>> = { O: '0', I: '1', L: '1' };

/**
 * Tire un nouveau code, déjà mis en forme. `randomBytes` doit être cryptographique
 * (crypto.randomBytes côté serveur). 256 étant un multiple de 32, chaque caractère est équiprobable.
 */
export function generateRecoveryCode(randomBytes: (size: number) => Uint8Array): string {
  const bytes = randomBytes(RECOVERY_CODE_LENGTH);
  if (bytes.length < RECOVERY_CODE_LENGTH) throw new Error('Pas assez de hasard');
  let code = '';
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i += 1) {
    code += RECOVERY_CODE_ALPHABET[(bytes[i] ?? 0) % RECOVERY_CODE_ALPHABET.length];
  }
  return formatRecoveryCode(code);
}

/**
 * Forme canonique d'un code saisi : 12 caractères de l'alphabet, sans tiret.
 * Tolère minuscules, espaces, tirets et les confusions O/0, I/1, L/1.
 * `null` si le texte ne peut pas être un code.
 */
export function normalizeRecoveryCode(input: string): string | null {
  const compact = input
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s\-‐‑‒–—]/g, '');
  let canonical = '';
  for (const char of compact) {
    const mapped = LOOKALIKES[char] ?? char;
    if (!RECOVERY_CODE_ALPHABET.includes(mapped)) return null;
    canonical += mapped;
  }
  return canonical.length === RECOVERY_CODE_LENGTH ? canonical : null;
}

/** Met en forme un code canonique : « XXXX-XXXX-XXXX ». */
export function formatRecoveryCode(canonical: string): string {
  const groups: string[] = [];
  for (let i = 0; i < canonical.length; i += GROUP) groups.push(canonical.slice(i, i + GROUP));
  return groups.join('-');
}
