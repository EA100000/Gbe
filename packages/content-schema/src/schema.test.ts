import { buildPack } from './__fixtures__/pack';
import {
  AudioSchema,
  ExerciseSchema,
  FonTextSchema,
  IdSchema,
  IllustrationSchema,
  ManifestSchema,
  PackSchema,
  RichTextSchema,
} from './schema';

describe('IdSchema', () => {
  it('accepte un identifiant en minuscules avec tirets et soulignés', () => {
    expect(IdSchema.safeParse('u01_lecon-2').success).toBe(true);
  });

  it.each(['', 'Majuscule', '-commence-par-tiret', 'espace interdit', 'accent-é'])(
    'refuse « %s »',
    (value) => {
      expect(IdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('FonTextSchema', () => {
  it('accepte un texte déjà normalisé en NFC', () => {
    // Préparer : « é » précomposé (U+00E9)
    const nfc = 'café';
    // Agir
    const result = FonTextSchema.safeParse(nfc);
    // Vérifier
    expect(result.success).toBe(true);
  });

  it('refuse un texte décomposé (NFD) qui paraîtrait identique à l’écran', () => {
    const nfd = 'cafe\u0301';
    const result = FonTextSchema.safeParse(nfd);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Texte fon non normalisé en NFC');
  });

  it('retire les espaces en bordure puis refuse un texte vide', () => {
    expect(FonTextSchema.parse('  mot  ')).toBe('mot');
    expect(FonTextSchema.safeParse('   ').success).toBe(false);
  });
});

describe('AudioSchema', () => {
  const valid = { id: 'a1', file: 'audio/a1.m4a', voice: 'A', speed: 'normal', durationMs: 800 };

  it('accepte un audio m4a rangé dans audio/', () => {
    expect(AudioSchema.safeParse(valid).success).toBe(true);
  });

  it('refuse un fichier hors du dossier audio ou dans un autre format', () => {
    expect(AudioSchema.safeParse({ ...valid, file: '../a1.m4a' }).success).toBe(false);
    expect(AudioSchema.safeParse({ ...valid, file: 'audio/a1.mp3' }).success).toBe(false);
  });

  it('refuse une voix inconnue ou une durée nulle', () => {
    expect(AudioSchema.safeParse({ ...valid, voice: 'C' }).success).toBe(false);
    expect(AudioSchema.safeParse({ ...valid, durationMs: 0 }).success).toBe(false);
  });
});

describe('IllustrationSchema', () => {
  it('refuse une illustration qui contient un script', () => {
    const result = IllustrationSchema.safeParse({
      id: 'ill',
      svg: '<svg><script>alert(1)</script></svg>',
    });
    expect(result.success).toBe(false);
  });

  it('refuse un contenu qui n’est pas du SVG', () => {
    expect(IllustrationSchema.safeParse({ id: 'ill', svg: '<div></div>' }).success).toBe(false);
  });

  it('refuse une illustration trop lourde', () => {
    const svg = `<svg>${'x'.repeat(20_001)}</svg>`;
    expect(IllustrationSchema.safeParse({ id: 'ill', svg }).success).toBe(false);
  });
});

describe('ExerciseSchema', () => {
  it('refuse un type d’exercice inconnu', () => {
    const result = ExerciseSchema.safeParse({ id: 'e', type: 'dictation', promptFr: 'x' });
    expect(result.success).toBe(false);
  });

  it('refuse un choix d’images avec un seul choix', () => {
    const result = ExerciseSchema.safeParse({
      id: 'e',
      type: 'image_choice',
      promptFr: 'Choisis',
      choices: ['a'],
      answer: 'a',
    });
    expect(result.success).toBe(false);
  });

  it('refuse des paires à associer au-delà de six', () => {
    const pairs = Array.from({ length: 7 }, (_, i) => ({ fon: `f${i}`, fr: `fr${i}` }));
    const result = ExerciseSchema.safeParse({
      id: 'e',
      type: 'match_pairs',
      promptFr: 'Associe',
      pairs,
    });
    expect(result.success).toBe(false);
  });
});

describe('RichTextSchema', () => {
  it('accepte une suite de morceaux en français et en fon', () => {
    const result = RichTextSchema.safeParse([{ fon: 'mot' }, { fr: ' veut dire « test »' }]);
    expect(result.success).toBe(true);
  });

  it('refuse un morceau en fon non normalisé en NFC', () => {
    expect(RichTextSchema.safeParse([{ fon: 'cafe\u0301' }]).success).toBe(false);
  });

  it('refuse un morceau qui mélange les deux langues', () => {
    expect(RichTextSchema.safeParse([{ fon: 'mot', fr: 'mot' }]).success).toBe(false);
  });

  it('refuse un texte vide', () => {
    expect(RichTextSchema.safeParse([]).success).toBe(false);
  });
});

describe('PackSchema', () => {
  it('accepte le pack de référence des tests', () => {
    expect(PackSchema.safeParse(buildPack()).success).toBe(true);
  });

  it('refuse un pack sans leçon', () => {
    const pack = buildPack();
    const result = PackSchema.safeParse({ ...pack, unit: { ...pack.unit, lessons: [] } });
    expect(result.success).toBe(false);
  });
});

describe('ManifestSchema', () => {
  it('refuse une empreinte qui n’est pas un SHA-256 hexadécimal', () => {
    const result = ManifestSchema.safeParse({
      formatVersion: 1,
      packId: 'p',
      version: 1,
      files: [{ path: 'pack.json', sha256: 'abc', bytes: 10 }],
    });
    expect(result.success).toBe(false);
  });
});
