import {
  type Audio,
  IdSchema,
  type Illustration,
  type LexiconItem,
  type Lesson,
  type Pack,
  type RichText,
  type StoryExercise,
  type StoryLine,
  validatePack,
} from '@gbe/content-schema';

import { type Entry, type LessonRef, reviewLesson, standardLesson } from './exercises';
import {
  estimateDurationMs,
  headerKey,
  parseRichText,
  parseTiles,
  parseYesNo,
  splitTiles,
  tilesMatchSentence,
} from './text';
import {
  COLUMNS,
  QUESTION_FIELDS,
  readFields,
  readTable,
  SHEETS,
  type SheetId,
  UNIT_FIELDS,
  type Workbook,
  findSheet,
} from './workbook';

export interface ImportOptions {
  workbook: Workbook;
  /** Dessins disponibles : réf du mot → contenu du fichier `illustrations/<réf>.svg`. */
  drawings: ReadonlyMap<string, string>;
  /** Durées mesurées des enregistrements déjà présents, par identifiant d'audio. */
  durations?: ReadonlyMap<string, number>;
  /** Version du pack produit (l'outil en ligne de commande l'augmente si le contenu change). */
  version?: number;
}

/** Problème à corriger dans le classeur, avec sa feuille et sa ligne. */
export interface ImportIssue {
  sheet: string;
  row?: number;
  message: string;
}

/** Un fichier audio à enregistrer, avec le texte à lire. */
export interface Recording {
  file: string;
  voice: Audio['voice'];
  speed: Audio['speed'];
  fon: string;
  fr: string;
}

export type ImportResult =
  { ok: true; pack: Pack; recordings: Recording[] } | { ok: false; issues: ImportIssue[] };

type LessonType = 'standard' | 'review' | 'story';

const LESSON_TYPES: Record<string, LessonType> = {
  leçon: 'standard',
  lecon: 'standard',
  révision: 'review',
  revision: 'review',
  histoire: 'story',
};

const SPEAKERS: Record<string, StoryLine['speaker']> = {
  vendeuse: 'vendor',
  vendeur: 'vendor',
  apprenant: 'learner',
  apprenante: 'learner',
};

/** Les deux voix des experts (ADR 0016) : A, la voix d'homme ; B, la voix de femme. */
export const VOICE_NAMES: Record<Audio['voice'], string> = { A: 'homme', B: 'femme' };

/** Dans l'histoire, chaque personnage garde sa voix : l'apprenant, l'homme ; la vendeuse, la femme. */
const VOICE_OF: Record<StoryLine['speaker'], Audio['voice']> = { learner: 'A', vendor: 'B' };

const SPEED_SUFFIX: Record<Audio['speed'], string> = { normal: 'n', slow: 'l' };

/** Identifiant d'une prise : `<réf>-<voix>-<vitesse>`, par exemple `pomme-b-l`. */
const takeId = (ref: string, voice: Audio['voice'], speed: Audio['speed']) =>
  `${ref}-${voice.toLowerCase()}-${SPEED_SUFFIX[speed]}`;

type AddAudio = (
  id: string,
  voice: Audio['voice'],
  speed: Audio['speed'],
  fon: string,
  fr: string,
  group?: string,
) => void;

interface PlannedLesson extends LessonRef {
  type: LessonType;
  row: number;
}

interface PlannedLine {
  row: number;
  order: number;
  speaker: StoryLine['speaker'];
  fon: string;
  fr: string;
  audioOnly: boolean;
  hint: string;
}

const isId = (value: string) => IdSchema.safeParse(value).success;

/**
 * Transforme le classeur d'une unité en pack prêt à valider : lexique, audios à enregistrer,
 * dessins, leçons et exercices (générés de façon déterministe, voir ADR 0014).
 * Ne lit ni n'écrit aucun fichier : l'outil en ligne de commande s'en charge.
 */
export function importUnit(options: ImportOptions): ImportResult {
  const { workbook, drawings, durations = new Map<string, number>(), version = 1 } = options;
  const issues: ImportIssue[] = [];
  const report = (sheet: SheetId, message: string, row?: number) => {
    issues.push({ sheet: SHEETS[sheet], ...(row === undefined ? {} : { row }), message });
  };
  const sheet = (id: SheetId) => {
    const rows = findSheet(workbook, SHEETS[id]);
    if (rows === undefined) report(id, 'Feuille absente du classeur.');
    return rows ?? [];
  };
  const table = <K extends string>(
    id: SheetId,
    columns: Readonly<Record<K, string>>,
    optional: readonly NoInfer<K>[],
  ) => {
    const result = readTable(sheet(id), columns, optional);
    if (!result.ok) {
      for (const column of result.missingColumns) report(id, `Colonne absente : « ${column} ».`);
      return [];
    }
    return result.rows;
  };

  // Unité
  const unitSheet = readFields(sheet('unit'), UNIT_FIELDS);
  const unit = unitSheet.values;
  for (const key of Object.keys(UNIT_FIELDS) as (keyof typeof UNIT_FIELDS)[]) {
    if (unit[key] === '') report('unit', `« ${UNIT_FIELDS[key]} » est vide.`, unitSheet.rowOf[key]);
  }
  if (unit.id !== '' && !isId(unit.id)) {
    report('unit', `Identifiant de l'unité invalide : « ${unit.id} » (a-z, 0-9, - et _).`);
  }
  if (unit.pack !== '' && !isId(unit.pack)) {
    report('unit', `Identifiant du pack invalide : « ${unit.pack} » (a-z, 0-9, - et _).`);
  }
  const order = Number(unit.order);
  if (unit.order !== '' && !(Number.isInteger(order) && order > 0)) {
    report('unit', `Ordre invalide : « ${unit.order} » (un nombre entier, 1 ou plus).`);
  }
  const validated = parseYesNo(unit.validated);
  if (validated === null) {
    report(
      'unit',
      `« ${UNIT_FIELDS.validated} » : répondre oui ou non.`,
      unitSheet.rowOf.validated,
    );
  }

  // Leçons
  const lessons: PlannedLesson[] = [];
  for (const { row, values } of table('lessons', COLUMNS.lessons, ['summary'])) {
    const type = LESSON_TYPES[headerKey(values.type)];
    if (!isId(values.ref))
      report('lessons', `Référence de leçon invalide : « ${values.ref} ».`, row);
    else if (lessons.some((lesson) => lesson.ref === values.ref)) {
      report('lessons', `Leçon « ${values.ref} » présente deux fois.`, row);
    }
    if (type === undefined) {
      report('lessons', `Type inconnu : « ${values.type} » (leçon, révision ou histoire).`, row);
    }
    if (values.title === '') report('lessons', 'Titre vide.', row);
    lessons.push({
      ref: values.ref,
      id: `${unit.id}-${values.ref}`,
      title: values.title,
      ...(values.summary === '' ? {} : { summary: values.summary }),
      type: type ?? 'standard',
      row,
    });
  }
  if (lessons.length === 0) report('lessons', 'Aucune leçon.');
  if (lessons.filter((lesson) => lesson.type === 'story').length > 1) {
    report('lessons', 'Une seule histoire par unité.');
  }

  // Mots et phrases
  const entries: Entry[] = [];
  const checkEntry = (id: 'words' | 'sentences', row: number, values: Record<string, string>) => {
    const lesson = lessons.find((candidate) => candidate.ref === values.lesson);
    if (lesson === undefined) report(id, `Leçon inconnue : « ${values.lesson} ».`, row);
    else if (lesson.type !== 'standard') {
      report(
        id,
        `La leçon « ${lesson.ref} » est une ${lesson.type === 'story' ? 'histoire' : 'révision'} : elle ne présente pas d'éléments nouveaux.`,
        row,
      );
    }
    if (!isId(values.ref ?? ''))
      report(id, `Réf invalide : « ${values.ref} » (a-z, 0-9, - et _).`, row);
    else if (entries.some((entry) => entry.ref === values.ref)) {
      report(id, `Réf « ${values.ref} » déjà utilisée.`, row);
    }
    if (values.fr === '') report(id, 'Français vide.', row);
    if (values.fon === '') report(id, 'Fon à remplir.', row);
  };

  for (const { row, values } of table('words', COLUMNS.words, ['note', 'image', 'remarks'])) {
    checkEntry('words', row, values);
    const image = parseYesNo(values.image);
    if (image === null) report('words', `Image : répondre oui ou non (« ${values.image} »).`, row);
    if (image === true && !drawings.has(values.ref)) {
      report('words', `Dessin manquant : illustrations/${values.ref}.svg.`, row);
    }
    entries.push({
      ref: values.ref,
      lesson: values.lesson,
      kind: 'word',
      fr: values.fr,
      fon: values.fon,
      tiles: splitTiles(values.fon),
      image: image === true,
      ...(values.note === '' ? {} : { note: values.note }),
      audio: takeId(values.ref, 'A', 'normal'),
    });
  }

  for (const { row, values } of table('sentences', COLUMNS.sentences, [
    'tiles',
    'note',
    'remarks',
  ])) {
    checkEntry('sentences', row, values);
    const tiles = values.tiles === '' ? splitTiles(values.fon) : parseTiles(values.tiles);
    if (values.fon !== '' && tiles.length === 0) report('sentences', 'Phrase sans mot.', row);
    if (values.fon !== '' && values.tiles !== '' && !tilesMatchSentence(values.fon, tiles)) {
      report('sentences', 'Les tuiles, mises bout à bout, ne redonnent pas la phrase fon.', row);
    }
    entries.push({
      ref: values.ref,
      lesson: values.lesson,
      kind: 'sentence',
      fr: values.fr,
      fon: values.fon,
      tiles,
      image: false,
      ...(values.note === '' ? {} : { note: values.note }),
      audio: takeId(values.ref, 'A', 'normal'),
    });
  }

  // Histoire (seulement si l'unité en a une)
  const storyLesson = lessons.find((lesson) => lesson.type === 'story');
  const lines: PlannedLine[] = [];
  const choices: { fon: string; correct: boolean; explanation: RichText }[] = [];
  let question = readFields([], QUESTION_FIELDS).values;
  if (storyLesson !== undefined) {
    for (const { row, values } of table('story', COLUMNS.story, ['hint', 'remarks'])) {
      const speaker = SPEAKERS[headerKey(values.speaker)];
      const lineOrder = Number(values.order);
      const audioOnly = parseYesNo(values.audioOnly);
      if (!(Number.isInteger(lineOrder) && lineOrder > 0)) {
        report('story', `Ordre invalide : « ${values.order} ».`, row);
      } else if (lines.some((line) => line.order === lineOrder)) {
        report('story', `Ordre ${lineOrder} utilisé deux fois.`, row);
      }
      if (speaker === undefined) {
        report('story', `Qui parle : « vendeuse » ou « apprenant » (« ${values.speaker} »).`, row);
      }
      if (audioOnly === null) report('story', 'Écoute seule : répondre oui ou non.', row);
      if (values.fon === '') report('story', 'Fon à remplir.', row);
      if (values.fr === '' && audioOnly !== true) report('story', 'Français vide.', row);
      lines.push({
        row,
        order: lineOrder,
        speaker: speaker ?? 'learner',
        fon: values.fon,
        fr: values.fr,
        audioOnly: audioOnly === true,
        hint: values.hint,
      });
    }
    if (lines.length === 0) report('story', 'Aucune réplique.');
    lines.sort((a, b) => a.order - b.order);

    const questionSheet = readFields(sheet('question'), QUESTION_FIELDS);
    question = questionSheet.values;
    for (const key of Object.keys(QUESTION_FIELDS) as (keyof typeof QUESTION_FIELDS)[]) {
      if (question[key] === '') {
        report('question', `« ${QUESTION_FIELDS[key]} » est vide.`, questionSheet.rowOf[key]);
      }
    }

    for (const { row, values } of table('choices', COLUMNS.choices, [
      'meaning',
      'explanation',
      'remarks',
    ])) {
      const correct = parseYesNo(values.correct);
      if (values.fon === '') report('choices', 'Fon à remplir.', row);
      if (correct === null) report('choices', 'Bonne réponse : répondre oui ou non.', row);
      let explanation: RichText | null = null;
      if (values.explanation !== '') {
        explanation = parseRichText(values.explanation);
        if (explanation === null)
          report('choices', 'Explication : un crochet [ ] n’est pas refermé.', row);
      } else if (values.meaning !== '' && values.fon !== '') {
        explanation = [{ fon: values.fon }, { fr: ` : « ${values.meaning} ».` }];
      } else {
        report('choices', 'Écrire une explication, ou au moins le sens en français.', row);
      }
      choices.push({ fon: values.fon, correct: correct === true, explanation: explanation ?? [] });
    }
    if (choices.length < 2 || choices.length > 4) {
      report('choices', `Il faut de 2 à 4 réponses possibles (${choices.length} trouvée(s)).`);
    }
    if (choices.length > 0 && !choices.some((choice) => choice.correct)) {
      report('choices', 'Aucune bonne réponse.');
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  // Construction du pack
  const audios: Audio[] = [];
  const recordings: Recording[] = [];
  const addAudio: AddAudio = (id, voice, speed, fon, fr, group) => {
    const file = `audio/${id}.m4a`;
    audios.push({
      id,
      file,
      voice,
      speed,
      durationMs: durations.get(id) ?? estimateDurationMs(fon, speed),
      ...(group === undefined ? {} : { group }),
    });
    recordings.push({ file, voice, speed, fon, fr });
  };

  const items: LexiconItem[] = [];
  const illustrations: Illustration[] = [];
  for (const entry of entries) {
    // Les deux experts disent chaque mot et chaque phrase, aux deux vitesses : l'appli alterne
    // les voix d'un même groupe. Les éléments et les exercices citent la prise de la voix A.
    for (const speed of ['normal', 'slow'] as const) {
      for (const voice of ['A', 'B'] as const) {
        const group = `${entry.ref}-${SPEED_SUFFIX[speed]}`;
        addAudio(takeId(entry.ref, voice, speed), voice, speed, entry.fon, entry.fr, group);
      }
    }
    const drawing = entry.image ? drawings.get(entry.ref) : undefined;
    if (drawing !== undefined) illustrations.push({ id: `ill-${entry.ref}`, svg: drawing.trim() });
    items.push({
      id: entry.ref,
      fon: entry.fon,
      fr: entry.fr,
      ...(entry.kind === 'word' && entry.note !== undefined ? { note: entry.note } : {}),
      ...(drawing === undefined ? {} : { illustration: `ill-${entry.ref}` }),
      audio: { normal: entry.audio, slow: takeId(entry.ref, 'A', 'slow') },
    });
  }

  const builtLessons: Lesson[] = [];
  lessons.forEach((lesson, index) => {
    const before = new Set(lessons.slice(0, index).map((candidate) => candidate.ref));
    const earlier = entries.filter((entry) => before.has(entry.lesson));
    const exercises =
      lesson.type === 'standard'
        ? standardLesson(lesson, entries, earlier)
        : lesson.type === 'review'
          ? reviewLesson(lesson, earlier)
          : [storyExercise(lesson, lines, question, choices, addAudio)];
    if (exercises.length === 0) {
      report(
        'lessons',
        `Leçon « ${lesson.ref} » sans exercice : ajoutez des mots ou des phrases (trois au moins).`,
        lesson.row,
      );
    }
    builtLessons.push({
      id: lesson.id,
      kind: lesson.type === 'story' ? 'story' : 'standard',
      title: lesson.title,
      ...(lesson.summary === undefined ? {} : { summaryFr: lesson.summary }),
      exercises,
    });
  });
  if (issues.length > 0) return { ok: false, issues };

  const pack = {
    formatVersion: 1,
    id: unit.pack,
    version,
    validated: validated === true,
    unit: { id: unit.id, order, title: unit.title, subtitle: unit.subtitle, lessons: builtLessons },
    items,
    audios,
    illustrations,
  };
  const checked = validatePack(pack);
  if (!checked.ok) {
    return {
      ok: false,
      issues: checked.issues.map((issue) => ({
        sheet: 'Pack',
        message: `${issue.path} : ${issue.message}`,
      })),
    };
  }
  return { ok: true, pack: checked.pack, recordings };
}

function storyExercise(
  lesson: PlannedLesson,
  lines: readonly PlannedLine[],
  question: Record<keyof typeof QUESTION_FIELDS, string>,
  choices: readonly { fon: string; correct: boolean; explanation: RichText }[],
  addAudio: AddAudio,
): StoryExercise {
  return {
    id: `${lesson.id}-e01`,
    type: 'story',
    title: question.title,
    setting: question.setting,
    lines: lines.map((line, index) => {
      const audio = `histoire-${index + 1}`;
      addAudio(audio, VOICE_OF[line.speaker], 'normal', line.fon, line.fr);
      const hint = line.hint === '' ? {} : { hintFr: line.hint };
      return line.audioOnly
        ? { speaker: line.speaker, audio, audioOnly: true, ...hint }
        : { speaker: line.speaker, fon: line.fon, fr: line.fr, audio, ...hint };
    }),
    question: {
      promptFr: question.prompt,
      successFr: question.success,
      choices: choices.map((choice) => ({ ...choice })),
    },
  };
}
