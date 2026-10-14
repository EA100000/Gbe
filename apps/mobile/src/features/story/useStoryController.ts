import type { StoryExercise } from '@gbe/content-schema';
import { lessonXp } from '@gbe/domain';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { preloadAudio, stopAudio } from '../../core/audio/audioService';
import { useClipPlayer } from '../../core/audio/useClipPlayer';
import { lessonAudioIds } from '../../core/content/content';
import { useContentForLesson } from '../../core/content/contentStore';
import { t } from '../../core/i18n';
import { lessonCompletedEvent } from '../../core/progress/eventFactory';
import { useProgressStore } from '../../core/progress/progressStore';
import {
  initialStoryState,
  markListened,
  pickReply,
  storyAccuracy,
  storyProgress,
  toggleTranslation,
} from './storyMachine';

/** Relie l'histoire au journal d'événements et à l'audio. */
export function useStoryController(lessonId: string) {
  const content = useContentForLesson(lessonId);
  const lesson = content.lessonsById.get(lessonId);
  const story = lesson?.exercises.find((e): e is StoryExercise => e.type === 'story');
  const clock = useProgressStore((s) => s.clock);
  const record = useProgressStore((s) => s.record);
  const playClip = useClipPlayer(content);
  const [state, setState] = useState(initialStoryState);
  const startedAt = useRef(clock.now());

  useEffect(() => {
    if (lesson === undefined) return;
    const sources = lessonAudioIds(lesson, content)
      .map((id) => content.audioSources.get(id))
      .filter((s): s is number | string => s !== undefined);
    void preloadAudio(sources);
    return () => stopAudio();
  }, [lesson, content]);

  const listen = useCallback(
    (line: number) => {
      playClip(story?.lines[line]?.audio);
      setState((s) => markListened(s, line));
    },
    [playClip, story],
  );

  const pick = useCallback(
    (choice: number) => {
      if (story === undefined) return;
      const next = pickReply(state, story, choice);
      setState(next);
      if (next.attempts === state.attempts) return;
      AccessibilityInfo.announceForAccessibility(
        t(next.solved ? 'common.correct' : 'common.wrong'),
      );
      if (next.solved) {
        const accuracy = storyAccuracy(next);
        void record([
          lessonCompletedEvent(clock, {
            lessonId,
            unitId: content.pack.unit.id,
            packId: content.pack.id,
            packVersion: content.pack.version,
            xp: lessonXp(accuracy),
            accuracy,
            durationMs: Math.max(0, clock.now() - startedAt.current),
          }),
        ]);
      }
    },
    [clock, content, lessonId, record, state, story],
  );

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  return {
    story,
    state,
    progress: story === undefined ? 0 : storyProgress(state, story),
    toggleTranslation: () => setState(toggleTranslation),
    listen,
    pick,
    finish: () => router.dismissTo('/'),
    leave,
  };
}
