import type {
  BuildSentenceExercise,
  Exercise,
  ExerciseTag,
  ImageChoiceExercise,
  MatchPairsExercise,
} from '@gbe/content-schema';

import { lowerFirst, stableShuffle, tileKey } from './text';

/** Un mot ou une phrase du classeur, prêt à entrer dans des exercices. */
export interface Entry {
  ref: string;
  /** Référence de la leçon (colonne « Leçon »), par exemple `l01`. */
  lesson: string;
  kind: 'word' | 'sentence';
  fr: string;
  fon: string;
  /** Phrase : les tuiles de la bonne réponse. Mot : ses mots, utiles comme leurres. */
  tiles: string[];
  /** Mot illustré : il a un dessin et peut servir dans « choisir l'image ». */
  image: boolean;
  /** Phrase : complément affiché après une bonne réponse. */
  note?: string;
  /** Identifiant de l'audio en vitesse normale. */
  audio: string;
}

export interface LessonRef {
  ref: string;
  /** Identifiant dans le pack, par exemple `u02-l01`. */
  id: string;
  title: string;
  summary?: string;
}

const PAIR_GROUP = 4;
const MIN_PAIRS = 3;
const MAX_PAIRS = 6;

const NEW_WORD: ExerciseTag = { kind: 'new', labelFr: 'Nouveau mot' };
const NEW_WORDS: ExerciseTag = { kind: 'new', labelFr: 'Nouveaux mots' };
const NEW_SENTENCE: ExerciseTag = { kind: 'new', labelFr: 'Nouvelle phrase' };
const REVIEW: ExerciseTag = { kind: 'review', labelFr: 'Révision' };

const byRef = (entry: Entry) => entry.ref;

/** Identifiant du prochain exercice d'une leçon : `u02-l01-e03`. */
const nextId = (lesson: LessonRef, exercises: readonly Exercise[]) =>
  `${lesson.id}-e${String(exercises.length + 1).padStart(2, '0')}`;

/** Garde un seul élément par texte fon et par texte français : chaque paire reste sans ambiguïté. */
function distinct(entries: readonly Entry[]): Entry[] {
  const fon = new Set<string>();
  const fr = new Set<string>();
  return entries.filter((entry) => {
    const a = tileKey(entry.fon);
    const b = tileKey(entry.fr);
    if (fon.has(a) || fr.has(b)) return false;
    fon.add(a);
    fr.add(b);
    return true;
  });
}

/** Complète un groupe jusqu'à trois éléments avec des éléments déjà vus. */
function fillUp(group: readonly Entry[], fillers: readonly Entry[]): Entry[] {
  return distinct([...group, ...fillers]).slice(0, Math.max(group.length, MIN_PAIRS));
}

/** Coupe une liste en groupes équilibrés de quatre éléments au plus. */
function chunk<T>(items: readonly T[]): T[][] {
  if (items.length === 0) return [];
  const count = Math.ceil(items.length / PAIR_GROUP);
  const size = Math.ceil(items.length / count);
  return Array.from({ length: count }, (_, i) => items.slice(i * size, (i + 1) * size));
}

function matchPairs(
  id: string,
  tag: ExerciseTag,
  entries: readonly Entry[],
  noteFr?: string,
): MatchPairsExercise {
  return {
    id,
    type: 'match_pairs',
    tag,
    promptFr: 'Associe les paires',
    pairs: entries.map((entry) => ({ fon: entry.fon, fr: entry.fr, audio: entry.audio })),
    ...(noteFr === undefined ? {} : { noteFr }),
  };
}

/** « Lequel veut dire … ? » : la bonne image et jusqu'à trois autres, de la même leçon d'abord. */
function imageChoice(
  id: string,
  tag: ExerciseTag,
  target: Entry,
  illustrated: readonly Entry[],
): ImageChoiceExercise | null {
  const others = illustrated.filter((entry) => entry.ref !== target.ref);
  if (others.length === 0) return null;
  const sameLesson = others.filter((entry) => entry.lesson === target.lesson);
  const elsewhere = others.filter((entry) => entry.lesson !== target.lesson);
  const picked = [
    ...stableShuffle(sameLesson, byRef, id),
    ...stableShuffle(elsewhere, byRef, id),
  ].slice(0, 3);
  return {
    id,
    type: 'image_choice',
    tag,
    promptFr: `Lequel veut dire « ${target.fr} » ?`,
    choices: stableShuffle([target, ...picked], byRef, `${id}:ordre`).map(byRef),
    answer: target.ref,
  };
}

/** « Traduis en fon » : les tuiles de la phrase, plus deux ou trois leurres pris dans l'unité. */
function buildSentence(
  id: string,
  tag: ExerciseTag,
  sentence: Entry,
  unit: readonly Entry[],
): BuildSentenceExercise {
  const used = new Set(sentence.tiles.map(tileKey));
  const decoys = (entries: readonly Entry[]) => {
    const tiles: string[] = [];
    for (const entry of entries) {
      for (const tile of entry.tiles) {
        const key = tileKey(tile);
        if (!used.has(key)) {
          used.add(key);
          tiles.push(tile);
        }
      }
    }
    return stableShuffle(tiles, tileKey, id);
  };
  const others = unit.filter((entry) => entry.ref !== sentence.ref);
  const candidates = [
    ...decoys(others.filter((entry) => entry.lesson === sentence.lesson)),
    ...decoys(others.filter((entry) => entry.lesson !== sentence.lesson)),
  ];
  return {
    id,
    type: 'build_sentence',
    tag,
    promptFr: 'Traduis en fon',
    sentenceFr: sentence.fr,
    solution: sentence.tiles,
    answerFon: sentence.fon,
    distractors: candidates.slice(0, sentence.tiles.length >= 3 ? 3 : 2),
    audio: sentence.audio,
    ...(sentence.note === undefined ? {} : { noteFr: sentence.note }),
  };
}

/**
 * Leçon ordinaire : chaque mot illustré en « choisir l'image », les autres mots en paires,
 * chaque phrase en « traduis en fon », puis une révision de la leçon en paires.
 * `earlier` : les éléments des leçons précédentes, pour compléter les petits groupes.
 */
export function standardLesson(
  lesson: LessonRef,
  unit: readonly Entry[],
  earlier: readonly Entry[],
): Exercise[] {
  const own = unit.filter((entry) => entry.lesson === lesson.ref);
  // Une leçon ordinaire présente au moins un élément nouveau : sans lui, rien à générer.
  if (own.length === 0) return [];
  const words = own.filter((entry) => entry.kind === 'word');
  const sentences = own.filter((entry) => entry.kind === 'sentence');
  const illustrated = unit.filter((entry) => entry.kind === 'word' && entry.image);
  const exercises: Exercise[] = [];

  const shown = new Set<string>();
  for (const word of words.filter((entry) => entry.image)) {
    const exercise = imageChoice(nextId(lesson, exercises), NEW_WORD, word, illustrated);
    if (exercise !== null) {
      exercises.push(exercise);
      shown.add(word.ref);
    }
  }

  const earlierWords = earlier.filter((entry) => entry.kind === 'word');
  let lastGroup: string[] = [];
  for (const group of chunk(distinct(words.filter((word) => !shown.has(word.ref))))) {
    const pairs = fillUp(group, [...words, ...earlierWords]);
    if (pairs.length >= MIN_PAIRS) {
      exercises.push(matchPairs(nextId(lesson, exercises), NEW_WORDS, pairs));
      lastGroup = pairs.map(byRef);
    }
  }

  for (const sentence of sentences) {
    exercises.push(buildSentence(nextId(lesson, exercises), NEW_SENTENCE, sentence, unit));
  }

  let review = fillUp(distinct(own), earlier);
  if (review.length > MAX_PAIRS) {
    review = stableShuffle(review, byRef, `${lesson.id}:revision`).slice(0, MAX_PAIRS);
  }
  const sameAsLast =
    review.length === lastGroup.length && review.every((entry) => lastGroup.includes(entry.ref));
  if (review.length >= MIN_PAIRS && !sameAsLast) {
    const tag: ExerciseTag = { kind: 'review', labelFr: `Révision · ${lowerFirst(lesson.title)}` };
    exercises.push(matchPairs(nextId(lesson, exercises), tag, review, lesson.summary));
  }
  return exercises;
}

/**
 * Leçon de révision : rien de nouveau, tout vient des leçons précédentes
 * (paires de phrases, deux phrases à construire, une image, paires de mots).
 */
export function reviewLesson(lesson: LessonRef, earlier: readonly Entry[]): Exercise[] {
  const sentences = stableShuffle(
    distinct(earlier.filter((entry) => entry.kind === 'sentence')),
    byRef,
    lesson.id,
  );
  const words = stableShuffle(
    distinct(earlier.filter((entry) => entry.kind === 'word')),
    byRef,
    lesson.id,
  );
  const illustrated = words.filter((entry) => entry.image);
  const exercises: Exercise[] = [];

  if (sentences.length >= MIN_PAIRS) {
    const tag: ExerciseTag = { kind: 'review', labelFr: 'Révision · les phrases' };
    exercises.push(matchPairs(nextId(lesson, exercises), tag, sentences.slice(0, MAX_PAIRS)));
  }
  for (const sentence of sentences.slice(0, 2)) {
    exercises.push(buildSentence(nextId(lesson, exercises), REVIEW, sentence, earlier));
  }
  const pictured = illustrated[0];
  if (pictured !== undefined) {
    const exercise = imageChoice(nextId(lesson, exercises), REVIEW, pictured, illustrated);
    if (exercise !== null) exercises.push(exercise);
  }
  if (words.length >= MIN_PAIRS) {
    const tag: ExerciseTag = { kind: 'review', labelFr: 'Révision · les mots' };
    exercises.push(matchPairs(nextId(lesson, exercises), tag, words.slice(0, MAX_PAIRS)));
  }
  return exercises;
}
