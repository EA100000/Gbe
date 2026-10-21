import type { LexiconItem } from '@gbe/content-schema';
import {
  mistakesToReview,
  normalizeFon,
  pickReviewItems,
  shuffle,
  type ItemStat,
  type Rng,
} from '@gbe/domain';

import type { LoadedContent } from '../../core/content/content';
import { t } from '../../core/i18n';
import type { LessonExercise } from '../lesson/lessonMachine';
import type { PracticeBuilder } from '../practice/usePracticeController';

const MAX_IMAGE_CHOICES = 4;
const MIN_PAIRS = 3;
const MAX_PAIRS = 4;

/** Deux mots se confondraient dans un même exercice : même fon ou même traduction. */
const clash = (a: LexiconItem, b: LexiconItem) =>
  normalizeFon(a.fon) === normalizeFon(b.fon) || a.fr === b.fr;

/**
 * Séance « Mes erreurs » (écran 24, ADR 0019) : un exercice d'images par mot illustré,
 * puis des paires (3 ou 4) pour les autres, complétées par des mots déjà rencontrés.
 * `content` est le contenu fusionné des unités (identifiants `<unité>:<id>`).
 */
export function buildReviewExercises(
  picked: readonly ItemStat[],
  content: LoadedContent,
  known: ReadonlySet<string>,
  mistakes: ReadonlySet<string>,
  rng: Rng,
): LessonExercise[] {
  const items = picked.flatMap((s) => {
    const item = content.itemsById.get(s.key);
    return item === undefined ? [] : [item];
  });
  const all = [...content.itemsById.values()];
  const illustrated = all.filter(
    (i) => i.illustration !== undefined && content.illustrationsById.has(i.illustration),
  );
  const tag = (item: LexiconItem) => ({
    kind: 'review' as const,
    labelFr: t(mistakes.has(item.id) ? 'review.tag.mistake' : 'review.tag.weak'),
  });
  const exercises: LessonExercise[] = [];
  const id = () => `revision-${exercises.length + 1}`;

  const forPairs: LexiconItem[] = [];
  for (const item of items) {
    const others = shuffle(
      illustrated.filter((o) => o.id !== item.id && !clash(o, item)),
      rng,
    ).slice(0, MAX_IMAGE_CHOICES - 1);
    if (!illustrated.includes(item) || others.length === 0) {
      forPairs.push(item);
      continue;
    }
    exercises.push({
      id: id(),
      type: 'image_choice',
      tag: tag(item),
      promptFr: t('review.prompt.image', { fr: item.fr }),
      choices: shuffle([item, ...others], rng).map((o) => o.id),
      answer: item.id,
    });
  }

  // Mots de complément pour les paires : d'abord ceux déjà rencontrés.
  const fillers = shuffle(all, rng).sort(
    (a, b) => Number(known.has(b.id)) - Number(known.has(a.id)),
  );
  for (let start = 0; start < forPairs.length; start += MAX_PAIRS) {
    const group: LexiconItem[] = [];
    for (const item of forPairs.slice(start, start + MAX_PAIRS)) {
      if (!group.some((g) => clash(g, item))) group.push(item);
    }
    const first = group[0];
    if (first === undefined) continue;
    for (const filler of fillers) {
      if (group.length >= MIN_PAIRS) break;
      if (!group.some((g) => g.id === filler.id || clash(g, filler))) group.push(filler);
    }
    if (group.length < MIN_PAIRS) continue;
    exercises.push({
      id: id(),
      type: 'match_pairs',
      tag: tag(first),
      promptFr: t('review.prompt.pairs'),
      pairs: group.map((g) => ({
        fon: g.fon,
        fr: g.fr,
        ...(g.audio?.normal === undefined ? {} : { audio: g.audio.normal }),
      })),
    });
  }
  return exercises;
}

/** Séance « Mes erreurs » à partir de l'historique : erreurs d'abord, puis mots fragiles. */
export const buildReview: PracticeBuilder = (stats, content, rng) => {
  const present = [...stats.values()].filter((s) => content.itemsById.has(s.key));
  const mistakes = new Set(mistakesToReview(present).map((s) => s.key));
  return buildReviewExercises(
    pickReviewItems(present),
    content,
    new Set(present.map((s) => s.key)),
    mistakes,
    rng,
  );
};
