import { validateProgramme } from '@gbe/content-schema';
import type { PlannedUnit } from '@gbe/domain';

import { bundledProgramme } from '../../content/bundled-packs.generated';

/**
 * Unités prévues du programme (ADR 0018), validées par Zod.
 * Un programme illisible ne bloque pas l'appli : le chemin n'affiche alors que les unités prêtes.
 */
export function loadPlannedUnits(raw: unknown): PlannedUnit[] {
  const result = validateProgramme(raw);
  if (result.ok) return result.programme.units;
  console.error('Programme embarqué invalide', result.issues);
  return [];
}

export const plannedUnits: readonly PlannedUnit[] = loadPlannedUnits(bundledProgramme);
