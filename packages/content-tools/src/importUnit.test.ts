import { validatePack } from '@gbe/content-schema';

import { DRAWINGS, filledWorkbook, setCell, templateWorkbook } from './__fixtures__/workbook';
import { importUnit } from './importUnit';
import { COLUMNS, SHEETS, UNIT_FIELDS } from './workbook';

const importFilled = (workbook = filledWorkbook()) => importUnit({ workbook, drawings: DRAWINGS });

function expectPack(result: ReturnType<typeof importUnit>) {
  if (!result.ok) throw new Error(JSON.stringify(result.issues, null, 2));
  return result;
}

describe('import du classeur des experts', () => {
  it('transforme un classeur rempli en pack valide', () => {
    // Agir
    const { pack } = expectPack(importFilled());

    // Vérifier
    expect(validatePack(pack).ok).toBe(true);
    expect(pack).toMatchObject({ id: 'u09-essai', version: 1, validated: false });
    expect(pack.unit).toMatchObject({ id: 'u09', order: 9, title: 'Essai' });
    expect(pack.unit.lessons.map((lesson) => lesson.id)).toEqual([
      'u09-l01',
      'u09-l02',
      'u09-l03',
      'u09-l04',
      'u09-histoire',
    ]);
    expect(pack.items).toHaveLength(12);
    expect(pack.illustrations.map((drawing) => drawing.id)).toEqual([
      'ill-pomme',
      'ill-poire',
      'ill-pain',
    ]);
  });

  it('présente chaque mot illustré avec « choisir l’image », les autres en paires, puis révise', () => {
    const { pack } = expectPack(importFilled());

    const lesson = pack.unit.lessons[0];

    expect(lesson?.exercises.map((exercise) => exercise.type)).toEqual([
      'image_choice',
      'image_choice',
      'image_choice',
      'match_pairs',
      'match_pairs',
    ]);
    // Le mot sans image, complété par deux mots de la leçon pour former trois paires.
    expect(lesson?.exercises[3]).toMatchObject({
      tag: { kind: 'new', labelFr: 'Nouveaux mots' },
      pairs: [{ fr: 'sel' }, { fr: 'pomme' }, { fr: 'poire' }],
    });
    const choice = lesson?.exercises[0];
    if (choice?.type !== 'image_choice') throw new Error('image attendue');
    expect(choice.choices).toHaveLength(3);
    expect(choice.choices).toContain(choice.answer);
    expect(lesson?.summaryFr).toBe('Tu nommes quatre objets.');
    const review = lesson?.exercises.at(-1);
    expect(review).toMatchObject({
      tag: { kind: 'review', labelFr: 'Révision · les objets' },
      noteFr: 'Tu nommes quatre objets.',
    });
  });

  it('présente les mots sans image en paires de trois à quatre', () => {
    const { pack } = expectPack(importFilled());

    const lesson = pack.unit.lessons[1];
    const newPairs = lesson?.exercises.filter((exercise) => exercise.tag?.kind === 'new') ?? [];

    expect(newPairs.length).toBe(2);
    for (const exercise of newPairs) {
      if (exercise.type !== 'match_pairs') throw new Error('paires attendues');
      expect(exercise.pairs.length).toBeGreaterThanOrEqual(3);
      expect(exercise.pairs.length).toBeLessThanOrEqual(4);
    }
  });

  it('fait reconstruire chaque phrase, sans leurre identique à une tuile de la réponse', () => {
    const { pack } = expectPack(importFilled());

    const builds = pack.unit.lessons[2]?.exercises.filter((e) => e.type === 'build_sentence') ?? [];

    expect(builds).toHaveLength(3);
    for (const exercise of builds) {
      if (exercise.type !== 'build_sentence') continue;
      expect(exercise.solution).toHaveLength(3);
      expect(exercise.distractors).toHaveLength(3);
      for (const decoy of exercise.distractors) {
        expect(exercise.solution.map((tile) => tile.toLowerCase())).not.toContain(
          decoy.toLowerCase(),
        );
      }
    }
    expect(builds[1]).toMatchObject({
      sentenceFr: 'J’en veux deux.',
      solution: ['Ma', 'wè', 'mé'],
      answerFon: 'Ma wè mé.',
      noteFr: 'Pratique au marché.',
    });
  });

  it('construit la leçon de révision avec les seuls éléments des leçons précédentes', () => {
    const { pack } = expectPack(importFilled());

    const review = pack.unit.lessons[3];

    expect(review?.exercises.map((exercise) => exercise.type)).toEqual([
      'match_pairs',
      'build_sentence',
      'build_sentence',
      'image_choice',
      'match_pairs',
    ]);
    expect(review?.exercises.every((exercise) => exercise.tag?.kind === 'review')).toBe(true);
  });

  it('construit l’histoire : voix B pour la vendeuse, réplique à écouter sans texte', () => {
    const { pack, recordings } = expectPack(importFilled());

    const story = pack.unit.lessons[4]?.exercises[0];

    if (story?.type !== 'story') throw new Error('histoire attendue');
    expect(story.title).toBe('Acheter des poires');
    expect(story.lines[0]).toMatchObject({
      speaker: 'vendor',
      fon: 'Lo lé !',
      audio: 'histoire-1',
    });
    expect(story.lines[2]).toEqual({
      speaker: 'vendor',
      audio: 'histoire-3',
      audioOnly: true,
      hintFr: 'Écoute le prix.',
    });
    expect(recordings.find((r) => r.file === 'audio/histoire-3.m4a')).toMatchObject({
      voice: 'B',
      fon: 'Sa sé sò.',
    });
    expect(story.question.choices[1]).toEqual({
      fon: 'Da dé dò',
      correct: true,
      explanation: [{ fon: 'Da dé dò' }, { fr: ' : « c’est trop cher ».' }],
    });
  });

  it('liste un enregistrement normal et un lent par mot et par phrase, plus les répliques', () => {
    const { pack, recordings } = expectPack(importFilled());

    expect(recordings).toHaveLength(12 * 2 + 3);
    expect(pack.audios.map((audio) => audio.file)).toEqual(recordings.map((r) => r.file));
    expect(recordings[0]).toEqual({
      file: 'audio/pomme-n.m4a',
      voice: 'A',
      speed: 'normal',
      fon: 'pa',
      fr: 'pomme',
    });
    expect(recordings[1]).toMatchObject({ file: 'audio/pomme-l.m4a', speed: 'slow' });
  });

  it('reprend les durées mesurées des enregistrements existants', () => {
    const result = importUnit({
      workbook: filledWorkbook(),
      drawings: DRAWINGS,
      durations: new Map([['pomme-n', 1234]]),
    });

    const { pack } = expectPack(result);
    expect(pack.audios.find((audio) => audio.id === 'pomme-n')?.durationMs).toBe(1234);
  });

  it('produit exactement le même pack à chaque import', () => {
    expect(importFilled()).toEqual(importFilled());
  });

  it('marque le pack validé quand les experts ont écrit « oui »', () => {
    const workbook = filledWorkbook();
    setCell(workbook, SHEETS.unit, 6, 'Valeur', 'Oui');

    const { pack } = expectPack(importFilled(workbook));

    expect(pack.validated).toBe(true);
  });

  it('normalise le fon en NFC à la lecture', () => {
    const workbook = filledWorkbook();
    setCell(workbook, SHEETS.words, 1, COLUMNS.words.fon, 'pé');

    const { pack } = expectPack(importFilled(workbook));

    expect(pack.items[0]?.fon).toBe('pé');
  });

  it('accepte un découpage en tuiles écrit par les experts', () => {
    const workbook = filledWorkbook();
    setCell(workbook, SHEETS.sentences, 1, COLUMNS.sentences.tiles, 'Ta tè / tò');

    const { pack } = expectPack(importFilled(workbook));

    const build = pack.unit.lessons[2]?.exercises.find((e) => e.id === 'u09-l03-e01');
    expect(build).toMatchObject({ solution: ['Ta tè', 'tò'], distractors: expect.any(Array) });
  });
});

describe('problèmes signalés aux experts', () => {
  const issuesOf = (result: ReturnType<typeof importUnit>) => (result.ok ? [] : result.issues);

  it('signale chaque fon à remplir, avec sa feuille et sa ligne', () => {
    const issues = issuesOf(importUnit({ workbook: templateWorkbook(), drawings: DRAWINGS }));

    expect(issues).toContainEqual({ sheet: 'Mots', row: 2, message: 'Fon à remplir.' });
    expect(issues).toContainEqual({ sheet: 'Phrases', row: 4, message: 'Fon à remplir.' });
    expect(issues).toContainEqual({ sheet: 'Histoire', row: 2, message: 'Fon à remplir.' });
    expect(issues).toContainEqual({ sheet: 'Choix', row: 3, message: 'Fon à remplir.' });
  });

  it('refuse des tuiles qui ne redonnent pas la phrase', () => {
    const workbook = filledWorkbook();
    setCell(workbook, SHEETS.sentences, 2, COLUMNS.sentences.tiles, 'Ma / mé');

    expect(issuesOf(importFilled(workbook))).toEqual([
      {
        sheet: 'Phrases',
        row: 3,
        message: 'Les tuiles, mises bout à bout, ne redonnent pas la phrase fon.',
      },
    ]);
  });

  it('signale le dessin manquant d’un mot illustré', () => {
    const drawings = new Map(DRAWINGS);
    drawings.delete('pain');

    const issues = issuesOf(importUnit({ workbook: filledWorkbook(), drawings }));

    expect(issues).toEqual([
      { sheet: 'Mots', row: 4, message: 'Dessin manquant : illustrations/pain.svg.' },
    ]);
  });

  it('refuse un mot rangé dans une leçon de révision', () => {
    const workbook = filledWorkbook();
    setCell(workbook, SHEETS.words, 5, COLUMNS.words.lesson, 'l04');

    const issues = issuesOf(importFilled(workbook));

    expect(issues[0]).toMatchObject({ sheet: 'Mots', row: 6 });
    expect(issues[0]?.message).toContain('révision');
  });

  it('signale une réf en double, une leçon inconnue et une réponse oui/non illisible', () => {
    const workbook = filledWorkbook();
    setCell(workbook, SHEETS.words, 2, COLUMNS.words.ref, 'pomme');
    setCell(workbook, SHEETS.words, 3, COLUMNS.words.lesson, 'l99');
    setCell(workbook, SHEETS.words, 4, COLUMNS.words.image, 'peut-être');

    const messages = issuesOf(importFilled(workbook)).map((issue) => issue.message);

    expect(messages).toEqual(
      expect.arrayContaining([
        'Réf « pomme » déjà utilisée.',
        'Leçon inconnue : « l99 ».',
        'Image : répondre oui ou non (« peut-être »).',
      ]),
    );
  });

  it('signale une feuille ou une colonne absente', () => {
    const workbook = filledWorkbook();
    delete workbook[SHEETS.question];
    (workbook[SHEETS.words]?.[0] ?? [])[3] = 'Fon';

    const issues = issuesOf(importFilled(workbook));

    expect(issues).toEqual(
      expect.arrayContaining([
        { sheet: 'Mots', message: `Colonne absente : « ${COLUMNS.words.fon} ».` },
        { sheet: 'Question', message: 'Feuille absente du classeur.' },
      ]),
    );
  });

  it('vérifie la fiche de l’unité', () => {
    const workbook = filledWorkbook();
    setCell(workbook, SHEETS.unit, 1, 'Valeur', 'Unité 9');
    setCell(workbook, SHEETS.unit, 3, 'Valeur', 'neuf');
    setCell(workbook, SHEETS.unit, 4, 'Valeur', '');
    setCell(workbook, SHEETS.unit, 6, 'Valeur', 'bientôt');

    const messages = issuesOf(importFilled(workbook)).map((issue) => issue.message);

    expect(messages).toEqual(
      expect.arrayContaining([
        "Identifiant de l'unité invalide : « Unité 9 » (a-z, 0-9, - et _).",
        'Ordre invalide : « neuf » (un nombre entier, 1 ou plus).',
        `« ${UNIT_FIELDS.title} » est vide.`,
        `« ${UNIT_FIELDS.validated} » : répondre oui ou non.`,
      ]),
    );
  });

  it('vérifie l’histoire et ses réponses possibles', () => {
    const workbook = filledWorkbook();
    setCell(workbook, SHEETS.story, 1, COLUMNS.story.speaker, 'le chef');
    setCell(workbook, SHEETS.story, 2, COLUMNS.story.order, '1');
    setCell(workbook, SHEETS.choices, 2, COLUMNS.choices.correct, 'non');
    setCell(workbook, SHEETS.choices, 1, COLUMNS.choices.explanation, '[Na nè : oubli');

    const messages = issuesOf(importFilled(workbook)).map((issue) => issue.message);

    expect(messages).toEqual(
      expect.arrayContaining([
        'Qui parle : « vendeuse » ou « apprenant » (« le chef »).',
        'Ordre 1 utilisé deux fois.',
        'Aucune bonne réponse.',
        'Explication : un crochet [ ] n’est pas refermé.',
      ]),
    );
  });

  it('signale une leçon sans assez d’éléments pour un exercice', () => {
    const workbook = filledWorkbook();
    const lessons = workbook[SHEETS.lessons] ?? [];
    lessons.splice(4, 0, ['l05', 'leçon', 'Vide', '']);

    const issues = issuesOf(importFilled(workbook));

    expect(issues).toEqual([
      {
        sheet: 'Leçons',
        row: 5,
        message: 'Leçon « l05 » sans exercice : ajoutez des mots ou des phrases (trois au moins).',
      },
    ]);
  });
});
