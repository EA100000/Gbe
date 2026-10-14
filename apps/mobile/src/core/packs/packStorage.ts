import { Directory, File, Paths } from 'expo-file-system';

import type { PackRef, PackStorage } from './packStorage.types';

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

const packsRoot = () => new Directory(Paths.document, 'packs');
const stagingRoot = () => new Directory(Paths.document, 'packs-staging');
const versionDir = (ref: PackRef) => new Directory(packsRoot(), ref.id, String(ref.version));

/**
 * Android et iOS : packs dans le dossier documents de l'appli (conservé entre les lancements).
 * Un téléchargement s'écrit dans packs-staging/, puis le dossier est déplacé d'un bloc :
 * une version à moitié écrite n'est jamais visible.
 */
export function createPackStorage(): PackStorage | null {
  return {
    async list() {
      const root = packsRoot();
      if (!root.exists) return [];
      const refs: PackRef[] = [];
      for (const idDir of root.list()) {
        if (!(idDir instanceof Directory) || !ID_PATTERN.test(idDir.name)) continue;
        for (const versionEntry of idDir.list()) {
          const version = Number(versionEntry.name);
          if (versionEntry instanceof Directory && Number.isInteger(version) && version > 0) {
            refs.push({ id: idDir.name, version });
          }
        }
      }
      return refs;
    },

    async readBytes(ref, path) {
      const file = new File(versionDir(ref), path);
      return file.exists ? await file.bytes() : null;
    },

    async fileSize(ref, path) {
      const file = new File(versionDir(ref), path);
      return file.exists ? file.size : null;
    },

    uri: (ref, path) => new File(versionDir(ref), path).uri,

    async beginInstall(ref) {
      const dir = new Directory(stagingRoot(), `${ref.id}-${ref.version}`);
      if (dir.exists) dir.delete();
      dir.create({ intermediates: true });
      return {
        async write(path, bytes) {
          const file = new File(dir, path);
          file.create({ intermediates: true, overwrite: true });
          file.write(bytes);
        },
        async commit() {
          const target = versionDir(ref);
          if (target.exists) target.delete();
          new Directory(packsRoot(), ref.id).create({ intermediates: true, idempotent: true });
          await dir.move(target);
        },
        async abort() {
          if (dir.exists) dir.delete();
        },
      };
    },

    async remove(ref) {
      const dir = versionDir(ref);
      if (dir.exists) dir.delete();
    },
  };
}
