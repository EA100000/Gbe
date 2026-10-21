import type { LexiconItem } from '@gbe/content-schema';
import { normalizeFon } from '@gbe/domain';

import type { LoadedContent } from '../../core/content/content';
import { splitQualified } from '../../core/content/practiceContent';
import { currentExercise, type LessonViewState } from './lessonMachine';

/** Ce que l'apprenant vient de réussir ou de rater au premier essai, avant d'être relié au lexique. */
export type AnsweredRef =
  | { kind: 'item'; id: string; correct: boolean }
  | { kind: 'audio'; id: string; correct: boolean }
  | { kind: 'fon'; text: string; correct: boolean };

/**
 * Premiers essais révélés par une action (ADR 0019) :
 * - choix d'image, écoute ou phrase : la réponse vérifiée, si l'exercice n'avait pas encore été raté ;
 * - paires : à la dernière paire trouvée, chaque mot fon, juste s'il n'a jamais été mal associé.
 */
export function firstTryAnswers(before: LessonViewState, after: LessonViewState): AnsweredRef[] {
  if (before.session.phase !== 'answering' || after.session.phase === 'answering') return [];
  const exercise = currentExercise(before);
  if (exercise === undefined) return [];
  const correct = after.session.phase === 'correct';

  switch (exercise.type) {
    case 'image_choice':
    case 'listen_choice':
    case 'build_sentence': {
      if ((before.session.wrongAttempts[exercise.id] ?? 0) > 0) return [];
      if (exercise.type !== 'build_sentence')
        return [{ kind: 'item', id: exercise.answer, correct }];
      return exercise.audio === undefined ? [] : [{ kind: 'audio', id: exercise.audio, correct }];
    }
    case 'match_pairs': {
      const missed = after.pairs?.missed ?? [];
      return exercise.pairs.map((pair, i) => ({
        kind: 'fon',
        text: pair.fon,
        correct: !missed.includes(i),
      }));
    }
  }
}

function findItem(content: LoadedContent, ref: AnsweredRef): LexiconItem | undefined {
  const items = [...content.itemsById.values()];
  switch (ref.kind) {
    case 'item':
      return content.itemsById.get(ref.id);
    case 'audio':
      return items.find((i) => i.audio?.normal === ref.id || i.audio?.slow === ref.id);
    case 'fon': {
      const text = normalizeFon(ref.text);
      return items.find((i) => normalizeFon(i.fon) === text);
    }
  }
}

/** Relie une réponse à son mot ou sa phrase : unité et identifiant dans le pack. */
export function answeredItem(
  content: LoadedContent,
  ref: AnsweredRef,
): { unitId: string; itemId: string } | null {
  const item = findItem(content, ref);
  if (item === undefined) return null;
  return splitQualified(item.id) ?? { unitId: content.pack.unit.id, itemId: item.id };
}
