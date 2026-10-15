import {
  cellText,
  estimateDurationMs,
  headerKey,
  lowerFirst,
  parseRichText,
  parseTiles,
  parseYesNo,
  splitTiles,
  stableShuffle,
  tilesMatchSentence,
} from './text';

describe('texte des cellules', () => {
  it('rend une chaîne nette en NFC, quel que soit le type de la cellule', () => {
    expect(cellText('  é  te  ')).toBe('é te');
    expect(cellText(12)).toBe('12');
    expect(cellText(null)).toBe('');
    expect(cellText(undefined)).toBe('');
    expect(cellText(new Date('2026-10-15T00:00:00Z'))).toBe('2026-10-15');
  });

  it('compare les titres sans tenir compte de la casse ni du type d’apostrophe', () => {
    expect(headerKey('Mode d’emploi')).toBe(headerKey("MODE D'EMPLOI"));
  });

  it('comprend oui et non sous plusieurs formes', () => {
    expect(['oui', 'Oui', 'x', '1', true].map(parseYesNo)).toEqual([true, true, true, true, true]);
    expect(['non', 'N', '', '0', false].map(parseYesNo)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(parseYesNo('peut-être')).toBeNull();
  });
});

describe('tuiles', () => {
  it('découpe une phrase en mots, sans la ponctuation, en gardant les apostrophes', () => {
    expect(splitTiles('Ta v’axi tò ?')).toEqual(['Ta', 'v’axi', 'tò']);
    expect(splitTiles('« Lo, lé ! »')).toEqual(['Lo', 'lé']);
  });

  it('lit un découpage écrit avec des barres obliques', () => {
    expect(parseTiles(' Ta tè / tò ? / ')).toEqual(['Ta tè', 'tò']);
  });

  it('vérifie que les tuiles redonnent la phrase', () => {
    expect(tilesMatchSentence('Ta tè tò ?', ['Ta tè', 'tò'])).toBe(true);
    expect(tilesMatchSentence('Ta tè tò ?', ['Ta', 'tò'])).toBe(false);
  });
});

describe('texte mixte des explications', () => {
  it('sépare les mots fon entre crochets du français', () => {
    expect(parseRichText('[Na nè], c’est « merci ».')).toEqual([
      { fon: 'Na nè' },
      { fr: ', c’est « merci ».' },
    ]);
    expect(parseRichText('On dit [na] ou [nè].')).toEqual([
      { fr: 'On dit ' },
      { fon: 'na' },
      { fr: ' ou ' },
      { fon: 'nè' },
      { fr: '.' },
    ]);
  });

  it('refuse un crochet mal fermé ou vide', () => {
    expect(parseRichText('[Na nè')).toBeNull();
    expect(parseRichText('Na] nè')).toBeNull();
    expect(parseRichText('[] vide')).toBeNull();
    expect(parseRichText('[a [b]]')).toBeNull();
    expect(parseRichText('')).toBeNull();
  });
});

describe('durée estimée des enregistrements', () => {
  it('compte 600 ms au moins, davantage pour une phrase, et plus en vitesse lente', () => {
    expect(estimateDurationMs('pa', 'normal')).toBe(600);
    expect(estimateDurationMs('Ta tè tò mi wa ka ?', 'normal')).toBeGreaterThan(600);
    expect(estimateDurationMs('pa', 'slow')).toBe(900);
    expect(estimateDurationMs('a'.repeat(500), 'normal')).toBe(8000);
  });
});

describe('mélange déterministe', () => {
  it('donne toujours le même ordre pour la même graine, et garde tous les éléments', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];

    const first = stableShuffle(items, (x) => x, 'graine');

    expect(stableShuffle(items, (x) => x, 'graine')).toEqual(first);
    expect([...first].sort()).toEqual(items);
  });
});

it('met la première lettre en minuscule', () => {
  expect(lowerFirst('De six à dix')).toBe('de six à dix');
  expect(lowerFirst('')).toBe('');
});
