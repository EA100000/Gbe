import {
  itemStats,
  itemsToStrengthen,
  masteryOf,
  mistakesToReview,
  pickReviewItems,
  practiceMinutes,
} from '@gbe/domain';
import { router } from 'expo-router';
import { useMemo } from 'react';

import { useClipPlayer } from '../../core/audio/useClipPlayer';
import { useContentStore } from '../../core/content/contentStore';
import { mergeContents } from '../../core/content/practiceContent';
import { useProgressStore } from '../../core/progress/progressStore';

/** Mots montrés dans la carte « Mes erreurs » avant « +N ». */
const SHOWN_MISTAKES = 3;
/** Lignes de « Mots à consolider ». */
const SHOWN_WEAK = 5;

export interface WeakWord {
  key: string;
  fon: string;
  fr: string;
  mastery: number;
  audio: string | undefined;
}

/** Onglet Réviser (écran 24, ADR 0019) : erreurs à revoir et mots à consolider. */
export function useReviewController() {
  const events = useProgressStore((s) => s.events);
  const contents = useContentStore((s) => s.contents);
  const content = useMemo(() => mergeContents(contents), [contents]);
  const playClip = useClipPlayer(content);

  const view = useMemo(() => {
    // Un mot retiré d'un pack n'est plus proposé.
    const present = [...itemStats(events).values()].filter(
      (s) => content?.itemsById.has(s.key) === true,
    );
    const word = (key: string) => content?.itemsById.get(key);
    const mistakes = mistakesToReview(present);
    const weak: WeakWord[] = itemsToStrengthen(present, SHOWN_WEAK).flatMap((s) => {
      const item = word(s.key);
      return item === undefined
        ? []
        : [
            {
              key: s.key,
              fon: item.fon,
              fr: item.fr,
              mastery: masteryOf(s),
              audio: item.audio?.normal,
            },
          ];
    });
    const picked = pickReviewItems(present);
    // Écouter : au moins deux mots déjà rencontrés qui ont un enregistrement.
    const audible = present.filter((s) => {
      const audio = word(s.key)?.audio?.normal;
      return audio !== undefined && content?.audioSources.has(audio) === true;
    });
    return {
      canListen: audible.length >= 2,
      hasHistory: present.length > 0,
      mistakeCount: mistakes.length,
      mistakeWords: mistakes.slice(0, SHOWN_MISTAKES).flatMap((s) => word(s.key)?.fon ?? []),
      moreMistakes: Math.max(0, mistakes.length - SHOWN_MISTAKES),
      canStart: picked.length > 0,
      minutes: practiceMinutes(picked.length),
      weak,
    };
  }, [content, events]);

  return {
    ...view,
    start: () => router.push('/revision'),
    startListening: () => router.push('/ecoute'),
    listen: (audio: string | undefined) => playClip(audio),
  };
}
