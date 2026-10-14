import { applyEvents, type GameEvent } from '@gbe/domain';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications';
import { Linking } from 'react-native';

import { DEFAULT_SETTINGS, type Settings } from '../../core/db/repositories';
import { lessonCompletedEvent } from '../../core/progress/eventFactory';
import { useProgressStore } from '../../core/progress/progressStore';
import type { ReminderNotifier, ScheduledReminder } from '../../core/reminders/notifierTypes';
import { buildReminders, useReminderSync } from '../../core/reminders/reminderSchedule';
import { fakeClock, setupStores } from '../../test-utils/fixtures';
import { LessonEndScreen } from '../lesson/LessonEndScreen';
import { ProfileScreen } from '../profile/ProfileScreen';
import { ReminderScreen } from './ReminderScreen';

const permissions = { granted: true, canAskAgain: true };
const asked = { granted: true, canAskAgain: true };

beforeEach(() => {
  jest.clearAllMocks();
  permissions.granted = true;
  permissions.canAskAgain = true;
  asked.granted = true;
  asked.canAskAgain = true;
  jest.mocked(getPermissionsAsync).mockImplementation(async () => ({ ...permissions }) as never);
  jest.mocked(requestPermissionsAsync).mockImplementation(async () => ({ ...asked }) as never);
});

/** Une leçon de `minutes` minutes, terminée à l'heure de l'horloge. */
function lesson(clock: ReturnType<typeof fakeClock>, minutes: number): GameEvent {
  return lessonCompletedEvent(clock, {
    lessonId: 'u01-l01',
    unitId: 'u01',
    packId: 'u01-salutations',
    packVersion: 1,
    xp: 15,
    accuracy: 0.9,
    durationMs: minutes * 60_000,
  });
}

const enabled: Settings = { ...DEFAULT_SETTINGS, reminder: { enabled: true, hour: 19 } };

describe('rappels programmés', () => {
  // Horloge de test : 13/10/2026 à 9 h UTC, soit 10 h au Bénin (UTC+1).
  it('n’en programme aucun quand le rappel est éteint', () => {
    const clock = fakeClock();
    expect(
      buildReminders({
        settings: DEFAULT_SETTINGS,
        progress: applyEvents([]),
        clock,
        now: clock.now(),
      }),
    ).toEqual([]);
  });

  it('programme 19 h heure locale dès aujourd’hui, avec un message général sans série', () => {
    const clock = fakeClock();

    const reminders = buildReminders({
      settings: enabled,
      progress: applyEvents([]),
      clock,
      now: clock.now(),
    });

    expect(reminders).toHaveLength(7);
    expect(new Date(reminders[0]?.at ?? 0).toISOString()).toBe('2026-10-13T18:00:00.000Z');
    expect(reminders[0]).toMatchObject({
      title: 'C’est l’heure de ta leçon !',
      body: 'Quelques minutes suffisent pour avancer en fon.',
    });
  });

  it('saute aujourd’hui quand l’objectif est atteint, et cite la série pour demain', () => {
    const clock = fakeClock();
    const progress = applyEvents([lesson(clock, 12)]);

    const reminders = buildReminders({ settings: enabled, progress, clock, now: clock.now() });

    expect(new Date(reminders[0]?.at ?? 0).toISOString()).toBe('2026-10-14T18:00:00.000Z');
    expect(reminders[0]?.body).toBe('Quelques minutes suffisent pour garder ta série de 1 jour.');
    expect(reminders[1]?.body).toBe('Quelques minutes suffisent pour avancer en fon.');
  });

  it('se tient à jour quand le rappel change', async () => {
    // Préparer : un faux téléphone qui garde la liste des rappels programmés.
    await setupStores();
    let scheduled: readonly ScheduledReminder[] = [];
    const notifier: ReminderNotifier = {
      supported: true,
      permission: async () => 'granted',
      request: async () => 'granted',
      replaceAll: jest.fn(async (reminders: readonly ScheduledReminder[]) => {
        scheduled = reminders;
      }),
      openSettings: jest.fn(),
    };
    function Host() {
      useReminderSync(notifier, true);
      return null;
    }
    await render(<Host />);
    await waitFor(() => expect(notifier.replaceAll).toHaveBeenCalledTimes(1));
    expect(scheduled).toEqual([]);

    // Agir
    await act(async () => {
      await useProgressStore.getState().setReminder({ enabled: true, hour: 21 });
    });

    // Vérifier
    await waitFor(() => expect(scheduled).toHaveLength(7), { timeout: 3_000 });
  });
});

describe('écran 15 depuis le profil', () => {
  beforeEach(async () => {
    await setupStores();
    await useProgressStore.getState().completeOnboarding('regular');
  });

  it('affiche le rappel éteint dans le profil, puis ouvre l’écran', async () => {
    await render(<ProfileScreen />);

    expect(screen.getByLabelText('Rappel quotidien : Désactivé')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('profile-reminder'));
    expect(router.push).toHaveBeenCalledWith('/rappel');
  });

  it('allume le rappel après l’accord du téléphone, puis change l’heure', async () => {
    permissions.granted = false;
    await render(<ReminderScreen origin="profile" />);

    await fireEvent.press(await screen.findByTestId('reminder-switch'));
    await waitFor(() => expect(useProgressStore.getState().settings.reminder.enabled).toBe(true));
    expect(requestPermissionsAsync).toHaveBeenCalled();
    expect(await screen.findByText('Chaque jour à 19 h')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('reminder-hour-7'));
    expect(useProgressStore.getState().settings.reminder.hour).toBe(7);

    await fireEvent.press(screen.getByTestId('reminder-other'));
    await fireEvent.press(screen.getByTestId('reminder-other-20'));
    expect(useProgressStore.getState().settings.reminder.hour).toBe(20);
    expect(screen.getByText('Autre heure : 20 h')).toBeOnTheScreen();
  });

  it('reste éteint si le téléphone refuse', async () => {
    permissions.granted = false;
    asked.granted = false;
    await render(<ReminderScreen origin="profile" />);

    await fireEvent.press(await screen.findByTestId('reminder-switch'));

    expect(useProgressStore.getState().settings.reminder.enabled).toBe(false);
  });

  it('montre les notifications bloquées et mène aux réglages', async () => {
    permissions.granted = false;
    permissions.canAskAgain = false;
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await render(<ReminderScreen origin="profile" />);

    expect(
      await screen.findByText('Les notifications de Gbè sont bloquées sur ce téléphone.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('reminder-switch')).toBeNull();
    await fireEvent.press(screen.getByTestId('reminder-settings'));
    expect(openSettings).toHaveBeenCalled();
  });

  it('éteint le rappel', async () => {
    await useProgressStore.getState().setReminder({ enabled: true });
    await render(<ReminderScreen origin="profile" />);

    await fireEvent.press(await screen.findByTestId('reminder-switch'));

    expect(useProgressStore.getState().settings.reminder.enabled).toBe(false);
    expect(await screen.findByText('Désactivé')).toBeOnTheScreen();
  });
});

describe('écran 15 après la première leçon', () => {
  async function finishLesson() {
    await setupStores();
    await useProgressStore.getState().completeOnboarding('regular');
    useProgressStore.getState().setLastSummary({
      lessonId: 'u01-l01',
      xp: 15,
      accuracy: 0.9,
      durationMs: 120_000,
      streak: 1,
      summaryFr: null,
      unlockedStory: null,
    });
  }

  it('est proposé une seule fois, à la fin de la première leçon', async () => {
    await finishLesson();
    await render(<LessonEndScreen />);

    await fireEvent.press(screen.getByTestId('end-continue'));
    expect(router.replace).toHaveBeenCalledWith('/rappel?depart=lecon');

    await useProgressStore.getState().markReminderOffered();
    await fireEvent.press(screen.getByTestId('end-continue'));
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('active le rappel à l’heure choisie, puis ouvre le chemin', async () => {
    await finishLesson();
    await render(<ReminderScreen origin="lesson" />);
    expect(screen.getByText('Un petit rappel chaque jour ?')).toBeOnTheScreen();
    await waitFor(() => expect(useProgressStore.getState().settings.reminderOffered).toBe(true));

    await fireEvent.press(screen.getByTestId('reminder-hour-7'));
    await fireEvent.press(screen.getByTestId('reminder-activate'));

    await waitFor(() =>
      expect(useProgressStore.getState().settings.reminder).toEqual({ enabled: true, hour: 7 }),
    );
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('« Plus tard » ouvre le chemin sans rien activer', async () => {
    await finishLesson();
    await render(<ReminderScreen origin="lesson" />);

    await fireEvent.press(screen.getByTestId('reminder-later'));

    expect(router.dismissTo).toHaveBeenCalledWith('/');
    expect(useProgressStore.getState().settings.reminder.enabled).toBe(false);
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
