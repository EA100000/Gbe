import type { LexiconItem, UiFon } from '@gbe/content-schema';
import type { RichSegment } from '@gbe/ui';

import { t } from '../../core/i18n';
import { currentExercise, type LessonViewState } from './lessonMachine';

/** Contenu du panneau de correction (bleu si juste, rouge si faux), comme dans la maquette. */
export interface Feedback {
  tone: 'correct' | 'wrong';
  title: readonly RichSegment[];
  body: readonly RichSegment[] | null;
  /** `outOfHearts` : la leçon s'arrête, « Continuer » mène à l'écran 16 (plus de vies). */
  button: 'continue' | 'retry' | 'outOfHearts';
}

function meaning(item: LexiconItem): RichSegment[] {
  const text =
    item.note === undefined
      ? t('lesson.meaning', { fr: item.fr })
      : t('lesson.meaningNote', { fr: item.fr, note: item.note });
  return [{ fon: item.fon }, { fr: text }];
}

export function buildFeedback(
  state: LessonViewState,
  items: ReadonlyMap<string, LexiconItem>,
  uiFon: UiFon | undefined,
  minutesToNextHeart: number,
): Feedback | null {
  const { phase } = state.session;
  if (phase === 'out_of_hearts') {
    // La dernière vie vient d'être perdue : on montre d'abord la correction de cette réponse.
    const lastAnswer =
      state.session.heartsLost > 0
        ? answerFeedback({ ...state, session: { ...state.session, phase: 'wrong' } }, items, uiFon)
        : null;
    if (lastAnswer !== null && lastAnswer.tone === 'wrong') {
      return { ...lastAnswer, button: 'outOfHearts' };
    }
    return {
      tone: 'wrong',
      title: [{ fr: t('lesson.outOfHearts.title') }],
      body: [{ fr: t('lesson.outOfHearts.body', { n: Math.max(1, minutesToNextHeart) }) }],
      button: 'outOfHearts',
    };
  }
  return answerFeedback(state, items, uiFon);
}

/** Correction d'une réponse (panneau bleu ou rouge), selon le type d'exercice. */
function answerFeedback(
  state: LessonViewState,
  items: ReadonlyMap<string, LexiconItem>,
  uiFon: UiFon | undefined,
): Feedback | null {
  const { phase } = state.session;
  if (phase !== 'correct' && phase !== 'wrong') return null;
  const exercise = currentExercise(state);
  if (exercise === undefined) return null;
  const correct = phase === 'correct';

  switch (exercise.type) {
    case 'image_choice': {
      const item = items.get(correct ? exercise.answer : (state.selectedChoice ?? ''));
      const body = item === undefined ? null : meaning(item);
      if (correct) {
        const title: RichSegment[] =
          uiFon?.approval === undefined
            ? [{ fr: t('lesson.image.correct') }]
            : [{ fon: uiFon.approval }, { fr: ` ${t('lesson.image.correct')}` }];
        return {
          tone: 'correct',
          title,
          body: body === null ? null : [...body, { fr: '.' }],
          button: 'continue',
        };
      }
      return {
        tone: 'wrong',
        title: [{ fr: t('lesson.image.wrong') }],
        body: body === null ? null : [...body, { fr: `.${t('lesson.loseHeart')}` }],
        button: 'retry',
      };
    }
    case 'build_sentence': {
      const answer = exercise.answerFon ?? exercise.solution.join(' ');
      if (correct) {
        const body: RichSegment[] = [{ fon: answer }];
        if (exercise.noteFr !== undefined) body.push({ fr: ` ${exercise.noteFr}` });
        return {
          tone: 'correct',
          title: [{ fr: t('lesson.build.correct') }],
          body,
          button: 'continue',
        };
      }
      return {
        tone: 'wrong',
        title: [{ fr: t('lesson.build.wrong') }],
        body: [{ fon: answer }],
        button: 'retry',
      };
    }
    case 'match_pairs':
      return {
        tone: 'correct',
        title: [{ fr: t('lesson.pairs.correct') }],
        body: exercise.noteFr === undefined ? null : [{ fr: exercise.noteFr }],
        button: 'continue',
      };
  }
}
