import { create } from 'zustand';

import { bundledPacks } from '../../content/bundled-packs.generated';
import { loadContent, type LoadedContent } from './content';

interface ContentState {
  status: 'idle' | 'ready' | 'error';
  content: LoadedContent | null;
  /** Charge le pack embarqué. Les packs téléchargés arriveront au jalon J4. */
  loadBundled: () => void;
}

export const useContentStore = create<ContentState>((set) => ({
  status: 'idle',
  content: null,
  loadBundled: () => {
    const first = bundledPacks[0];
    if (first === undefined) {
      set({ status: 'error', content: null });
      return;
    }
    const result = loadContent(first.pack, first.audio);
    if (result.ok) set({ status: 'ready', content: result.content });
    else {
      console.error('Pack embarqué invalide', result.issues);
      set({ status: 'error', content: null });
    }
  },
}));

/** Contenu chargé. À n'utiliser que sous l'écran de démarrage, qui garantit le chargement. */
export function useContent(): LoadedContent {
  const content = useContentStore((s) => s.content);
  if (content === null) throw new Error('Contenu non chargé');
  return content;
}
