import { useCallback } from 'react';

import { useContent } from '../content/contentStore';
import { playAudio } from './audioService';

/** Joue un audio du pack à partir de son identifiant (sans effet s'il est inconnu). */
export function useClipPlayer(): (audioId: string | undefined) => void {
  const content = useContent();
  return useCallback(
    (audioId) => {
      if (audioId === undefined) return;
      const source = content.audioSources.get(audioId);
      if (source !== undefined) void playAudio(source);
    },
    [content],
  );
}
