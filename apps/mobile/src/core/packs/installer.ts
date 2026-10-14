import {
  MANIFEST_FILE,
  ManifestSchema,
  PACK_FILE,
  validatePack,
  verifyManifest,
  type CatalogEntry,
  type Manifest,
} from '@gbe/content-schema';

import { decodeUtf8 } from './utf8';
import type { FetchBytes, PackInstall, PackRef, PackStorage, Sha256 } from './packStorage.types';

/** network : réseau ; integrity : empreinte fausse ; invalid : contenu refusé ; storage : écriture impossible. */
export type InstallFailure = 'network' | 'integrity' | 'invalid' | 'storage';

export type InstallResult =
  { ok: true; ref: PackRef } | { ok: false; reason: InstallFailure; detail: string };

export interface InstallDeps {
  /** Adresse du dossier qui contient catalog.json. */
  baseUrl: string;
  fetchBytes: FetchBytes;
  sha256: Sha256;
  storage: PackStorage;
}

/** Chemin de fichier sûr : relatif, sans remontée de dossier ni caractère exotique. */
const SAFE_PATH = /^(?!.*\.\.)[a-z0-9_-][a-z0-9_./-]*$/;

class InstallError extends Error {
  constructor(
    readonly reason: InstallFailure,
    message: string,
  ) {
    super(message);
  }
}

/** Adresse d'un fichier d'une version de pack. */
export function packFileUrl(baseUrl: string, entry: CatalogEntry, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${entry.path}${path}`;
}

async function download(deps: InstallDeps, url: string): Promise<Uint8Array> {
  try {
    return await deps.fetchBytes(url);
  } catch (error) {
    throw new InstallError('network', error instanceof Error ? error.message : String(error));
  }
}

function parseJson(bytes: Uint8Array, what: string): unknown {
  try {
    return JSON.parse(decodeUtf8(bytes));
  } catch {
    throw new InstallError('invalid', `${what} illisible`);
  }
}

/**
 * Télécharge et installe une version de pack, en vérifiant toute la chaîne d'empreintes :
 * catalogue → manifeste → chaque fichier. Puis le pack est validé (schéma et cohérence).
 * Au moindre écart, rien n'est installé : le pack déjà présent reste utilisé.
 */
export async function installPack(entry: CatalogEntry, deps: InstallDeps): Promise<InstallResult> {
  const ref = { id: entry.id, version: entry.version };
  let install: PackInstall | null = null;
  try {
    const manifestBytes = await download(deps, packFileUrl(deps.baseUrl, entry, MANIFEST_FILE));
    if ((await deps.sha256(manifestBytes)) !== entry.manifestSha256) {
      throw new InstallError('integrity', 'Empreinte du manifeste différente du catalogue');
    }
    const parsed = ManifestSchema.safeParse(parseJson(manifestBytes, 'Manifeste'));
    if (!parsed.success) throw new InstallError('invalid', 'Manifeste invalide');
    const manifest: Manifest = parsed.data;
    if (manifest.packId !== entry.id || manifest.version !== entry.version) {
      throw new InstallError('integrity', 'Le manifeste décrit un autre pack');
    }
    const unsafe = manifest.files.find((file) => !SAFE_PATH.test(file.path));
    if (unsafe !== undefined) throw new InstallError('invalid', `Chemin refusé : ${unsafe.path}`);

    install = await deps.storage.beginInstall(ref);
    const hashes = new Map<string, string>();
    let packBytes: Uint8Array | null = null;
    for (const file of manifest.files) {
      const bytes = await download(deps, packFileUrl(deps.baseUrl, entry, file.path));
      const hash = await deps.sha256(bytes);
      if (bytes.length !== file.bytes || hash !== file.sha256) {
        throw new InstallError('integrity', `Fichier altéré : ${file.path}`);
      }
      hashes.set(file.path, hash);
      if (file.path === PACK_FILE) packBytes = bytes;
      await install.write(file.path, bytes);
    }
    if (packBytes === null) throw new InstallError('invalid', 'pack.json absent du manifeste');

    const pack = validatePack(parseJson(packBytes, 'pack.json'));
    if (!pack.ok) throw new InstallError('invalid', 'Pack invalide');
    if (!verifyManifest(manifest, hashes, pack.pack).ok) {
      throw new InstallError('invalid', 'Le manifeste ne couvre pas tous les fichiers du pack');
    }

    await install.write(MANIFEST_FILE, manifestBytes);
    await install.commit();
    return { ok: true, ref };
  } catch (error) {
    await install?.abort().catch(() => undefined);
    if (error instanceof InstallError)
      return { ok: false, reason: error.reason, detail: error.message };
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: 'storage', detail };
  }
}
