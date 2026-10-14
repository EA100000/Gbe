import { REMINDER_HOURS, REMINDER_PRESET_HOURS } from '@gbe/domain';
import type { IconName } from '@gbe/ui';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { t, type TranslationKey } from '../../core/i18n';
import { useProgressStore, useProgressView } from '../../core/progress/progressStore';
import { reminderNotifier } from '../../core/reminders/notifier';
import type { NotificationPermission } from '../../core/reminders/notifierTypes';
import { formatReminderHour, reminderBody } from '../../core/reminders/reminderSchedule';
import { useNow } from '../../core/useNow';

/** `profile` : réglage depuis le Profil ; `lesson` : proposition après la première leçon. */
export type ReminderOrigin = 'profile' | 'lesson';

const PRESETS: readonly { hour: number; label: TranslationKey; icon: IconName }[] = [
  { hour: REMINDER_PRESET_HOURS[0], label: 'reminder.preset.morning', icon: 'sunrise' },
  { hour: REMINDER_PRESET_HOURS[1], label: 'reminder.preset.noon', icon: 'sun' },
  { hour: REMINDER_PRESET_HOURS[2], label: 'reminder.preset.evening', icon: 'sunset' },
  { hour: REMINDER_PRESET_HOURS[3], label: 'reminder.preset.night', icon: 'moon' },
];

/** Écran 15 : rappel quotidien. */
export function useReminderController(origin: ReminderOrigin) {
  const settings = useProgressStore((s) => s.settings);
  const setReminder = useProgressStore((s) => s.setReminder);
  const markReminderOffered = useProgressStore((s) => s.markReminderOffered);
  const now = useNow();
  const { streak } = useProgressView(now);
  const [permission, setPermission] = useState<NotificationPermission | 'loading'>('loading');
  const [lessonHour, setLessonHour] = useState(settings.reminder.hour);
  const [otherOpen, setOtherOpen] = useState(false);

  // Autorisation relue à l'ouverture et au retour des réglages du téléphone.
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void reminderNotifier.permission().then((next) => {
        if (active) setPermission(next);
      });
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  // Proposé une seule fois après la première leçon, quelle que soit la réponse.
  useEffect(() => {
    if (origin === 'lesson') void markReminderOffered();
  }, [origin, markReminderOffered]);

  const fromLesson = origin === 'lesson';
  const blocked = !fromLesson && permission === 'blocked';
  // Pendant la lecture de l'autorisation, on se fie au réglage pour éviter un clignotement.
  const on =
    fromLesson ||
    (settings.reminder.enabled && (permission === 'granted' || permission === 'loading'));
  const hour = fromLesson ? lessonHour : settings.reminder.hour;

  const pickHour = useCallback(
    (next: number) => {
      setOtherOpen(false);
      if (fromLesson) setLessonHour(next);
      else void setReminder({ hour: next });
    },
    [fromLesson, setReminder],
  );

  const askPermission = useCallback(async (): Promise<boolean> => {
    const granted = permission === 'granted' ? 'granted' : await reminderNotifier.request();
    setPermission(granted);
    return granted === 'granted';
  }, [permission]);

  const toggle = useCallback(async () => {
    if (on) {
      await setReminder({ enabled: false });
      return;
    }
    if (await askPermission()) await setReminder({ enabled: true });
  }, [askPermission, on, setReminder]);

  const toPath = () => router.dismissTo('/');

  const activate = useCallback(async () => {
    if (await askPermission()) await setReminder({ enabled: true, hour: lessonHour });
    router.dismissTo('/');
  }, [askPermission, lessonHour, setReminder]);

  const isPreset = PRESETS.some((p) => p.hour === hour);
  return {
    fromLesson,
    blocked,
    on,
    status: on ? t('reminder.everyDay', { time: formatReminderHour(hour) }) : t('reminder.off'),
    presets: PRESETS.map((preset) => ({
      ...preset,
      time: formatReminderHour(preset.hour),
      selected: preset.hour === hour,
      pick: () => pickHour(preset.hour),
    })),
    otherLabel: isPreset
      ? t('reminder.otherTime')
      : t('reminder.otherTimeValue', { time: formatReminderHour(hour) }),
    otherSelected: !isPreset,
    otherOpen,
    toggleOther: () => setOtherOpen((open) => !open),
    otherHours: REMINDER_HOURS.map((h) => ({
      hour: h,
      time: formatReminderHour(h),
      selected: h === hour,
      pick: () => pickHour(h),
    })),
    preview: {
      from: t('reminder.previewFrom', { time: formatReminderHour(hour) }),
      title: t('reminder.notif.title'),
      body: reminderBody(streak.current),
    },
    toggle: () => void toggle(),
    openSettings: reminderNotifier.openSettings,
    activate: () => void activate(),
    later: toPath,
    close: () => {
      if (router.canGoBack()) router.back();
      else router.replace('/profil');
    },
  };
}
