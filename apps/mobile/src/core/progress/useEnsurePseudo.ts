import { useEffect } from 'react';

import { useProgressStore } from './progressStore';

/** Apprenants arrivés avant les pseudos : on leur en tire un dès qu'un écran en a besoin. */
export function useEnsurePseudo(): string | null {
  const onboarded = useProgressStore((s) => s.settings.onboarded);
  const pseudo = useProgressStore((s) => s.settings.pseudo);
  const rerollPseudo = useProgressStore((s) => s.rerollPseudo);
  useEffect(() => {
    if (onboarded && pseudo === null) void rerollPseudo();
  }, [onboarded, pseudo, rerollPseudo]);
  return pseudo;
}
