import {
  buildCoursePath,
  CHEST_CAURIS,
  chestsToOpen,
  type PathLessonNode,
  type PathNode,
  type PlannedUnit,
  programmeOverview,
} from '@gbe/domain';
import type { Unit } from '@gbe/content-schema';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useContentStore } from '../../core/content/contentStore';
import { plannedUnits } from '../../core/content/programme';
import { chestOpenedEvent } from '../../core/progress/eventFactory';
import { useProgressStore, useProgressView } from '../../core/progress/progressStore';
import { useNow } from '../../core/useNow';

export interface UnitSection {
  unit: Unit;
  /** Vrai tant que l'unité précédente n'est pas terminée. */
  locked: boolean;
  /** Ordre de l'unité précédente, pour le libellé « termine d'abord l'unité N ». */
  previousOrder: number | null;
  /** Le pack de l'unité a un guide des sons. */
  hasGuide: boolean;
  nodes: PathNode[];
}

/**
 * Données et actions de l'écran « Chemin des leçons » : toutes les unités, à la suite,
 * puis la suite du programme, « en préparation » (écran 23).
 */
export function usePathController(planned: readonly PlannedUnit[] = plannedUnits) {
  const contents = useContentStore((s) => s.contents);
  const clock = useProgressStore((s) => s.clock);
  const record = useProgressStore((s) => s.record);
  const now = useNow();
  const { progress, hearts, streak } = useProgressView(now);

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

  const sections = useMemo<UnitSection[]>(() => {
    const units = contents.map((c) => c.pack.unit);
    return buildCoursePath(units, progress.completedLessons).map((section, i) => {
      const content = contents[i];
      if (content === undefined) throw new Error('Unité absente');
      return {
        unit: content.pack.unit,
        locked: section.locked,
        previousOrder: contents[i - 1]?.pack.unit.order ?? null,
        hasGuide: content.pack.sounds !== undefined,
        nodes: section.nodes,
      };
    });
  }, [contents, progress.completedLessons]);

  // Une calebasse débloquée s'ouvre et crédite ses cauris (une seule fois, identifiant stable).
  useEffect(() => {
    const toOpen = chestsToOpen(
      sections.flatMap((s) => s.nodes),
      progress.openedChests,
    );
    if (toOpen.length > 0) {
      void record(toOpen.map((id) => chestOpenedEvent(clock, id, CHEST_CAURIS)));
    }
  }, [sections, progress.openedChests, record, clock]);

  const programme = useMemo(
    () =>
      programmeOverview(
        planned,
        contents.map((c) => c.pack.unit),
      ),
    [planned, contents],
  );
  const [openedUpcoming, setOpenedUpcoming] = useState<string | null>(null);
  const upcomingSheet = programme.upcoming.find((u) => u.id === openedUpcoming) ?? null;

  const noHearts = hearts.count === 0;
  const open = useCallback(
    (node: PathLessonNode) => {
      if (node.status === 'locked') return;
      if (node.kind === 'story') {
        router.push(`/histoire/${node.lessonId}`);
        return;
      }
      // Sans vie, pas de leçon : l'écran 16 dit quand les vies reviennent.
      router.push(noHearts ? '/vies' : `/lecon/${node.lessonId}`);
    },
    [noHearts],
  );

  return {
    sections,
    stats: { streak: streak.current, cauris: progress.cauris, hearts: hearts.count },
    open,
    openGuide: () => router.navigate('/sons'),
    programme,
    upcomingSheet,
    openUpcoming: (unitId: string) => setOpenedUpcoming(unitId),
    closeUpcoming: () => setOpenedUpcoming(null),
  };
}
