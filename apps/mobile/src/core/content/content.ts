import {
  validatePack,
  type Exercise,
  type Illustration,
  type Lesson,
  type LexiconItem,
  type Pack,
  type PackIssue,
} from '@gbe/content-schema';

/** Types d'exercice que cette version de l'appli sait afficher (maquette, écrans 3 à 5 et 7). */
export const SUPPORTED_EXERCISE_TYPES = [
  'image_choice',
  'build_sentence',
  'match_pairs',
  'story',
] as const;

export type SupportedExercise = Extract<
  Exercise,
  { type: (typeof SUPPORTED_EXERCISE_TYPES)[number] }
>;

export function isSupportedExercise(exercise: Exercise): exercise is SupportedExercise {
  return (SUPPORTED_EXERCISE_TYPES as readonly string[]).includes(exercise.type);
}

/** Contenu prêt à l'emploi : pack validé et index de recherche. */
export interface LoadedContent {
  pack: Pack;
  itemsById: ReadonlyMap<string, LexiconItem>;
  illustrationsById: ReadonlyMap<string, Illustration>;
  lessonsById: ReadonlyMap<string, Lesson>;
  /** Identifiant d'audio → source jouable (ressource embarquée ou fichier local). */
  audioSources: ReadonlyMap<string, number | string>;
}

export type ContentResult =
  { ok: true; content: LoadedContent } | { ok: false; issues: PackIssue[] };

/**
 * Valide un pack (Zod + cohérence) puis construit les index.
 * `audioFiles` associe le chemin relatif d'un audio (« audio/sin-n.m4a ») à sa source.
 */
export function loadContent(
  rawPack: unknown,
  audioFiles: Readonly<Record<string, number | string>>,
): ContentResult {
  const result = validatePack(rawPack);
  if (!result.ok) return result;
  const { pack } = result;

  const missing = pack.audios.filter((a) => audioFiles[a.file] === undefined);
  if (missing.length > 0) {
    return {
      ok: false,
      issues: missing.map((a) => ({
        code: 'missing_audio' as const,
        path: a.file,
        message: `Fichier audio absent : ${a.file}`,
      })),
    };
  }

  const audioSources = new Map<string, number | string>();
  for (const audio of pack.audios) {
    const source = audioFiles[audio.file];
    if (source !== undefined) audioSources.set(audio.id, source);
  }

  return {
    ok: true,
    content: {
      pack,
      itemsById: new Map(pack.items.map((i) => [i.id, i])),
      illustrationsById: new Map(pack.illustrations.map((i) => [i.id, i])),
      lessonsById: new Map(pack.unit.lessons.map((l) => [l.id, l])),
      audioSources,
    },
  };
}

/** Exercices jouables d'une leçon, dans l'ordre du pack. */
export function playableExercises(lesson: Lesson): SupportedExercise[] {
  return lesson.exercises.filter(isSupportedExercise);
}

/** Audios utilisés par une leçon, à précharger avant de commencer. */
export function lessonAudioIds(lesson: Lesson, content: LoadedContent): string[] {
  const ids = new Set<string>();
  const addItem = (itemId: string) => {
    const item = content.itemsById.get(itemId);
    if (item?.audio?.normal !== undefined) ids.add(item.audio.normal);
  };
  for (const exercise of lesson.exercises) {
    switch (exercise.type) {
      case 'image_choice':
        exercise.choices.forEach(addItem);
        break;
      case 'build_sentence':
        if (exercise.audio !== undefined) ids.add(exercise.audio);
        break;
      case 'match_pairs':
        exercise.pairs.forEach((p) => p.audio !== undefined && ids.add(p.audio));
        break;
      case 'story':
        exercise.lines.forEach((l) => l.audio !== undefined && ids.add(l.audio));
        break;
      case 'pronunciation':
        addItem(exercise.item);
        break;
    }
  }
  return [...ids];
}
