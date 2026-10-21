import type { Lesson } from '@gbe/content-schema';
import {
  applyEvents,
  computeStreak,
  createRng,
  itemStats,
  sessionProgress,
  summarizeSession,
  type ItemStat,
  type Rng,
} from '@gbe/domain';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, BackHandler } from 'react-native';

import { preloadAudio, stopAudio } from '../../core/audio/audioService';
import { useClipPlayer } from '../../core/audio/useClipPlayer';
import { lessonAudioIds, type LoadedContent } from '../../core/content/content';
import { useContentStore } from '../../core/content/contentStore';
import { mergeContents } from '../../core/content/practiceContent';
import { t } from '../../core/i18n';
import { itemAnsweredEvent, practiceCompletedEvent } from '../../core/progress/eventFactory';
import { useProgressStore } from '../../core/progress/progressStore';
import { answeredItem, firstTryAnswers } from '../lesson/answers';
import { buildFeedback } from '../lesson/feedback';
import {
  canCheck,
  currentExercise,
  type LessonAction,
  type LessonExercise,
} from '../lesson/lessonMachine';
import { useLessonStore } from '../lesson/lessonStore';

export type PracticeMode = 'review' | 'listen';

/** Fabrique les exercices d'une séance à partir de l'historique et du contenu fusionné. */
export type PracticeBuilder = (
  stats: ReadonlyMap<string, ItemStat>,
  content: LoadedContent,
  rng: Rng,
) => LessonExercise[];

const SESSION_ID: Record<PracticeMode, string> = { review: 'revision', listen: 'ecoute' };

/**
 * Séance d'entraînement (ADR 0019) : mêmes écrans qu'une leçon, mais sans perte de vie,
 * avec les mots de toutes les unités. Une erreur renvoie l'exercice plus loin.
 */
export function usePracticeController(mode: PracticeMode, build: PracticeBuilder) {
  const contents = useContentStore((s) => s.contents);
  const content = useMemo(() => mergeContents(contents), [contents]);
  const clock = useProgressStore((s) => s.clock);
  const record = useProgressStore((s) => s.record);
  const setLastSummary = useProgressStore((s) => s.setLastSummary);
  const state = useLessonStore((s) => s.state);
  const start = useLessonStore((s) => s.start);
  const dispatch = useLessonStore((s) => s.dispatch);
  const reset = useLessonStore((s) => s.reset);
  const [quitAsked, setQuitAsked] = useState(false);
  const sessionId = SESSION_ID[mode];

  // Les exercices sont tirés une fois, au démarrage ; rien à réviser : retour à l'onglet.
  useEffect(() => {
    if (content === null || useLessonStore.getState().state?.lessonId === sessionId) return;
    const startedAt = clock.now();
    const stats = itemStats(useProgressStore.getState().events);
    const exercises = build(stats, content, createRng(startedAt));
    if (exercises.length === 0) {
      if (router.canGoBack()) router.back();
      return;
    }
    start(sessionId, exercises, 0, startedAt, startedAt, { heartCost: false });
  }, [build, clock, content, sessionId, start]);

  const exercises = state?.lessonId === sessionId ? state.exercises : null;
  useEffect(() => {
    if (content === null || exercises === null) return;
    const lesson: Lesson = {
      id: sessionId,
      kind: 'standard',
      title: '',
      exercises: [...exercises],
    };
    const sources = lessonAudioIds(lesson, content)
      .map((id) => content.audioSources.get(id))
      .filter((s): s is number | string => s !== undefined);
    void preloadAudio(sources);
    return () => stopAudio();
  }, [content, exercises, sessionId]);

  const finish = useCallback(async () => {
    const current = useLessonStore.getState().state;
    if (current === null) return;
    const result = summarizeSession(current.session, clock.now());
    const event = practiceCompletedEvent(clock, {
      mode,
      xp: result.xp,
      accuracy: result.accuracy,
      durationMs: result.durationMs,
    });
    await record([event]);
    const days = applyEvents(useProgressStore.getState().events).activeDays;
    setLastSummary({
      kind: mode,
      lessonId: sessionId,
      xp: result.xp,
      accuracy: result.accuracy,
      durationMs: result.durationMs,
      streak: computeStreak(days, event.dayKey).current,
      summaryFr: null,
      unlockedStory: null,
    });
    reset();
    router.replace('/fin');
  }, [clock, mode, record, reset, sessionId, setLastSummary]);

  const act = useCallback(
    (action: LessonAction) => {
      const before = useLessonStore.getState().state;
      dispatch(action);
      const after = useLessonStore.getState().state;
      if (content === null || before === null || after === null || before === after) return;

      const answers = firstTryAnswers(before, after).flatMap((ref) => {
        const item = answeredItem(content, ref);
        return item === null
          ? []
          : [itemAnsweredEvent(clock, { ...item, correct: ref.correct, mode })];
      });
      if (answers.length > 0) void record(answers);
      if (before.session.phase === 'answering' && after.session.phase !== 'answering') {
        AccessibilityInfo.announceForAccessibility(
          t(after.session.phase === 'correct' ? 'common.correct' : 'common.wrong'),
        );
      }
      if (after.session.phase === 'finished') void finish();
    },
    [clock, content, dispatch, finish, mode, record],
  );

  const leave = useCallback(() => {
    setQuitAsked(false);
    reset();
    if (router.canGoBack()) router.back();
    else router.replace('/reviser');
  }, [reset]);

  // Le bouton « retour » d'Android demande confirmation, comme dans une leçon (écran 17).
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        setQuitAsked(true);
        return true;
      });
      return () => subscription.remove();
    }, []),
  );

  const current = state?.lessonId === sessionId ? state : null;
  return {
    state: current,
    exercise: current === null ? undefined : currentExercise(current),
    progress: current === null ? 0 : sessionProgress(current.session),
    canCheck: current === null ? false : canCheck(current),
    feedback:
      current === null || content === null
        ? null
        : buildFeedback(current, content.itemsById, content.pack.uiFon, 0),
    content,
    playClip: useClipPlayer(content),
    act,
    quit: () => setQuitAsked(true),
    quitAsked,
    stay: () => setQuitAsked(false),
    leave,
    showOutOfHearts: () => undefined,
    badge: t('practice.badge'),
  };
}
