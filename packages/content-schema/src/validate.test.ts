import { buildPack, clonePack } from './__fixtures__/pack';
import type { Exercise, Pack } from './schema';
import { audioTakes, listPackFiles, PACK_FILE, validatePack, verifyManifest } from './validate';

/** Renvoie l'exercice demandé, ou échoue clairement s'il n'existe pas. */
function exerciseAt(pack: Pack, lesson: number, index: number): Exercise {
  const exercise = pack.unit.lessons[lesson]?.exercises[index];
  if (exercise === undefined) throw new Error(`Exercice absent : ${lesson}/${index}`);
  return exercise;
}

function issueCodes(input: unknown): string[] {
  const result = validatePack(input);
  return result.ok ? [] : result.issues.map((i) => i.code);
}

describe('validatePack', () => {
  it('accepte un pack cohérent et renvoie les données typées', () => {
    const result = validatePack(buildPack());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pack.unit.lessons).toHaveLength(2);
  });

  it('refuse un format de pack que l’appli ne sait pas lire', () => {
    const result = validatePack({ ...buildPack(), formatVersion: 99 });
    expect(result).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: 'format_version', path: 'formatVersion' })],
    });
  });

  it('signale les erreurs de schéma avec leur emplacement', () => {
    const pack = clonePack(buildPack());
    const item = pack.items[0];
    if (item === undefined) throw new Error('fixture');
    item.fon = 'cafe\u0301';
    const result = validatePack(pack);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toMatchObject({ code: 'schema', path: 'items.0.fon' });
    }
  });

  it('refuse une entrée qui n’est pas un objet', () => {
    expect(issueCodes(null)).toContain('schema');
  });

  it('signale un identifiant d’élément en double', () => {
    const pack = clonePack(buildPack());
    const first = pack.items[0];
    if (first === undefined) throw new Error('fixture');
    pack.items.push({ ...first });
    expect(issueCodes(pack)).toContain('duplicate_id');
  });

  it('signale un identifiant d’exercice réutilisé dans deux leçons', () => {
    const pack = clonePack(buildPack());
    const story = exerciseAt(pack, 1, 0);
    story.id = 'e01';
    expect(issueCodes(pack)).toEqual(['duplicate_id']);
  });

  it('signale un audio référencé par un élément mais absent du pack', () => {
    const pack = clonePack(buildPack());
    const item = pack.items[1];
    if (item === undefined) throw new Error('fixture');
    item.audio = { normal: 'aud-inconnu' };
    const result = validatePack(pack);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({ code: 'missing_reference', path: 'items.1.audio.normal' }),
      ]);
    }
  });

  it('signale une illustration inconnue', () => {
    const pack = clonePack(buildPack());
    const item = pack.items[1];
    if (item === undefined) throw new Error('fixture');
    item.illustration = 'ill-inconnue';
    expect(issueCodes(pack)).toContain('missing_reference');
  });

  describe('choix d’images', () => {
    it('signale une bonne réponse absente des choix', () => {
      const pack = clonePack(buildPack());
      const exercise = exerciseAt(pack, 0, 0);
      if (exercise.type !== 'image_choice') throw new Error('fixture');
      exercise.answer = 'item-c';
      expect(issueCodes(pack)).toContain('invalid_answer');
    });

    it('signale un choix qui ne correspond à aucun élément', () => {
      const pack = clonePack(buildPack());
      const exercise = exerciseAt(pack, 0, 0);
      if (exercise.type !== 'image_choice') throw new Error('fixture');
      exercise.choices = ['item-a', 'item-z'];
      expect(issueCodes(pack)).toContain('missing_reference');
    });

    it('signale un élément proposé sans illustration', () => {
      const pack = clonePack(buildPack());
      const item = pack.items[1];
      if (item === undefined) throw new Error('fixture');
      delete item.illustration;
      expect(issueCodes(pack)).toContain('missing_illustration');
    });

    it('signale un choix proposé deux fois', () => {
      const pack = clonePack(buildPack());
      const exercise = exerciseAt(pack, 0, 0);
      if (exercise.type !== 'image_choice') throw new Error('fixture');
      exercise.choices = ['item-a', 'item-a'];
      expect(issueCodes(pack)).toContain('duplicate_id');
    });
  });

  it('signale un audio de phrase à construire inconnu', () => {
    const pack = clonePack(buildPack());
    const exercise = exerciseAt(pack, 0, 1);
    if (exercise.type !== 'build_sentence') throw new Error('fixture');
    exercise.audio = 'aud-z';
    expect(issueCodes(pack)).toContain('missing_reference');
  });

  it('signale deux paires avec le même mot fon', () => {
    const pack = clonePack(buildPack());
    const exercise = exerciseAt(pack, 0, 2);
    if (exercise.type !== 'match_pairs') throw new Error('fixture');
    exercise.pairs = [
      { fon: 'p1', fr: 'un' },
      { fon: 'p1', fr: 'deux' },
      { fon: 'p3', fr: 'trois' },
    ];
    expect(issueCodes(pack)).toContain('duplicate_id');
  });

  describe('histoire', () => {
    it('signale une réplique « audio seul » sans audio', () => {
      const pack = clonePack(buildPack());
      const story = exerciseAt(pack, 1, 0);
      if (story.type !== 'story') throw new Error('fixture');
      story.lines = [{ speaker: 'vendor', audioOnly: true }];
      expect(issueCodes(pack)).toContain('missing_audio');
    });

    it('signale une réplique sans texte fon quand elle n’est pas « audio seul »', () => {
      const pack = clonePack(buildPack());
      const story = exerciseAt(pack, 1, 0);
      if (story.type !== 'story') throw new Error('fixture');
      story.lines = [{ speaker: 'learner', fr: 'Bonjour' }];
      expect(issueCodes(pack)).toContain('missing_reference');
    });

    it.each([0, 2])('exige exactement une bonne réplique (trouvé %i)', (correctCount) => {
      const pack = clonePack(buildPack());
      const story = exerciseAt(pack, 1, 0);
      if (story.type !== 'story') throw new Error('fixture');
      story.question.choices = story.question.choices.map((c, i) => ({
        ...c,
        correct: i < correctCount,
      }));
      expect(issueCodes(pack)).toContain('story_answer');
    });
  });

  describe('prononciation', () => {
    it('signale un élément inconnu', () => {
      const pack = clonePack(buildPack());
      const exercise = exerciseAt(pack, 0, 3);
      if (exercise.type !== 'pronunciation') throw new Error('fixture');
      exercise.item = 'item-z';
      expect(issueCodes(pack)).toContain('missing_reference');
    });

    it('signale un élément sans audio de référence', () => {
      const pack = clonePack(buildPack());
      const exercise = exerciseAt(pack, 0, 3);
      if (exercise.type !== 'pronunciation') throw new Error('fixture');
      exercise.item = 'item-b';
      expect(issueCodes(pack)).toContain('missing_audio');
    });
  });

  it('signale un audio inconnu sur une carte de lettre du guide des sons', () => {
    const pack = clonePack(buildPack());
    pack.sounds = {
      letters: [{ symbol: 'x', exampleFon: 'xa', exampleFr: 'exemple', audio: 'aud-z' }],
      nasals: [],
      nasalExamples: [],
      tones: [],
    };
    expect(issueCodes(pack)).toEqual(['missing_reference']);
  });

  it('signale un audio inconnu sur une voyelle nasale', () => {
    const pack = clonePack(buildPack());
    pack.sounds = {
      letters: [],
      nasals: [{ symbol: 'an', audio: 'aud-z' }],
      nasalExamples: [],
      tones: [],
    };
    expect(issueCodes(pack)).toEqual(['missing_reference']);
  });

  it('signale un audio inconnu sur une paire', () => {
    const pack = clonePack(buildPack());
    const exercise = exerciseAt(pack, 0, 2);
    if (exercise.type !== 'match_pairs') throw new Error('fixture');
    exercise.pairs = exercise.pairs.map((p) => ({ ...p, audio: 'aud-z' }));
    expect(new Set(issueCodes(pack))).toEqual(new Set(['missing_reference']));
  });

  it('signale deux paires avec la même traduction', () => {
    const pack = clonePack(buildPack());
    const exercise = exerciseAt(pack, 0, 2);
    if (exercise.type !== 'match_pairs') throw new Error('fixture');
    exercise.pairs = [
      { fon: 'p1', fr: 'un' },
      { fon: 'p2', fr: 'un' },
      { fon: 'p3', fr: 'trois' },
    ];
    expect(issueCodes(pack)).toEqual(['duplicate_id']);
  });

  it('accepte un pack sans guide des sons', () => {
    const pack = clonePack(buildPack());
    delete pack.sounds;
    expect(validatePack(pack).ok).toBe(true);
  });

  describe('deux voix pour un même texte', () => {
    function withTakes(...extra: Pack['audios']): Pack {
      const pack = clonePack(buildPack());
      pack.audios.push(...extra);
      return pack;
    }

    it('accepte une prise par voix dans un groupe, à la même vitesse', () => {
      const pack = withTakes(
        {
          id: 'x-a',
          file: 'audio/x-a.m4a',
          voice: 'A',
          speed: 'normal',
          durationMs: 900,
          group: 'x',
        },
        {
          id: 'x-b',
          file: 'audio/x-b.m4a',
          voice: 'B',
          speed: 'normal',
          durationMs: 950,
          group: 'x',
        },
      );

      expect(validatePack(pack).ok).toBe(true);
    });

    it('signale deux prises de la même voix dans un groupe', () => {
      const pack = withTakes(
        {
          id: 'x-a',
          file: 'audio/x-a.m4a',
          voice: 'A',
          speed: 'normal',
          durationMs: 900,
          group: 'x',
        },
        {
          id: 'x-a2',
          file: 'audio/x-a2.m4a',
          voice: 'A',
          speed: 'normal',
          durationMs: 900,
          group: 'x',
        },
      );

      expect(issueCodes(pack)).toEqual(['audio_group']);
    });

    it('signale un groupe qui mélange vitesse normale et lente', () => {
      const pack = withTakes(
        {
          id: 'x-a',
          file: 'audio/x-a.m4a',
          voice: 'A',
          speed: 'normal',
          durationMs: 900,
          group: 'x',
        },
        {
          id: 'x-b',
          file: 'audio/x-b.m4a',
          voice: 'B',
          speed: 'slow',
          durationMs: 1400,
          group: 'x',
        },
      );

      expect(issueCodes(pack)).toEqual(['audio_group']);
    });
  });
});

describe('audioTakes', () => {
  it('donne à chaque prise d’un groupe toutes les voix du groupe, voix A d’abord', () => {
    const takes = audioTakes([
      {
        id: 'x-b',
        file: 'audio/x-b.m4a',
        voice: 'B',
        speed: 'normal',
        durationMs: 950,
        group: 'x',
      },
      {
        id: 'x-a',
        file: 'audio/x-a.m4a',
        voice: 'A',
        speed: 'normal',
        durationMs: 900,
        group: 'x',
      },
    ]);

    expect(takes.get('x-a')).toEqual(['x-a', 'x-b']);
    expect(takes.get('x-b')).toEqual(['x-a', 'x-b']);
  });

  it('laisse un audio sans groupe seul avec lui-même', () => {
    const takes = audioTakes(buildPack().audios);

    expect(takes.get('aud-a')).toEqual(['aud-a']);
  });
});

describe('verifyManifest', () => {
  const hashA = 'a'.repeat(64);
  const hashB = 'b'.repeat(64);
  const pack = buildPack();
  const manifest = {
    formatVersion: 1,
    packId: pack.id,
    version: pack.version,
    files: [
      { path: PACK_FILE, sha256: hashA, bytes: 100 },
      { path: 'audio/a.m4a', sha256: hashB, bytes: 10 },
      { path: 'audio/b.m4a', sha256: hashB, bytes: 10 },
    ],
  };
  const actual = new Map([
    [PACK_FILE, hashA],
    ['audio/a.m4a', hashB],
    ['audio/b.m4a', hashB],
  ]);

  it('liste le JSON du pack et chacun de ses audios', () => {
    expect(listPackFiles(pack)).toEqual([PACK_FILE, 'audio/a.m4a', 'audio/b.m4a']);
  });

  it('accepte un manifeste dont toutes les empreintes correspondent', () => {
    expect(verifyManifest(manifest, actual, pack).ok).toBe(true);
  });

  it('refuse un fichier dont l’empreinte a changé', () => {
    const tampered = new Map(actual).set('audio/a.m4a', hashA);
    const result = verifyManifest(manifest, tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.code)).toEqual(['hash_mismatch']);
  });

  it('refuse un fichier annoncé mais absent', () => {
    const missing = new Map(actual);
    missing.delete('audio/b.m4a');
    const result = verifyManifest(manifest, missing);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.code)).toEqual(['manifest_missing_file']);
  });

  it('refuse un manifeste d’un autre pack ou d’une autre version', () => {
    const result = verifyManifest({ ...manifest, version: 2 }, actual, pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.code)).toEqual(['manifest_mismatch']);
  });

  it('refuse un manifeste qui oublie un fichier du pack', () => {
    const partial = { ...manifest, files: manifest.files.slice(0, 2) };
    const result = verifyManifest(partial, actual, pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.code)).toEqual(['manifest_missing_file']);
  });

  it('refuse un format de manifeste non pris en charge', () => {
    const result = verifyManifest({ ...manifest, formatVersion: 7 }, actual);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.code)).toEqual(['format_version']);
  });

  it('refuse un manifeste mal formé', () => {
    const result = verifyManifest({ files: [] }, actual);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.every((i) => i.code === 'schema')).toBe(true);
  });
});
