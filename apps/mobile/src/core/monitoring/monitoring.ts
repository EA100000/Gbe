import * as Sentry from '@sentry/react-native';

/**
 * Rapports de plantage (Sentry), actifs seulement si `EXPO_PUBLIC_SENTRY_DSN` est défini au build.
 * Aucune donnée personnelle : pas d'identifiant de compte, pas de pseudo, pas d'adresse IP envoyée
 * par l'appli (à compléter côté Sentry par l'option « ne pas stocker les adresses IP »).
 */
export function initMonitoring(
  dsn: string | undefined = process.env.EXPO_PUBLIC_SENTRY_DSN,
): boolean {
  const value = dsn?.trim();
  if (value === undefined || value.length === 0) return false;
  Sentry.init({
    dsn: value,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    environment: __DEV__ ? 'development' : 'production',
    beforeSend(event) {
      delete event.user;
      return event;
    },
  });
  return true;
}
