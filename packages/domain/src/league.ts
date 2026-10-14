/**
 * Ligue de la semaine (écran 9 de la maquette).
 * Règles provisoires de la bêta, à confirmer (voir docs/adr/0009) :
 * - une semaine va du lundi 0 h au dimanche 24 h, heure du Bénin (UTC+1, sans heure d'été) ;
 * - les apprenants sont regroupés par 30 au plus, dans l'ordre où ils ouvrent la Ligue ;
 * - le classement suit les XP gagnés pendant la semaine ; à égalité, le premier arrivé passe devant ;
 * - une seule ligue pour l'instant : les 5 premiers sont mis en avant, sans montée.
 */
export const LEAGUE_UTC_OFFSET_MINUTES = 60;
export const LEAGUE_GROUP_SIZE = 30;
export const LEAGUE_TOP_COUNT = 5;

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export interface LeagueWeek {
  /** Lundi de la semaine, « AAAA-MM-JJ » : identifie la semaine. */
  key: string;
  /** Début et fin (exclue) de la semaine, en millisecondes depuis 1970. */
  start: number;
  end: number;
}

/** Semaine de Ligue qui contient l'instant donné. */
export function leagueWeek(epochMs: number): LeagueWeek {
  const offset = LEAGUE_UTC_OFFSET_MINUTES * 60_000;
  const localDay = Math.floor((epochMs + offset) / DAY_MS);
  // Le 1er janvier 1970 était un jeudi : (jour + 3) % 7 donne 0 pour lundi.
  const mondayIndex = (((localDay + 3) % 7) + 7) % 7;
  const monday = localDay - mondayIndex;
  const start = monday * DAY_MS - offset;
  return {
    key: new Date(monday * DAY_MS).toISOString().slice(0, 10),
    start,
    end: start + WEEK_MS,
  };
}

/** Jours restants avant la fin de la semaine, arrondis au jour supérieur (« Encore 3 jours »). */
export function leagueDaysLeft(weekEnd: number, now: number): number {
  return Math.max(0, Math.ceil((weekEnd - now) / DAY_MS));
}

export interface LeagueEntry {
  xp: number;
  /** Ordre d'arrivée dans le groupe : départage les égalités. */
  joinedAt: number;
}

/** Classe un groupe : XP décroissants, puis premier arrivé. Ne modifie pas l'entrée. */
export function rankLeague<T extends LeagueEntry>(entries: readonly T[]): (T & { rank: number })[] {
  return [...entries]
    .sort((a, b) => b.xp - a.xp || a.joinedAt - b.joinedAt)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}
