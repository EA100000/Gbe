import { buildUnitPath, CHEST_CAURIS, chestsToOpen, type PathLessonNode } from '@gbe/domain';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { useContent, useContentStore } from '../../core/content/contentStore';
import { chestOpenedEvent } from '../../core/progress/eventFactory';
import { useProgressStore, useProgressView } from '../../core/progress/progressStore';
import { useNow } from '../../core/useNow';

/** Données et actions de l'écran « Chemin des leçons ». */
export function usePathController() {
  const content = useContent();
  const clock = useProgressStore((s) => s.clock);
  const record = useProgressStore((s) => s.record);
  const now = useNow();
  const { progress, hearts, streak } = useProgressView(now);
  const unit = content.pack.unit;

  // Une nouvelle version de pack téléchargée s'applique ici : sur le chemin, aucune leçon n'est en cours.
  useFocusEffect(
    useCallback(() => {
      const store = useContentStore;
      store.getState().applyPending();
      return store.subscribe((state) => {
        if (state.pending !== null) state.applyPending();
      });
    }, []),
  );

  const nodes = useMemo(
    () => buildUnitPath(unit, progress.completedLessons),
    [unit, progress.completedLessons],
  );

  // Une calebasse débloquée s'ouvre et crédite ses cauris (une seule fois, identifiant stable).
  useEffect(() => {
    const toOpen = chestsToOpen(nodes, progress.openedChests);
    if (toOpen.length > 0) {
      void record(toOpen.map((id) => chestOpenedEvent(clock, id, CHEST_CAURIS)));
    }
  }, [nodes, progress.openedChests, record, clock]);

  const open = useCallback((node: PathLessonNode) => {
    if (node.status === 'locked') return;
    if (node.kind === 'story') {
      router.push(`/histoire/${node.lessonId}`);
      return;
    }
    // Sans vie, l'écran de leçon l'annonce lui-même et propose de revenir au chemin.
    router.push(`/lecon/${node.lessonId}`);
  }, []);

  return {
    unit,
    nodes,
    stats: { streak: streak.current, cauris: progress.cauris, hearts: hearts.count },
    open,
    openGuide: () => router.navigate('/sons'),
  };
}
