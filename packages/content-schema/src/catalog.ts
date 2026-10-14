import { z } from 'zod';

import { IdSchema, type Manifest, type Pack } from './schema';

/**
 * Catalogue des packs publiés : un fichier `catalog.json` à la racine du stockage (CDN).
 * L'appli le lit pour savoir quelles unités existent et dans quelle version.
 * Chaque version d'un pack vit dans son propre dossier, jamais réécrit : packs/<id>/<version>/.
 */
export const CATALOG_VERSION = 1;
export const CATALOG_FILE = 'catalog.json';
export const MANIFEST_FILE = 'manifest.json';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, { error: 'Empreinte SHA-256 invalide' });

export const CatalogEntrySchema = z.object({
  id: IdSchema,
  version: z.number().int().positive(),
  /** Format du pack : l'appli ignore ceux qu'elle ne sait pas lire. */
  formatVersion: z.number().int().positive(),
  unitOrder: z.number().int().positive(),
  title: z.string().trim().min(1),
  validated: z.boolean(),
  /** Dossier de cette version, relatif au catalogue, par exemple `packs/u01-salutations/2/`. */
  path: z.string().regex(/^packs\/[a-z0-9][a-z0-9_-]*\/[1-9][0-9]*\/$/, {
    error: 'Chemin de pack invalide',
  }),
  /** Empreinte du fichier manifest.json : elle garantit, par chaîne, celle de chaque fichier. */
  manifestSha256: Sha256Schema,
  /** Taille totale à télécharger, en octets. */
  bytes: z.number().int().nonnegative(),
});

export const CatalogSchema = z
  .object({
    catalogVersion: z.literal(CATALOG_VERSION),
    publishedAt: z.iso.datetime(),
    packs: z.array(CatalogEntrySchema),
  })
  .refine((c) => new Set(c.packs.map((p) => p.id)).size === c.packs.length, {
    error: 'Un pack apparaît deux fois dans le catalogue',
  });

export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
export type Catalog = z.infer<typeof CatalogSchema>;

/** Dossier d'une version de pack dans le stockage. */
export function packPath(id: string, version: number): string {
  return `packs/${id}/${version}/`;
}

/** Entrée de catalogue d'un pack dont le manifeste vient d'être écrit. */
export function catalogEntry(pack: Pack, manifest: Manifest, manifestSha256: string): CatalogEntry {
  return {
    id: pack.id,
    version: pack.version,
    formatVersion: pack.formatVersion,
    unitOrder: pack.unit.order,
    title: pack.unit.title,
    validated: pack.validated,
    path: packPath(pack.id, pack.version),
    manifestSha256,
    bytes: manifest.files.reduce((total, file) => total + file.bytes, 0),
  };
}

/** Catalogue trié par ordre des unités. Échoue si un pack y figure deux fois. */
export function buildCatalog(entries: readonly CatalogEntry[], publishedAt: Date): Catalog {
  const catalog = {
    catalogVersion: CATALOG_VERSION,
    publishedAt: publishedAt.toISOString(),
    packs: [...entries].sort((a, b) => a.unitOrder - b.unitOrder || a.id.localeCompare(b.id)),
  } as const;
  return CatalogSchema.parse(catalog);
}

export interface UploadPlan {
  /** Fichiers absents du stockage : à envoyer. */
  upload: string[];
  /** Fichiers déjà présents avec la même empreinte : rien à faire. */
  skip: string[];
  /** Fichiers déjà présents avec une autre empreinte : interdit, une version publiée ne change plus. */
  conflicts: string[];
}

/**
 * Décide quoi envoyer au stockage. Les fichiers de packs sont immuables :
 * republier une version avec un autre contenu est un conflit (il faut augmenter la version).
 * `remote` associe chaque clé déjà présente à son empreinte, ou `null` si elle est inconnue.
 */
export function planUpload(
  local: ReadonlyMap<string, string>,
  remote: ReadonlyMap<string, string | null>,
): UploadPlan {
  const plan: UploadPlan = { upload: [], skip: [], conflicts: [] };
  for (const [key, sha256] of [...local].sort(([a], [b]) => a.localeCompare(b))) {
    if (!remote.has(key)) plan.upload.push(key);
    else if (remote.get(key) === sha256) plan.skip.push(key);
    else plan.conflicts.push(key);
  }
  return plan;
}
