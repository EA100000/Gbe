import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { deleteAccount } from '../../core/account/accountDeletion';
import { useProgressStore } from '../../core/progress/progressStore';
import { appApiClient } from '../../core/sync/backgroundSync';
import { credentialStore, pendingDeletionStore } from '../../core/sync/credentials';

type Status = 'idle' | 'working' | 'error';

/** Confirmation de la suppression du compte (écran 12). */
export function useDeleteAccountController() {
  const reset = useProgressStore((s) => s.reset);
  const [status, setStatus] = useState<Status>('idle');

  const confirm = useCallback(async () => {
    setStatus('working');
    try {
      await deleteAccount({
        api: appApiClient(),
        credentials: credentialStore,
        pendingDeletion: pendingDeletionStore,
        resetLocal: reset,
      });
      // Progression effacée : la racine renvoie vers l'accueil, comme au premier lancement.
      router.dismissTo('/');
    } catch (error) {
      console.warn('Suppression du compte impossible', error);
      setStatus('error');
    }
  }, [reset]);

  const keep = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/profil');
  }, []);

  return { status, confirm: () => void confirm(), keep };
}
