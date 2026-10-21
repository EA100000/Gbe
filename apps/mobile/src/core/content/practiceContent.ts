import type { Illustration, LexiconItem } from '@gbe/content-schema';

import type { LoadedContent } from './content';

/**
 * Séances d'entraînement (révision, écoute) : elles mêlent les mots de plusieurs unités.
 * Ce contenu fusionné préfixe chaque identifiant par son unité, `<unité>:<id>`, pour qu'un même
 * identifiant dans deux packs ne se confonde pas. Construit en mémoire, jamais publié.
 */
export const PRACTICE_SEPARATOR = ':';

export const qualify = (unitId: string, id: string): string =>
  `${unitId}${PRACTICE_SEPARATOR}${id}`;

/** Unité et élément d'un identifiant qualifié ; `null` s'il ne l'est pas. */
export function splitQualified(id: string): { unitId: string; itemId: string } | null {
  const at = id.indexOf(PRACTICE_SEPARATOR);
  if (at <= 0 || at === id.length - 1) return null;
  return { unitId: id.slice(0, at), itemId: id.slice(at + 1) };
}

/** Fusionne les unités chargées. Le pack de la première sert pour les textes d'interface en fon. */
export function mergeContents(contents: readonly LoadedContent[]): LoadedContent | null {
  const first = contents[0];
  if (first === undefined) return null;
  const itemsById = new Map<string, LexiconItem>();
  const illustrationsById = new Map<string, Illustration>();
  const audioSources = new Map<string, number | string>();
  const audioTakes = new Map<string, readonly string[]>();

  for (const content of contents) {
    const unitId = content.pack.unit.id;
    const q = (id: string) => qualify(unitId, id);
    for (const item of content.itemsById.values()) {
      const audio = item.audio;
      itemsById.set(q(item.id), {
        ...item,
        id: q(item.id),
        ...(item.illustration === undefined ? {} : { illustration: q(item.illustration) }),
        ...(audio === undefined
          ? {}
          : {
              audio: {
                ...(audio.normal === undefined ? {} : { normal: q(audio.normal) }),
                ...(audio.slow === undefined ? {} : { slow: q(audio.slow) }),
              },
            }),
      });
    }
    for (const illustration of content.illustrationsById.values()) {
      illustrationsById.set(q(illustration.id), { ...illustration, id: q(illustration.id) });
    }
    for (const [id, source] of content.audioSources) audioSources.set(q(id), source);
    for (const [id, takes] of content.audioTakes) audioTakes.set(q(id), takes.map(q));
  }

  return {
    pack: first.pack,
    itemsById,
    illustrationsById,
    lessonsById: new Map(),
    audioSources,
    audioTakes,
  };
}
