import { fr, type TranslationKey } from './fr';

export type { TranslationKey };

type Params = Readonly<Record<string, string | number>>;

/** Traduit une clé et remplace les {paramètres}. Français seulement pour l'instant. */
export function t(key: TranslationKey, params: Params = {}): string {
  return fr[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Choisit la forme au singulier (0 ou 1, règle française) ou au pluriel. */
export function tPlural(
  count: number,
  one: TranslationKey,
  other: TranslationKey,
  params: Params = {},
): string {
  return t(count <= 1 ? one : other, { n: count, ...params });
}

/** Durée au format m:ss, comme sur l'écran de fin (2:48). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Attente à la française : « 24 min », « 2 h 24 », « 3 h » (arrondie à la minute supérieure). */
export function formatWait(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes < 60) return t('time.minutes', { n: minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0
    ? t('time.hoursExact', { h })
    : t('time.hours', { h, m: String(m).padStart(2, '0') });
}

/** Pourcentage arrondi avec espace insécable, à la française (90 %). */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}\u00a0%`;
}
