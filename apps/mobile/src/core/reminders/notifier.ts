import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationChannelAsync,
  type NotificationPermissionsStatus,
} from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { t } from '../i18n';
import type { NotificationPermission, ReminderNotifier } from './notifierTypes';

export type { NotificationPermission, ReminderNotifier, ScheduledReminder } from './notifierTypes';

const CHANNEL = 'rappel-quotidien';

/** Android 8+ : chaque notification appartient à un canal, nommé dans les réglages du téléphone. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync(CHANNEL, {
    name: t('reminder.channel'),
    importance: AndroidImportance.DEFAULT,
  });
}

function toPermission(status: NotificationPermissionsStatus): NotificationPermission {
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'blocked';
}

/** Android et iOS : notifications locales (expo-notifications), aucune donnée vers un serveur. */
export const reminderNotifier: ReminderNotifier = {
  supported: true,
  permission: async () => toPermission(await getPermissionsAsync()),
  async request() {
    // Android 13+ : la fenêtre d'autorisation n'apparaît qu'une fois un canal créé.
    await ensureChannel();
    return toPermission(await requestPermissionsAsync());
  },
  async replaceAll(reminders) {
    await cancelAllScheduledNotificationsAsync();
    if (reminders.length === 0) return;
    await ensureChannel();
    for (const reminder of reminders) {
      await scheduleNotificationAsync({
        content: { title: reminder.title, body: reminder.body },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: reminder.at,
          channelId: CHANNEL,
        },
      });
    }
  },
  openSettings: () => void Linking.openSettings(),
};
