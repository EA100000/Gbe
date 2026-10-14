import { useCallback } from 'react';

import type { LoadedContent } from '../content/content';
import { playAudio } from './audioService';

/** Joue un audio d'un pack à partir de son identifiant (sans effet s'il est inconnu). */
export function useClipPlayer(content: LoadedContent): (audioId: string | undefined) => void {
  return useCallback(
    (audioId) => {
      if (audioId === undefined) return;
      const source = content.audioSources.get(audioId);
      if (source !== undefined) void playAudio(source);
    },
    [content],
  );
}
