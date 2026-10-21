// Programme du cours (ADR 0018) : les unités des packs, puis celles des bons de commande.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { type Programme, type ProgrammeUnit, validatePack } from '@gbe/content-schema';
import { UnitPlanSchema } from '@gbe/content-tools';

import { listPackDirs, readJson, ROOT } from './packs';

export const SOURCES_DIR = join(ROOT, 'content', 'sources');
export const PROGRAMME_JSON = join(ROOT, 'content', 'programme.json');

/**
 * Construit le programme. Une unité qui a un pack prend son titre dans le pack ;
 * sinon dans son bon de commande. Lève une erreur sur un bon de commande illisible.
 */
export function buildProgramme(): Programme {
  const units = new Map<string, ProgrammeUnit>();
  for (const dir of listPackDirs()) {
    const result = validatePack(readJson(join(dir, 'pack.json')));
    if (!result.ok) continue;
    const { id, order, title, subtitle } = result.pack.unit;
    units.set(id, { id, order, title, subtitle });
  }
  const sources = existsSync(SOURCES_DIR)
    ? readdirSync(SOURCES_DIR, { withFileTypes: true }).filter((e) => e.isDirectory())
    : [];
  for (const entry of sources) {
    const file = join(SOURCES_DIR, entry.name, 'commande.json');
    if (!existsSync(file)) continue;
    const plan = UnitPlanSchema.safeParse(readJson(file));
    if (!plan.success) throw new Error(`Bon de commande illisible : ${entry.name}/commande.json`);
    const { id, order, title, subtitle } = plan.data.unit;
    if (!units.has(id)) units.set(id, { id, order, title, subtitle });
  }
  return {
    formatVersion: 1,
    units: [...units.values()].sort((a, b) => a.order - b.order),
  };
}

export const renderProgramme = (programme: Programme): string =>
  `${JSON.stringify(programme, null, 2)}\n`;
