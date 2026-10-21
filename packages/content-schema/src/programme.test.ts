import { validateProgramme } from './programme';

const unit = (id: string, order: number) => ({
  id,
  order,
  title: `Titre ${order}`,
  subtitle: `Sous-titre ${order}`,
});

describe('validateProgramme', () => {
  it('accepte un programme valide et range les unités dans l’ordre', () => {
    const result = validateProgramme({ formatVersion: 1, units: [unit('u03', 3), unit('u02', 2)] });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.programme.units.map((u) => u.id)).toEqual(['u02', 'u03']);
  });

  it('refuse une unité présente deux fois', () => {
    const result = validateProgramme({ formatVersion: 1, units: [unit('u02', 2), unit('u02', 3)] });

    expect(result).toEqual({ ok: false, issues: [expect.stringMatching(/deux fois/)] });
  });

  it('refuse deux unités au même ordre', () => {
    const result = validateProgramme({ formatVersion: 1, units: [unit('u02', 2), unit('u03', 2)] });

    expect(result).toEqual({ ok: false, issues: [expect.stringMatching(/même ordre/)] });
  });

  it('refuse un titre vide ou un champ inconnu, avec son emplacement', () => {
    const result = validateProgramme({
      formatVersion: 1,
      units: [{ ...unit('u02', 2), title: ' ', fon: 'x' }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join('\n')).toMatch(/units\.0/);
  });

  it('refuse un format inconnu', () => {
    expect(validateProgramme({ formatVersion: 2, units: [] }).ok).toBe(false);
  });
});
