import {
  MANIFEST_FILE,
  ManifestSchema,
  PACK_FILE,
  type PackIssue,
  type PackIssueCode,
} from '@gbe/content-schema';

import { loadContent, type ContentResult, type LoadedContent } from '../content/content';
import { decodeUtf8 } from './utf8';
import type { PackRef, PackStorage, Sha256 } from './packStorage.types';

export interface LocalPacksDeps {
  storage: PackStorage;
  sha256: Sha256;
}

const fail = (code: PackIssueCode, path: string, message: string): ContentResult => ({
  ok: false,
  issues: [{ code, path, message } satisfies PackIssue],
});

/**
 * Relit une version installée avant de s'en servir : manifeste lisible, empreinte de pack.json
 * conforme, chaque audio présent avec la bonne taille. Les audios ont été vérifiés un par un
 * au téléchargement ; ici on écarte un dossier abîmé depuis (stockage plein, fichier effacé).
 */
export async function loadInstalledPack(
  ref: PackRef,
  { storage, sha256 }: LocalPacksDeps,
): Promise<ContentResult> {
  const manifestBytes = await storage.readBytes(ref, MANIFEST_FILE);
  if (manifestBytes === null)
    return fail('manifest_missing_file', MANIFEST_FILE, 'Manifeste absent');
  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(decodeUtf8(manifestBytes));
  } catch {
    return fail('schema', MANIFEST_FILE, 'Manifeste illisible');
  }
  const manifest = ManifestSchema.safeParse(manifestJson);
  if (!manifest.success) return fail('schema', MANIFEST_FILE, 'Manifeste invalide');
  if (manifest.data.packId !== ref.id || manifest.data.version !== ref.version) {
    return fail('manifest_mismatch', MANIFEST_FILE, 'Le manifeste décrit un autre pack');
  }

  const audioFiles: Record<string, string> = {};
  let packJson: unknown = null;
  for (const file of manifest.data.files) {
    if (file.path === PACK_FILE) {
      const bytes = await storage.readBytes(ref, PACK_FILE);
      if (bytes === null) return fail('manifest_missing_file', PACK_FILE, 'pack.json absent');
      if ((await sha256(bytes)) !== file.sha256) {
        return fail('hash_mismatch', PACK_FILE, 'pack.json modifié depuis le téléchargement');
      }
      try {
        packJson = JSON.parse(decodeUtf8(bytes));
      } catch {
        return fail('schema', PACK_FILE, 'pack.json illisible');
      }
    } else {
      if ((await storage.fileSize(ref, file.path)) !== file.bytes) {
        return fail('hash_mismatch', file.path, `Fichier absent ou tronqué : ${file.path}`);
      }
      audioFiles[file.path] = storage.uri(ref, file.path);
    }
  }
  if (packJson === null) return fail('manifest_missing_file', PACK_FILE, 'pack.json absent');

  const result = loadContent(packJson, audioFiles);
  if (
    result.ok &&
    (result.content.pack.id !== ref.id || result.content.pack.version !== ref.version)
  ) {
    return fail('manifest_mismatch', PACK_FILE, 'pack.json ne correspond pas à son dossier');
  }
  return result;
}

export interface PackChoice {
  /** Meilleure version de chaque pack, dans l'ordre des unités. */
  contents: LoadedContent[];
  /** Versions installées inutiles (plus anciennes ou abîmées) : à effacer. */
  obsolete: PackRef[];
}

/**
 * Choisit, pour chaque pack, la version la plus récente parmi le pack embarqué et les versions
 * installées valides. À version égale, le pack embarqué l'emporte (il ne peut pas être abîmé).
 */
export async function choosePacks(
  bundled: readonly LoadedContent[],
  deps: LocalPacksDeps | null,
): Promise<PackChoice> {
  const best = new Map<string, LoadedContent>();
  for (const content of bundled) {
    const current = best.get(content.pack.id);
    if (current === undefined || content.pack.version > current.pack.version) {
      best.set(content.pack.id, content);
    }
  }

  const obsolete: PackRef[] = [];
  const installed: LoadedContent[] = [];
  if (deps !== null) {
    for (const ref of await deps.storage.list()) {
      const result = await loadInstalledPack(ref, deps);
      if (result.ok) installed.push(result.content);
      else obsolete.push(ref);
    }
  }
  for (const content of installed) {
    const current = best.get(content.pack.id);
    if (current === undefined || content.pack.version > current.pack.version) {
      best.set(content.pack.id, content);
    }
  }
  for (const content of installed) {
    if (best.get(content.pack.id) !== content) {
      obsolete.push({ id: content.pack.id, version: content.pack.version });
    }
  }

  const contents = [...best.values()].sort(
    (a, b) => a.pack.unit.order - b.pack.unit.order || a.pack.id.localeCompare(b.pack.id),
  );
  return { contents, obsolete };
}
