import { isUniqueViolation, recoveryKeyOf } from './recovery-key';

describe('empreinte du code de récupération', () => {
  it('est la même pour le même code et le même secret', () => {
    expect(recoveryKeyOf('secret-a', 'K7QM3XRPT9WD')).toBe(
      recoveryKeyOf('secret-a', 'K7QM3XRPT9WD'),
    );
  });

  it('change avec le code ou avec le secret du serveur', () => {
    const key = recoveryKeyOf('secret-a', 'K7QM3XRPT9WD');
    expect(recoveryKeyOf('secret-a', 'K7QM3XRPT9WB')).not.toBe(key);
    expect(recoveryKeyOf('secret-b', 'K7QM3XRPT9WD')).not.toBe(key);
  });
});

describe('violation d’unicité', () => {
  it('se reconnaît directe ou enveloppée', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(
      isUniqueViolation(Object.assign(new Error('requête'), { cause: { code: '23505' } })),
    ).toBe(true);
  });

  it('ne confond pas les autres erreurs', () => {
    expect(isUniqueViolation(new Error('autre'))).toBe(false);
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
