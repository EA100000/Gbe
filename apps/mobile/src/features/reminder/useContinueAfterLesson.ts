import { router } from 'expo-router';
import { useCallback } from 'react';

import { useProgressStore } from '../../core/progress/progressStore';
import { reminderNotifier } from '../../core/reminders/notifier';

/**
 * « Continuer » en fin de leçon : la première fois, on propose le rappel quotidien (écran 15),
 * puis plus jamais ; sinon retour au chemin.
 */
export function useContinueAfterLesson(): () => void {
  const offer = useProgressStore(
    (s) =>
      reminderNotifier.supported && !s.settings.reminderOffered && !s.settings.reminder.enabled,
  );
  return useCallback(() => {
    if (offer) router.replace('/rappel?depart=lecon');
    else router.dismissTo('/');
  }, [offer]);
}
