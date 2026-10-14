import { generatePseudo, isValidPseudo, PSEUDO_ADJECTIVES, PSEUDO_NOUNS } from './pseudo';
import { createRng } from './random';

describe('pseudos de la Ligue', () => {
  it('tire un nom suivi d’un adjectif, toujours le même pour la même graine', () => {
    // Préparer
    const seed = 42;
    // Agir
    const a = generatePseudo(createRng(seed));
    const b = generatePseudo(createRng(seed));
    // Vérifier
    expect(a).toBe(b);
    expect(isValidPseudo(a)).toBe(true);
  });

  it('change de pseudo quand on en demande un autre', () => {
    const rng = createRng(1);
    const first = generatePseudo(rng);
    for (let i = 0; i < 50; i += 1) expect(generatePseudo(rng, first)).not.toBe(first);
  });

  it('refuse tout texte qui ne vient pas des listes', () => {
    expect(isValidPseudo('Lion sage')).toBe(true);
    expect(isValidPseudo('Lion  sage')).toBe(false);
    expect(isValidPseudo('Admin')).toBe(false);
    expect(isValidPseudo('')).toBe(false);
    expect(isValidPseudo(42)).toBe(false);
  });

  it('accepte un pseudo accentué écrit en forme décomposée', () => {
    expect(isValidPseudo('E\u0301toile sage')).toBe(true);
  });

  it('propose assez de combinaisons, toutes courtes', () => {
    expect(PSEUDO_NOUNS.length * PSEUDO_ADJECTIVES.length).toBeGreaterThanOrEqual(200);
    const longest = Math.max(...PSEUDO_NOUNS.map((n) => n.length)) + 1;
    expect(longest + Math.max(...PSEUDO_ADJECTIVES.map((a) => a.length))).toBeLessThanOrEqual(24);
  });
});
