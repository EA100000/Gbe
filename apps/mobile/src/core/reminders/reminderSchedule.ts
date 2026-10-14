import {
  applyEvents,
  computeStreak,
  dailyGoalProgress,
  localMinutes,
  localTimeToEpoch,
  planReminders,
  type Progress,
} from '@gbe/domain';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { dayKeyAt, type Clock } from '../clock';
import type { Settings } from '../db/repositories';
import { t, tPlural } from '../i18n';
import { useProgressStore } from '../progress/progressStore';
import type { ReminderNotifier, ScheduledReminder } from './notifierTypes';

/** Texte du rappel : la série quand elle est sûre de tenir, sinon un message général. */
export function reminderBody(streak: number | null): string {
  return streak === null || streak <= 0
    ? t('reminder.notif.generic')
    : tPlural(streak, 'reminder.notif.streak.one', 'reminder.notif.streak.other');
}

/** Heure affichée à la française : « 19 h ». */
export function formatReminderHour(hour: number): string {
  return t('reminder.hour', { h: hour });
}

/** Rappels à programmer pour ces réglages et cette progression (aucun si le rappel est éteint). */
export function buildReminders(input: {
  settings: Settings;
  progress: Progress;
  clock: Clock;
  now: number;
}): ScheduledReminder[] {
  const { settings, progress, clock, now } = input;
  if (!settings.reminder.enabled) return [];
  const today = dayKeyAt(clock, now);
  const practiceMs = progress.practiceMsByDay.get(today) ?? 0;
  const plan = planReminders({
    today,
    minutesNow: localMinutes(now, clock.utcOffsetMinutes(now)),
    hour: settings.reminder.hour,
    goalReachedToday: dailyGoalProgress(practiceMs, settings.dailyGoal).reached,
    activeToday: progress.activeDays.has(today),
    streak: computeStreak(progress.activeDays, today).current,
  });
  return plan.map((reminder) => ({
    at: localTimeToEpoch(reminder.dayKey, settings.reminder.hour, (at) =>
      clock.utcOffsetMinutes(at),
    ),
    title: t('reminder.notif.title'),
    body: reminderBody(reminder.streak),
  }));
}

/** Délai après une leçon ou un réglage, pour regrouper les changements. */
export const REMINDER_SYNC_DELAY_MS = 1_000;

/**
 * Tient les rappels programmés à jour : au démarrage, au retour au premier plan, après chaque
 * leçon et à chaque réglage. Rien n'est reprogrammé si le plan n'a pas changé.
 */
export function useReminderSync(notifier: ReminderNotifier, enabled: boolean): void {
  useEffect(() => {
    if (!notifier.supported || !enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastPlan: string | null = null;

    const run = async () => {
      const { settings, events, clock } = useProgressStore.getState();
      const allowed = settings.reminder.enabled && (await notifier.permission()) === 'granted';
      const reminders = allowed
        ? buildReminders({ settings, progress: applyEvents(events), clock, now: clock.now() })
        : [];
      const plan = JSON.stringify(reminders);
      if (plan === lastPlan) return;
      await notifier.replaceAll(reminders);
      lastPlan = plan;
    };
    const schedule = (delayMs: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        run().catch((error: unknown) => console.warn('Rappels non programmés', error));
      }, delayMs);
    };

    schedule(0);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule(0);
    });
    const unsubscribe = useProgressStore.subscribe((state, previous) => {
      if (state.events !== previous.events || state.settings !== previous.settings) {
        schedule(REMINDER_SYNC_DELAY_MS);
      }
    });
    return () => {
      clearTimeout(timer);
      appState.remove();
      unsubscribe();
    };
  }, [notifier, enabled]);
}
