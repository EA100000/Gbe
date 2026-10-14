/** Autorisation d'afficher des notifications. `blocked` : refusée, il faut passer par les réglages. */
export type NotificationPermission = 'granted' | 'undetermined' | 'blocked';

export interface ScheduledReminder {
  at: number;
  title: string;
  body: string;
}

/** Notifications locales du téléphone (rappel quotidien). Sur le web : non prises en charge. */
export interface ReminderNotifier {
  supported: boolean;
  permission(): Promise<NotificationPermission>;
  /** Demande l'autorisation (fenêtre du système). */
  request(): Promise<NotificationPermission>;
  /** Remplace tous les rappels programmés par ceux-ci. */
  replaceAll(reminders: readonly ScheduledReminder[]): Promise<void>;
  openSettings(): void;
}
