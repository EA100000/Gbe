import { useCallback } from 'react';

import type { LoadedContent } from '../content/content';
import { playAudio } from './audioService';
import { nextTake } from './takeRotation';

/**
 * Joue un audio d'un pack à partir de son identifiant (sans effet s'il est inconnu).
 * Quand le texte existe dans les deux voix, chaque écoute alterne entre elles.
 * Sans contenu (pas encore chargé), ne joue rien.
 */
export function useClipPlayer(
  content: LoadedContent | null,
): (audioId: string | undefined) => void {
  return useCallback(
    (audioId) => {
      if (audioId === undefined || content === null) return;
      const take = nextTake(content.audioTakes.get(audioId) ?? [audioId]);
      const source = take === undefined ? undefined : content.audioSources.get(take);
      if (source !== undefined) void playAudio(source);
    },
    [content],
  );
}
