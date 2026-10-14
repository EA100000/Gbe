// Génère le module TypeScript qui embarque les packs dans l'appli mobile.
import { join, relative } from 'node:path';

import { MOBILE_BUNDLE_FILE } from './packs';

export interface BundledPackSource {
  dir: string;
  audioFiles: string[];
}

export function renderBundleModule(packs: readonly BundledPackSource[]): string {
  const fromMobile = (path: string) =>
    relative(join(MOBILE_BUNDLE_FILE, '..'), path).split('\\').join('/');
  const entries = packs
    .map(({ dir, audioFiles }) => {
      const audio = audioFiles
        .map((file) => `      '${file}': require('${fromMobile(join(dir, file))}'),`)
        .join('\n');
      return [
        '  {',
        `    pack: require('${fromMobile(join(dir, 'pack.json'))}'),`,
        '    audio: {',
        audio,
        '    },',
        '  },',
      ].join('\n');
    })
    .join('\n');
  return [
    '// Fichier généré par scripts/build-packs.ts : ne pas modifier à la main.',
    '// Packs embarqués dans l’appli pour fonctionner hors-ligne dès le premier lancement.',
    '/* eslint-disable @typescript-eslint/no-require-imports */',
    '',
    'export interface BundledPack {',
    '  /** Contenu brut de pack.json : validé par Zod au chargement, jamais utilisé tel quel. */',
    '  pack: unknown;',
    '  /** Chemin relatif de chaque audio → ressource Metro. */',
    '  audio: Readonly<Record<string, number>>;',
    '}',
    '',
    'export const bundledPacks: readonly BundledPack[] = [',
    entries,
    '];',
    '',
  ].join('\n');
}
