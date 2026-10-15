import {
  LEARNING_REASONS,
  SELF_LEVELS,
  selfLevelBars,
  suggestsPlacementTest,
  type DailyGoalId,
} from '@gbe/domain';
import { router } from 'expo-router';
import { useState } from 'react';

import { useProgressStore } from '../../core/progress/progressStore';
import { useServer } from '../../core/sync/serverContext';
import { useOnboardingDraft } from './onboardingDraft';

/** Nombre d'étapes du démarrage : pourquoi, niveau, objectif du jour. */
export const ONBOARDING_STEPS = 3;

/** Écran 1a : pourquoi apprendre le fon. */
export function useReasonController() {
  const reason = useOnboardingDraft((s) => s.reason);
  const setReason = useOnboardingDraft((s) => s.setReason);
  // Retrouver un compte demande le serveur : sans API configurée, le lien n'apparaît pas.
  const canRecover = useServer() !== null;

  return {
    reasons: LEARNING_REASONS.map((id) => ({
      id,
      selected: id === reason,
      choose: () => setReason(id),
    })),
    canContinue: reason !== null,
    next: () => router.push('/niveau'),
    canRecover,
    recover: () => router.push('/recuperer'),
  };
}

/** Écran 1b : le niveau déclaré. */
export function useLevelController() {
  const level = useOnboardingDraft((s) => s.level);
  const setLevel = useOnboardingDraft((s) => s.setLevel);

  return {
    levels: SELF_LEVELS.map((id) => ({
      id,
      bars: selfLevelBars(id),
      selected: id === level,
      choose: () => setLevel(id),
    })),
    canContinue: level !== null,
    showPlacementNote: level !== null && suggestsPlacementTest(level),
    next: () => router.push('/objectif'),
    back: () => {
      if (router.canGoBack()) router.back();
      else router.replace('/bienvenue');
    },
  };
}

/** Écran 1 (dernière étape) : l'objectif du jour, puis l'enregistrement de tout le démarrage. */
export function useGoalController() {
  const initialGoal = useProgressStore((s) => s.settings.dailyGoal);
  const completeOnboarding = useProgressStore((s) => s.completeOnboarding);
  const [goal, setGoal] = useState<DailyGoalId>(initialGoal);

  return {
    goal,
    setGoal,
    start: async () => {
      const { reason, level, reset } = useOnboardingDraft.getState();
      await completeOnboarding(goal, { reason, level });
      reset();
      // Les trois étapes quittent la pile : « retour » depuis le chemin ne les rouvre pas.
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
    },
  };
}
