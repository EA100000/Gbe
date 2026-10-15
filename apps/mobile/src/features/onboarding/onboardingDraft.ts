import type { LearningReason, SelfLevel } from '@gbe/domain';
import { create } from 'zustand';

/**
 * Réponses du démarrage en cours (écrans 1a et 1b), avant l'objectif du jour.
 * Rien n'est enregistré avant « C'est parti » : quitter l'appli recommence le démarrage.
 */
interface OnboardingDraft {
  reason: LearningReason | null;
  level: SelfLevel | null;
  setReason: (reason: LearningReason) => void;
  setLevel: (level: SelfLevel) => void;
  reset: () => void;
}

export const useOnboardingDraft = create<OnboardingDraft>((set) => ({
  reason: null,
  level: null,
  setReason: (reason) => set({ reason }),
  setLevel: (level) => set({ level }),
  reset: () => set({ reason: null, level: null }),
}));
