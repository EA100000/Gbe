import { z } from 'zod';

import { FrTextSchema, IdSchema } from './schema';

/**
 * Programme du cours : toutes les unités prévues, prêtes ou non (ADR 0018).
 * Généré par `npm run content:build` depuis les packs et les bons de commande
 * (`content/sources/<pack>/commande.json`). Il ne contient que du français : aucun mot fon.
 */
export const PROGRAMME_FILE = 'programme.json';

export const ProgrammeUnitSchema = z
  .object({
    id: IdSchema,
    order: z.number().int().positive(),
    title: FrTextSchema,
    subtitle: FrTextSchema,
  })
  .strict();

export const ProgrammeSchema = z
  .object({
    formatVersion: z.literal(1),
    units: z.array(ProgrammeUnitSchema),
  })
  .strict()
  .refine((p) => new Set(p.units.map((u) => u.id)).size === p.units.length, {
    error: 'Une unité apparaît deux fois dans le programme',
  })
  .refine((p) => new Set(p.units.map((u) => u.order)).size === p.units.length, {
    error: 'Deux unités ont le même ordre dans le programme',
  });

export type ProgrammeUnit = z.infer<typeof ProgrammeUnitSchema>;
export type Programme = z.infer<typeof ProgrammeSchema>;

export type ProgrammeResult = { ok: true; programme: Programme } | { ok: false; issues: string[] };

/** Valide un programme lu sur disque ou embarqué ; les unités ressortent triées par ordre. */
export function validateProgramme(input: unknown): ProgrammeResult {
  const parsed = ProgrammeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => `${i.path.join('.') || '(racine)'} : ${i.message}`),
    };
  }
  const units = [...parsed.data.units].sort((a, b) => a.order - b.order);
  return { ok: true, programme: { ...parsed.data, units } };
}
