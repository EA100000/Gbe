import { createHash } from 'node:crypto';

import {
  catalogEntry,
  MANIFEST_FILE,
  PACK_FILE,
  validatePack,
  type CatalogEntry,
  type Manifest,
} from '@gbe/content-schema';

import type {
  FetchBytes,
  PackInstall,
  PackRef,
  PackStorage,
  Sha256,
} from '../core/packs/packStorage.types';
import { bundledPacks } from '../content/bundled-packs.generated';

export const CDN = 'https://cdn.test/gbe';

const encoder = new TextEncoder();
export const nodeSha256: Sha256 = async (bytes) => createHash('sha256').update(bytes).digest('hex');
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const key = (ref: PackRef) => `${ref.id}@${ref.version}`;

/** Pack de l'unité 1 (pack embarqué) avec une autre version : de quoi simuler une mise à jour. */
export function bundledPackJson(version: number): Record<string, unknown> {
  const raw = bundledPacks[0]?.pack;
  if (raw === undefined) throw new Error('Aucun pack embarqué');
  return { ...(structuredClone(raw) as Record<string, unknown>), version };
}

export interface PublishedPack {
  entry: CatalogEntry;
  manifest: Manifest;
  /** Chemin relatif → octets, manifest.json compris. */
  files: Map<string, Uint8Array>;
}

/** Publie un pack comme le ferait `npm run packs:publish` (audios factices mais cohérents). */
export function publish(packJson: Record<string, unknown>): PublishedPack {
  const result = validatePack(packJson);
  if (!result.ok) throw new Error(`Pack de test invalide : ${JSON.stringify(result.issues)}`);
  const { pack } = result;
  const files = new Map<string, Uint8Array>();
  files.set(PACK_FILE, encoder.encode(JSON.stringify(packJson)));
  for (const audio of pack.audios)
    files.set(audio.file, encoder.encode(`audio:${audio.id}:v${pack.version}`));
  const manifest: Manifest = {
    formatVersion: pack.formatVersion,
    packId: pack.id,
    version: pack.version,
    files: [...files].map(([path, bytes]) => ({ path, sha256: sha(bytes), bytes: bytes.length })),
  };
  const manifestBytes = encoder.encode(JSON.stringify(manifest));
  files.set(MANIFEST_FILE, manifestBytes);
  return { entry: catalogEntry(pack, manifest, sha(manifestBytes)), manifest, files };
}

/** Faux CDN : sert les packs publiés et compte les téléchargements. */
export function fakeCdn(packs: readonly PublishedPack[], catalogOverride?: unknown) {
  const urls = new Map<string, Uint8Array>();
  for (const { entry, files } of packs) {
    for (const [path, bytes] of files) urls.set(`${CDN}/${entry.path}${path}`, bytes);
  }
  const catalog = catalogOverride ?? {
    catalogVersion: 1,
    publishedAt: '2026-10-14T10:00:00.000Z',
    packs: packs.map((p) => p.entry),
  };
  urls.set(`${CDN}/catalog.json`, encoder.encode(JSON.stringify(catalog)));
  const requests: string[] = [];
  const fetchBytes: FetchBytes = async (url) => {
    requests.push(url);
    const bytes = urls.get(url);
    if (bytes === undefined) throw new Error(`404 ${url}`);
    return bytes;
  };
  return { fetchBytes, requests, urls };
}

/** Stockage des packs en mémoire, avec le même contrat que le stockage du téléphone. */
export function memoryPackStorage() {
  const installed = new Map<string, Map<string, Uint8Array>>();
  const staging = new Set<string>();
  const storage: PackStorage = {
    list: async () =>
      [...installed.keys()].map((k) => {
        const [id = '', version = '0'] = k.split('@');
        return { id, version: Number(version) };
      }),
    readBytes: async (ref, path) => installed.get(key(ref))?.get(path) ?? null,
    fileSize: async (ref, path) => installed.get(key(ref))?.get(path)?.length ?? null,
    uri: (ref, path) => `file:///packs/${ref.id}/${ref.version}/${path}`,
    beginInstall: async (ref): Promise<PackInstall> => {
      const files = new Map<string, Uint8Array>();
      staging.add(key(ref));
      return {
        write: async (path, bytes) => {
          files.set(path, bytes);
        },
        commit: async () => {
          installed.set(key(ref), files);
          staging.delete(key(ref));
        },
        abort: async () => {
          staging.delete(key(ref));
        },
      };
    },
    remove: async (ref) => {
      installed.delete(key(ref));
    },
  };
  return { storage, installed, staging };
}
