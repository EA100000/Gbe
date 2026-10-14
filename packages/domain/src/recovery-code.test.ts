import fc from 'fast-check';

import {
  formatRecoveryCode,
  generateRecoveryCode,
  normalizeRecoveryCode,
  RECOVERY_CODE_ALPHABET,
  RECOVERY_CODE_LENGTH,
} from './recovery-code';

const bytes = (values: number[]) => () => Uint8Array.from(values);

describe('code de récupération', () => {
  it('se présente en trois groupes de quatre caractères', () => {
    // Préparer
    const random = bytes([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 31]);
    // Agir
    const code = generateRecoveryCode(random);
    // Vérifier
    expect(code).toBe('0123-4567-89AZ');
  });

  it('n’utilise que l’alphabet sans I, L, O ni U', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 12, maxLength: 12 }), (values) => {
        const code = generateRecoveryCode(() => values).replace(/-/g, '');
        expect(code).toHaveLength(RECOVERY_CODE_LENGTH);
        expect([...code].every((c) => RECOVERY_CODE_ALPHABET.includes(c))).toBe(true);
        expect(code).not.toMatch(/[ILOU]/);
      }),
    );
  });

  it('refuse un hasard trop court', () => {
    expect(() => generateRecoveryCode(bytes([1, 2, 3]))).toThrow('Pas assez de hasard');
  });

  it('se relit tel quel une fois généré', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 12, maxLength: 12 }), (values) => {
        const code = generateRecoveryCode(() => values);
        const canonical = normalizeRecoveryCode(code);
        expect(canonical).not.toBeNull();
        expect(formatRecoveryCode(canonical ?? '')).toBe(code);
      }),
    );
  });

  it('accepte minuscules, espaces et tirets oubliés', () => {
    expect(normalizeRecoveryCode('k7qm 3xrp t9wd')).toBe('K7QM3XRPT9WD');
    expect(normalizeRecoveryCode('K7QM3XRPT9WD')).toBe('K7QM3XRPT9WD');
    expect(normalizeRecoveryCode(' K7QM–3XRP–T9WD ')).toBe('K7QM3XRPT9WD');
  });

  it('corrige les confusions O/0, I/1 et L/1', () => {
    expect(normalizeRecoveryCode('OOOO-IIII-LLLL')).toBe('000011111111');
  });

  it('refuse un code incomplet, trop long ou avec un caractère étranger', () => {
    expect(normalizeRecoveryCode('K7QM-3XRP-T9W')).toBeNull();
    expect(normalizeRecoveryCode('K7QM-3XRP-T9WDA')).toBeNull();
    expect(normalizeRecoveryCode('K7QM-3XRP-T9WU')).toBeNull();
    expect(normalizeRecoveryCode('K7QM-3XRP-T9W!')).toBeNull();
    expect(normalizeRecoveryCode('')).toBeNull();
  });
});
