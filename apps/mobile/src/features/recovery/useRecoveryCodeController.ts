import { setStringAsync } from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { loadRecoveryCode } from '../../core/account/recovery';
import { credentialStore, recoveryCodeStore } from '../../core/sync/credentials';
import { useServer } from '../../core/sync/serverContext';

export type RecoveryCodeState =
  { status: 'loading' } | { status: 'ready'; code: string } | { status: 'offline' };

/** Écran 13 : affiche le code de récupération (créé au premier affichage). */
export function useRecoveryCodeController() {
  const server = useServer();
  const [state, setState] = useState<RecoveryCodeState>({ status: 'loading' });
  const [copied, setCopied] = useState(false);

  const fetchCode = useCallback(async (): Promise<RecoveryCodeState> => {
    if (server === null) return { status: 'offline' };
    try {
      // D'abord le journal : le code doit pouvoir rendre toute la progression.
      // Les deux appels restent l'un après l'autre pour ne jamais créer deux comptes à la fois.
      await server.engine.sync();
      const code = await loadRecoveryCode({
        api: server.api,
        engine: server.engine,
        credentials: credentialStore,
        recoveryCode: recoveryCodeStore,
      });
      return { status: 'ready', code };
    } catch {
      return { status: 'offline' };
    }
  }, [server]);

  useEffect(() => {
    let active = true;
    void fetchCode().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [fetchCode]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    void fetchCode().then(setState);
  }, [fetchCode]);

  const copy = useCallback(async () => {
    if (state.status !== 'ready') return;
    await setStringAsync(state.code);
    setCopied(true);
  }, [state]);

  return {
    state,
    copied,
    copy: () => void copy(),
    retry,
    close: () => {
      if (router.canGoBack()) router.back();
      else router.replace('/profil');
    },
  };
}
