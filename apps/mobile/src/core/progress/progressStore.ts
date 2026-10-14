import {
  applyEvents,
  computeHearts,
  computeStreak,
  dedupeEvents,
  generatePseudo,
  type DailyGoalId,
  type GameEvent,
  type HeartsState,
  type Progress,
  type StreakStatus,
} from '@gbe/domain';
import { useMemo } from 'react';
import { create } from 'zustand';

import { dayKeyAt, systemClock, type Clock } from '../clock';
import type { Repositories, Settings } from '../db/repositories';
import { DEFAULT_SETTINGS } from '../db/repositories';
import { freshRng } from '../random';

/** Bilan affiché par l'écran « Leçon terminée ». */
export interface LessonEndSummary {
  lessonId: string;
  xp: number;
  accuracy: number;
  durationMs: number;
  streak: number;
  summaryFr: string | null;
  unlockedStory: { lessonId: string; title: string } | null;
}

interface ProgressState {
  ready: boolean;
  events: readonly GameEvent[];
  settings: Settings;
  lastSummary: LessonEndSummary | null;
  repositories: Repositories | null;
  clock: Clock;
  hydrate: (repositories: Repositories, clock?: Clock) => Promise<void>;
  /** Enregistre des événements : d'abord sur le téléphone, puis dans l'état affiché. */
  record: (events: readonly GameEvent[]) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  /** Fin de l'accueil : objectif choisi, et premier pseudo tiré s'il n'existe pas encore. */
  completeOnboarding: (goal: DailyGoalId) => Promise<void>;
  setDailyGoal: (goal: DailyGoalId) => Promise<void>;
  /** Tire un nouveau pseudo, différent du précédent. */
  rerollPseudo: () => Promise<void>;
  /** Oublie toute la progression (après suppression du compte) : retour au premier lancement. */
  reset: () => Promise<void>;
  setLastSummary: (summary: LessonEndSummary | null) => void;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  ready: false,
  events: [],
  settings: DEFAULT_SETTINGS,
  lastSummary: null,
  repositories: null,
  clock: systemClock,

  hydrate: async (repositories, clock = systemClock) => {
    const [events, settings] = await Promise.all([
      repositories.events.all(),
      repositories.settings.load(),
    ]);
    set({ ready: true, events, settings, repositories, clock });
  },

  record: async (events) => {
    const repositories = get().repositories;
    if (repositories === null) throw new Error('Progression non chargée');
    await repositories.events.append(events);
    set((state) => ({ events: dedupeEvents([...state.events, ...events]) }));
  },

  saveSettings: async (settings) => {
    const repositories = get().repositories;
    if (repositories === null) throw new Error('Progression non chargée');
    await repositories.settings.save(settings);
    set({ settings });
  },

  completeOnboarding: async (goal) => {
    const { settings, saveSettings } = get();
    await saveSettings({
      ...settings,
      onboarded: true,
      dailyGoal: goal,
      pseudo: settings.pseudo ?? generatePseudo(freshRng()),
    });
  },

  setDailyGoal: async (goal) => {
    const { settings, saveSettings } = get();
    await saveSettings({ ...settings, dailyGoal: goal });
  },

  rerollPseudo: async () => {
    const { settings, saveSettings } = get();
    await saveSettings({ ...settings, pseudo: generatePseudo(freshRng(), settings.pseudo) });
  },

  reset: async () => {
    const repositories = get().repositories;
    if (repositories === null) throw new Error('Progression non chargée');
    await repositories.events.clear();
    await repositories.settings.clear();
    set({ events: [], settings: DEFAULT_SETTINGS, lastSummary: null });
  },

  setLastSummary: (lastSummary) => set({ lastSummary }),
}));

export interface ProgressView {
  progress: Progress;
  hearts: HeartsState;
  streak: StreakStatus;
}

/** Progression calculée à partir du journal, pour l'instant `now`. */
export function useProgressView(now: number): ProgressView {
  const events = useProgressStore((s) => s.events);
  const clock = useProgressStore((s) => s.clock);
  const progress = useMemo(() => applyEvents(events), [events]);
  return useMemo(
    () => ({
      progress,
      hearts: computeHearts(progress.heartLossTimes, now),
      streak: computeStreak(progress.activeDays, dayKeyAt(clock, now)),
    }),
    [progress, now, clock],
  );
}
