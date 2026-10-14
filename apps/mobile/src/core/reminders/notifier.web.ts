import type { ReminderNotifier } from './notifierTypes';

export type { NotificationPermission, ReminderNotifier, ScheduledReminder } from './notifierTypes';

/** Web : pas de notifications programmées ; le rappel n'est pas proposé. */
export const reminderNotifier: ReminderNotifier = {
  supported: false,
  permission: async () => 'blocked',
  request: async () => 'blocked',
  replaceAll: async () => undefined,
  openSettings: () => undefined,
};
