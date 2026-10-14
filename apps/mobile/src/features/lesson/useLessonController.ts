import type { Exercise } from '@gbe/content-schema';
import {
  computeStreak,
  nextHeartAt,
  sessionProgress,
  storyUnlockedBy,
  summarizeSession,
} from '@gbe/domain';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, BackHandler } from 'react-native';

import { preloadAudio, stopAudio } from '../../core/audio/audioService';
import { useClipPlayer } from '../../core/audio/useClipPlayer';
import { lessonAudioIds } from '../../core/content/content';
import { useContentForLesson } from '../../core/content/contentStore';
import { t } from '../../core/i18n';
import { heartLostEvent, lessonCompletedEvent } from '../../core/progress/eventFactory';
import { useProgressStore, useProgressView } from '../../core/progress/progressStore';
import { useNow } from '../../core/useNow';
import { buildFeedback } from './feedback';
import { canCheck, currentExercise, type LessonAction, type LessonExercise } from './lessonMachine';
import { useLessonStore } from './lessonStore';

const isLessonExercise = (e: Exercise): e is LessonExercise =>
  e.type === 'image_choice' || e.type === 'build_sentence' || e.type === 'match_pairs';

/**
 * Chef d'orchestre de l'écran de leçon : relie le réducteur pur, le journal
 * d'événements, l'audio et la navigation. Les composants ne font qu'afficher.
 */
export function useLessonController(lessonId: string) {
  const content = useContentForLesson(lessonId);
  const lesson = content.lessonsById.get(lessonId);
  const clock = useProgressStore((s) => s.clock);
  const record = useProgressStore((s) => s.record);
  const setLastSummary = useProgressStore((s) => s.setLastSummary);
  const now = useNow();
  const { hearts, progress } = useProgressView(now);
  const state = useLessonStore((s) => s.state);
  const start = useLessonStore((s) => s.start);
  const dispatch = useLessonStore((s) => s.dispatch);
  const reset = useLessonStore((s) => s.reset);
  const playClip = useClipPlayer(content);
  const [quitAsked, setQuitAsked] = useState(false);

  const exercises = useMemo(() => lesson?.exercises.filter(isLessonExercise) ?? [], [lesson]);

  // Démarre la leçon une seule fois, avec les vies disponibles à cet instant.
  useEffect(() => {
    if (lesson === undefined || exercises.length === 0) return;
    if (useLessonStore.getState().state?.lessonId === lessonId) return;
    const startedAt = clock.now();
    start(lessonId, exercises, hearts.count, startedAt, startedAt);
    // Les vies ne sont lues qu'au démarrage : une recharge pendant la leçon ne la relance pas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, lessonId, exercises, clock, start]);

  // Audios préchargés avant le premier exercice.
  useEffect(() => {
    if (lesson === undefined) return;
    const sources = lessonAudioIds(lesson, content)
      .map((id) => content.audioSources.get(id))
      .filter((s): s is number | string => s !== undefined);
    void preloadAudio(sources);
    return () => stopAudio();
  }, [lesson, content]);

  const finish = useCallback(async () => {
    const current = useLessonStore.getState().state;
    if (current === null || lesson === undefined) return;
    const result = summarizeSession(current.session, clock.now());
    const event = lessonCompletedEvent(clock, {
      lessonId,
      unitId: content.pack.unit.id,
      packId: content.pack.id,
      packVersion: content.pack.version,
      xp: result.xp,
      accuracy: result.accuracy,
      durationMs: result.durationMs,
    });
    const unlockedId = storyUnlockedBy(content.pack.unit, lessonId, progress.completedLessons);
    const unlocked = unlockedId === null ? undefined : content.lessonsById.get(unlockedId);
    await record([event]);
    setLastSummary({
      lessonId,
      xp: result.xp,
      accuracy: result.accuracy,
      durationMs: result.durationMs,
      streak: computeStreak([...progress.activeDays, event.dayKey], event.dayKey).current,
      summaryFr: lesson.summaryFr ?? null,
      unlockedStory:
        unlocked === undefined ? null : { lessonId: unlocked.id, title: unlocked.title },
    });
    reset();
    router.replace('/fin');
  }, [clock, content, lesson, lessonId, progress, record, reset, setLastSummary]);

  const act = useCallback(
    (action: LessonAction) => {
      const before = useLessonStore.getState().state;
      dispatch(action);
      const after = useLessonStore.getState().state;
      if (before === null || after === null || before === after) return;

      if (after.session.heartsLost > before.session.heartsLost) {
        void record([heartLostEvent(clock, lessonId)]);
      }
      if (before.session.phase === 'answering' && after.session.phase !== 'answering') {
        AccessibilityInfo.announceForAccessibility(
          t(after.session.phase === 'correct' ? 'common.correct' : 'common.wrong'),
        );
      }
      if (after.session.phase === 'finished') void finish();
    },
    [clock, dispatch, finish, lessonId, record],
  );

  const leave = useCallback(() => {
    setQuitAsked(false);
    reset();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [reset]);

  /** Fin de leçon faute de vie : l'écran 16 remplace la leçon. */
  const showOutOfHearts = useCallback(() => {
    reset();
    router.replace('/vies');
  }, [reset]);

  // Écran 17 : la croix et le bouton « retour » d'Android demandent confirmation.
  const outOfHearts = state?.session.phase === 'out_of_hearts';
  const askQuit = useCallback(() => {
    if (outOfHearts) showOutOfHearts();
    else setQuitAsked(true);
  }, [outOfHearts, showOutOfHearts]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        askQuit();
        return true;
      });
      return () => subscription.remove();
    }, [askQuit]),
  );

  const exercise = state === null ? undefined : currentExercise(state);
  const next = nextHeartAt(hearts);
  const minutesToNextHeart = next === null ? 0 : Math.ceil((next - now) / 60_000);

  return {
    lesson,
    state: state?.lessonId === lessonId ? state : null,
    exercise,
    progress: state === null ? 0 : sessionProgress(state.session),
    canCheck: state === null ? false : canCheck(state),
    feedback:
      state === null
        ? null
        : buildFeedback(state, content.itemsById, content.pack.uiFon, minutesToNextHeart),
    content,
    playClip,
    act,
    quit: askQuit,
    quitAsked,
    stay: () => setQuitAsked(false),
    leave,
    showOutOfHearts,
  };
}
