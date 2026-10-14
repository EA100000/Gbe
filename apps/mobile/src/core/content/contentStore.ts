import { create } from 'zustand';

import { bundledPacks } from '../../content/bundled-packs.generated';
import { choosePacks, type LocalPacksDeps } from '../packs/localPacks';
import { loadContent, type LoadedContent } from './content';

interface ContentState {
  status: 'idle' | 'ready' | 'error';
  /** Unité affichée (la première du parcours). */
  content: LoadedContent | null;
  /** Meilleure version de chaque pack disponible, dans l'ordre des unités. */
  contents: readonly LoadedContent[];
  /** Versions téléchargées en cours de session, appliquées au prochain moment sûr. */
  pending: readonly LoadedContent[] | null;
  /** Charge le pack embarqué et les packs installés (vérifiés), garde la meilleure version de chacun. */
  load: (deps: LocalPacksDeps | null) => Promise<void>;
  /** Relit les packs installés après un téléchargement, sans toucher à la leçon en cours. */
  refresh: (deps: LocalPacksDeps) => Promise<void>;
  /** Bascule sur les nouvelles versions (à n'appeler que hors leçon). */
  applyPending: () => void;
}

/** Packs embarqués valides. Ils ont déjà passé le contrôle bloquant de la CI. */
function bundledContents(): LoadedContent[] {
  const contents: LoadedContent[] = [];
  for (const bundled of bundledPacks) {
    const result = loadContent(bundled.pack, bundled.audio);
    if (result.ok) contents.push(result.content);
    else console.error('Pack embarqué invalide', result.issues);
  }
  return contents;
}

const sameVersions = (a: readonly LoadedContent[], b: readonly LoadedContent[]) =>
  a.length === b.length &&
  a.every((c, i) => c.pack.id === b[i]?.pack.id && c.pack.version === b[i]?.pack.version);

export const useContentStore = create<ContentState>((set, get) => ({
  status: 'idle',
  content: null,
  contents: [],
  pending: null,

  load: async (deps) => {
    const bundled = bundledContents();
    let choice;
    try {
      choice = await choosePacks(bundled, deps);
      // Ménage au démarrage, quand aucune leçon n'utilise encore ces fichiers.
      for (const ref of choice.obsolete) await deps?.storage.remove(ref).catch(() => undefined);
    } catch (error) {
      console.warn('Packs téléchargés illisibles : pack embarqué seulement', error);
      choice = await choosePacks(bundled, null);
    }
    const first = choice.contents[0];
    if (first === undefined) set({ status: 'error', content: null, contents: [], pending: null });
    else set({ status: 'ready', content: first, contents: choice.contents, pending: null });
  },

  refresh: async (deps) => {
    const choice = await choosePacks(bundledContents(), deps);
    if (choice.contents.length > 0 && !sameVersions(choice.contents, get().contents)) {
      set({ pending: choice.contents });
    }
  },

  applyPending: () => {
    const pending = get().pending;
    const first = pending?.[0];
    if (pending === null || first === undefined) return;
    set({ content: first, contents: pending, pending: null });
  },
}));

/** Contenu chargé. À n'utiliser que sous l'écran de démarrage, qui garantit le chargement. */
export function useContent(): LoadedContent {
  const content = useContentStore((s) => s.content);
  if (content === null) throw new Error('Contenu non chargé');
  return content;
}

/**
 * Pack qui contient la leçon (plusieurs unités peuvent être chargées).
 * À défaut, l'unité affichée : l'écran de leçon gère lui-même une leçon introuvable.
 */
export function useContentForLesson(lessonId: string): LoadedContent {
  const content = useContentStore(
    (s) => s.contents.find((c) => c.lessonsById.has(lessonId)) ?? s.content,
  );
  if (content === null) throw new Error('Contenu non chargé');
  return content;
}
