// Fichier généré par scripts/build-packs.ts : ne pas modifier à la main.
// Packs embarqués dans l’appli pour fonctionner hors-ligne dès le premier lancement.
/* eslint-disable @typescript-eslint/no-require-imports */

export interface BundledPack {
  /** Contenu brut de pack.json : validé par Zod au chargement, jamais utilisé tel quel. */
  pack: unknown;
  /** Chemin relatif de chaque audio → ressource Metro. */
  audio: Readonly<Record<string, number>>;
}

export const bundledPacks: readonly BundledPack[] = [
  {
    pack: require('../../../../content/packs/u01-salutations/pack.json'),
    audio: {
      'audio/sin-n.m4a': require('../../../../content/packs/u01-salutations/audio/sin-n.m4a'),
      'audio/sin-l.m4a': require('../../../../content/packs/u01-salutations/audio/sin-l.m4a'),
      'audio/hwe-n.m4a': require('../../../../content/packs/u01-salutations/audio/hwe-n.m4a'),
      'audio/hwe-l.m4a': require('../../../../content/packs/u01-salutations/audio/hwe-l.m4a'),
      'audio/xwe-n.m4a': require('../../../../content/packs/u01-salutations/audio/xwe-n.m4a'),
      'audio/xwe-l.m4a': require('../../../../content/packs/u01-salutations/audio/xwe-l.m4a'),
      'audio/kwe-n.m4a': require('../../../../content/packs/u01-salutations/audio/kwe-n.m4a'),
      'audio/kwe-l.m4a': require('../../../../content/packs/u01-salutations/audio/kwe-l.m4a'),
      'audio/n1-n.m4a': require('../../../../content/packs/u01-salutations/audio/n1-n.m4a'),
      'audio/n2-n.m4a': require('../../../../content/packs/u01-salutations/audio/n2-n.m4a'),
      'audio/n3-n.m4a': require('../../../../content/packs/u01-salutations/audio/n3-n.m4a'),
      'audio/n4-n.m4a': require('../../../../content/packs/u01-salutations/audio/n4-n.m4a'),
      'audio/n5-n.m4a': require('../../../../content/packs/u01-salutations/audio/n5-n.m4a'),
      'audio/kwabo-n.m4a': require('../../../../content/packs/u01-salutations/audio/kwabo-n.m4a'),
      'audio/merci-n.m4a': require('../../../../content/packs/u01-salutations/audio/merci-n.m4a'),
      'audio/aurevoir-n.m4a': require('../../../../content/packs/u01-salutations/audio/aurevoir-n.m4a'),
      'audio/combien-n.m4a': require('../../../../content/packs/u01-salutations/audio/combien-n.m4a'),
      'audio/combien-l.m4a': require('../../../../content/packs/u01-salutations/audio/combien-l.m4a'),
      'audio/story-1.m4a': require('../../../../content/packs/u01-salutations/audio/story-1.m4a'),
      'audio/story-2.m4a': require('../../../../content/packs/u01-salutations/audio/story-2.m4a'),
      'audio/story-3.m4a': require('../../../../content/packs/u01-salutations/audio/story-3.m4a'),
      'audio/story-4.m4a': require('../../../../content/packs/u01-salutations/audio/story-4.m4a'),
      'audio/gbe-n.m4a': require('../../../../content/packs/u01-salutations/audio/gbe-n.m4a'),
      'audio/kpon-n.m4a': require('../../../../content/packs/u01-salutations/audio/kpon-n.m4a'),
      'audio/nyi-n.m4a': require('../../../../content/packs/u01-salutations/audio/nyi-n.m4a'),
      'audio/nasal-an.m4a': require('../../../../content/packs/u01-salutations/audio/nasal-an.m4a'),
      'audio/nasal-en.m4a': require('../../../../content/packs/u01-salutations/audio/nasal-en.m4a'),
      'audio/nasal-in.m4a': require('../../../../content/packs/u01-salutations/audio/nasal-in.m4a'),
      'audio/nasal-on.m4a': require('../../../../content/packs/u01-salutations/audio/nasal-on.m4a'),
      'audio/nasal-un.m4a': require('../../../../content/packs/u01-salutations/audio/nasal-un.m4a'),
    },
  },
];
