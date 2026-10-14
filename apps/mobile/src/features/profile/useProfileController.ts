import { DAILY_GOALS, goalMinutes, type DailyGoalId } from '@gbe/domain';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { useProgressStore, useProgressView } from '../../core/progress/progressStore';
import { appApiClient } from '../../core/sync/backgroundSync';
import { useNow } from '../../core/useNow';

/**
 * Adresse de la politique de confidentialité (`EXPO_PUBLIC_PRIVACY_URL`).
 * Absente : la ligne « Confidentialité » n'est pas affichée.
 */
export function privacyUrl(
  raw: string | undefined = process.env.EXPO_PUBLIC_PRIVACY_URL,
): string | null {
  const url = raw?.trim();
  return url === undefined || url.length === 0 ? null : url;
}

/** Données et actions de l'écran Profil. */
export function useProfileController() {
  const now = useNow();
  const { progress, streak } = useProgressView(now);
  const settings = useProgressStore((s) => s.settings);
  const rerollPseudo = useProgressStore((s) => s.rerollPseudo);
  const setDailyGoal = useProgressStore((s) => s.setDailyGoal);
  const [editingGoal, setEditingGoal] = useState(false);

  // Apprenants arrivés avant les pseudos : on leur en tire un à la première visite.
  useEffect(() => {
    if (settings.onboarded && settings.pseudo === null) void rerollPseudo();
  }, [settings.onboarded, settings.pseudo, rerollPseudo]);

  const chooseGoal = useCallback(
    async (goal: DailyGoalId) => {
      await setDailyGoal(goal);
      setEditingGoal(false);
    },
    [setDailyGoal],
  );

  const privacy = privacyUrl();
  return {
    pseudo: settings.pseudo,
    stats: {
      streak: streak.current,
      xp: progress.totalXp,
      lessons: progress.completedLessons.size,
      cauris: progress.cauris,
    },
    goal: {
      id: settings.dailyGoal,
      minutes: goalMinutes(settings.dailyGoal),
      level: DAILY_GOALS.find((g) => g.id === settings.dailyGoal)?.level ?? 1,
    },
    editingGoal,
    toggleGoal: () => setEditingGoal((open) => !open),
    chooseGoal,
    rerollPseudo: () => void rerollPseudo(),
    /** Vrai si la progression est aussi sauvegardée sur un serveur. */
    backedUp: appApiClient() !== null,
    openPrivacy: privacy === null ? null : () => void Linking.openURL(privacy),
    askDelete: () => router.push('/supprimer-compte'),
  };
}
