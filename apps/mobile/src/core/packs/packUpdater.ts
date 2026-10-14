import {
  CATALOG_FILE,
  CatalogSchema,
  SUPPORTED_FORMAT_VERSIONS,
  type Catalog,
  type CatalogEntry,
} from '@gbe/content-schema';

import { decodeUtf8 } from './utf8';
import type { InstallFailure, InstallResult } from './installer';
import type { FetchBytes, PackRef } from './packStorage.types';

/** Télécharge et valide le catalogue des packs publiés. */
export async function fetchCatalog(baseUrl: string, fetchBytes: FetchBytes): Promise<Catalog> {
  const bytes = await fetchBytes(`${baseUrl.replace(/\/+$/, '')}/${CATALOG_FILE}`);
  return CatalogSchema.parse(JSON.parse(decodeUtf8(bytes)));
}

/**
 * Adresse du catalogue, fixée au build (`EXPO_PUBLIC_PACKS_URL`).
 * Absente : aucune mise à jour, l'appli se contente du pack embarqué.
 */
export function packsUrl(
  raw: string | undefined = process.env.EXPO_PUBLIC_PACKS_URL,
): string | null {
  const url = raw?.trim();
  return url === undefined || url.length === 0 ? null : url;
}

export interface UpdateDeps {
  catalog: () => Promise<Catalog>;
  /** Versions déjà disponibles sur le téléphone (embarquées ou installées). */
  available: () => Promise<readonly PackRef[]>;
  /** Versions à ne pas retenter (« id@version »), par exemple refusées plus tôt dans la session. */
  skip?: ReadonlySet<string>;
  install: (entry: CatalogEntry) => Promise<InstallResult>;
}

export interface UpdateReport {
  installed: PackRef[];
  failed: { ref: PackRef; reason: InstallFailure }[];
}

/** Ce qu'il faut télécharger : versions plus récentes, dans un format que l'appli sait lire. */
export function packsToDownload(catalog: Catalog, available: readonly PackRef[]): CatalogEntry[] {
  const newest = new Map<string, number>();
  for (const ref of available) newest.set(ref.id, Math.max(ref.version, newest.get(ref.id) ?? 0));
  return catalog.packs.filter(
    (entry) =>
      (SUPPORTED_FORMAT_VERSIONS as readonly number[]).includes(entry.formatVersion) &&
      entry.version > (newest.get(entry.id) ?? 0),
  );
}

/**
 * Met les packs à jour : un par un, dans l'ordre des unités. Un échec n'empêche pas les suivants ;
 * il sera retenté au prochain passage. Le catalogue injoignable fait échouer l'appel (hors-ligne).
 */
export async function updatePacks(deps: UpdateDeps): Promise<UpdateReport> {
  const toDownload = packsToDownload(await deps.catalog(), await deps.available()).filter(
    (entry) => deps.skip?.has(`${entry.id}@${entry.version}`) !== true,
  );
  const report: UpdateReport = { installed: [], failed: [] };
  for (const entry of toDownload) {
    const result = await deps.install(entry);
    const ref = { id: entry.id, version: entry.version };
    if (result.ok) report.installed.push(ref);
    else report.failed.push({ ref, reason: result.reason });
  }
  return report;
}
