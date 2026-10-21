/**
 * Suite du programme sur le chemin (écran 23, ADR 0018) : les unités prévues dont le pack
 * n'est pas encore là apparaissent « en préparation », avec leur titre français.
 */

/** Une section du programme compte vingt unités (programme du cours, 25 sections). */
export const UNITS_PER_SECTION = 20;

export interface PlannedUnit {
  id: string;
  order: number;
  title: string;
  subtitle: string;
}

export interface ProgrammeOverview {
  /** Section en cours : celle de la première unité pas encore prête. */
  section: number;
  /** Unités de cette section déjà jouables. */
  ready: number;
  /** Unités prévues dans cette section (prêtes ou non). */
  total: number;
  /** Unités prévues sans pack, dans l'ordre du programme. */
  upcoming: PlannedUnit[];
}

/** Section d'une unité d'après son ordre : 1 à 20 → section 1, 21 à 40 → section 2… */
export function sectionOf(order: number): number {
  return Math.max(1, Math.ceil(order / UNITS_PER_SECTION));
}

/**
 * Compare le programme aux unités disponibles. Une unité disponible absente du programme
 * compte quand même comme prête dans sa section.
 */
export function programmeOverview(
  planned: readonly PlannedUnit[],
  available: readonly { id: string; order: number }[],
): ProgrammeOverview {
  const availableIds = new Set(available.map((u) => u.id));
  const upcoming = planned.filter((u) => !availableIds.has(u.id)).sort((a, b) => a.order - b.order);
  const lastAvailable = Math.max(0, ...available.map((u) => u.order));
  const section = sectionOf(upcoming[0]?.order ?? lastAvailable);

  const ids = new Set(
    [...planned, ...available].filter((u) => sectionOf(u.order) === section).map((u) => u.id),
  );
  const ready = [...ids].filter((id) => availableIds.has(id)).length;
  return { section, ready, total: ids.size, upcoming };
}
