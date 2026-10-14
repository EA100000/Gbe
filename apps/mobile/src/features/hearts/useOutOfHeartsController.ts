import { fullHeartsAt, MAX_HEARTS, nextHeartAt } from '@gbe/domain';
import { router } from 'expo-router';

import { formatWait } from '../../core/i18n';
import { useProgressView } from '../../core/progress/progressStore';
import { useNow } from '../../core/useNow';

/** Rafraîchissement du compte à rebours (les minutes affichées restent justes). */
const REFRESH_MS = 15_000;

/** Écran 16 : plus de vies, et quand elles reviennent. */
export function useOutOfHeartsController() {
  const now = useNow(REFRESH_MS);
  const { hearts } = useProgressView(now);
  const next = nextHeartAt(hearts);
  const full = fullHeartsAt(hearts);

  const backToPath = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return {
    count: hearts.count,
    max: MAX_HEARTS,
    /** `null` quand les vies sont pleines (plus rien à attendre). */
    nextIn: next === null ? null : formatWait(next - now),
    fullIn: full === null ? null : formatWait(full - now),
    backToPath,
    openSounds: () => {
      backToPath();
      router.navigate('/sons');
    },
  };
}
