import { z } from 'zod';

import { t } from '../../core/i18n';

/**
 * Adresse qui reçoit les signalements des testeurs (`EXPO_PUBLIC_CONTACT_EMAIL`, fixée au build).
 * Absente ou invalide : la ligne « Signaler un problème » n'est pas affichée.
 */
export function contactEmail(
  raw: string | undefined = process.env.EXPO_PUBLIC_CONTACT_EMAIL,
): string | null {
  const parsed = z.email().safeParse(raw?.trim());
  return parsed.success ? parsed.data : null;
}

/** « Android (API 34) », « iOS 18.1 », « web ». */
export function describeSystem(os: string, version: string | number | undefined): string {
  if (os === 'android') return t('report.android', { api: String(version ?? '?') });
  if (os === 'ios') return t('report.ios', { version: String(version ?? '?') });
  return os;
}

/**
 * Lien « mailto: » d'un signalement, prêt à envoyer : objet et corps pré-remplis avec la version
 * de l'appli et du système. Rien d'autre (ni identifiant de compte, ni pseudo) : l'apprenant voit
 * tout le contenu avant d'envoyer.
 */
export function problemReportUrl(input: {
  email: string;
  appVersion: string;
  system: string;
}): string {
  const subject = t('report.subject', { version: input.appVersion });
  const body = t('report.body', { version: input.appVersion, system: input.system });
  return `mailto:${input.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Version 0.x : l'appli est en bêta. */
export function isBeta(appVersion: string): boolean {
  return appVersion.startsWith('0.');
}
