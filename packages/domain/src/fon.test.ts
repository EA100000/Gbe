import fc from 'fast-check';

import { fonEquals, normalizeFon, stripTonesForSearch } from './fon';

/** Générateur de textes « à la fon » : lettres propres, voyelles, tons combinants, espaces. */
const fonLike = fc
  .array(
    fc.constantFrom(
      'a',
      'e',
      'i',
      'o',
      'u',
      'ɛ',
      'ɔ',
      'ɖ',
      'Ɛ',
      'Ɔ',
      'Ɖ',
      'g',
      'b',
      'k',
      'p',
      'n',
      'x',
      'w',
      '\u0300',
      '\u0301',
      '\u0302',
      '\u030c',
      '\u00e9',
      '\u00e8',
      '\u01ce',
      ' ',
      '  ',
      '\t',
    ),
    { maxLength: 40 },
  )
  .map((parts) => parts.join(''));

const TONE = /[\u0300\u0301\u0302\u0304\u030c]/;

describe('normalizeFon', () => {
  it('rend la même forme pour un ton combiné et un ton précomposé', () => {
    // Préparer : « é » en un seul caractère, puis « e » + accent combinant
    const precomposed = 'z\u00e9';
    const combined = 'ze\u0301';
    // Agir et vérifier
    expect(normalizeFon(combined)).toBe(normalizeFon(precomposed));
  });

  it('réduit les espaces multiples et retire les espaces en bordure', () => {
    expect(normalizeFon('  a   b \t c ')).toBe('a b c');
  });

  it('conserve les lettres ɖ, ɛ et ɔ', () => {
    expect(normalizeFon('ɖɛɔ')).toBe('ɖɛɔ');
  });

  it('normaliser deux fois donne le même résultat qu’une fois (propriété)', () => {
    fc.assert(
      fc.property(fc.oneof(fonLike, fc.string({ unit: 'binary' })), (text) => {
        expect(normalizeFon(normalizeFon(text))).toBe(normalizeFon(text));
      }),
    );
  });

  it('produit toujours un texte NFC (propriété)', () => {
    fc.assert(
      fc.property(fonLike, (text) => {
        const result = normalizeFon(text);
        expect(result).toBe(result.normalize('NFC'));
      }),
    );
  });
});

describe('fonEquals', () => {
  it('distingue deux mots qui ne diffèrent que par le ton', () => {
    expect(fonEquals('z\u00e1', 'z\u00e0')).toBe(false);
  });

  it('accepte deux encodages différents du même mot', () => {
    expect(fonEquals('z\u025b\u0301', 'z\u025b\u0301'.normalize('NFD'))).toBe(true);
  });
});

describe('stripTonesForSearch', () => {
  it('retire les tons et met en minuscules', () => {
    expect(stripTonesForSearch('Zì zí  zǎ')).toBe('zi zi za');
  });

  it('conserve ɖ, ɛ et ɔ, y compris quand ils portent un ton', () => {
    expect(stripTonesForSearch('Ɖɛ\u0301ɔ\u0300')).toBe('ɖɛɔ');
  });

  it('ne laisse aucun ton, même après décomposition (propriété)', () => {
    fc.assert(
      fc.property(fonLike, (text) => {
        expect(TONE.test(stripTonesForSearch(text).normalize('NFD'))).toBe(false);
      }),
    );
  });

  it('est idempotente (propriété)', () => {
    fc.assert(
      fc.property(fonLike, (text) => {
        const once = stripTonesForSearch(text);
        expect(stripTonesForSearch(once)).toBe(once);
      }),
    );
  });

  it('garde autant de lettres ɖ, ɛ et ɔ que le texte d’origine (propriété)', () => {
    const count = (s: string) => [...s].filter((c) => 'ɖɛɔ'.includes(c)).length;
    fc.assert(
      fc.property(fonLike, (text) => {
        expect(count(stripTonesForSearch(text))).toBe(count(text.normalize('NFD').toLowerCase()));
      }),
    );
  });
});
