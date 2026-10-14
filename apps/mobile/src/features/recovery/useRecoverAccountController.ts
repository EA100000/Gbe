import { normalizeRecoveryCode } from '@gbe/domain';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { recoverAccount, type RecoveryOutcome } from '../../core/account/recovery';
import { useProgressStore, useProgressView } from '../../core/progress/progressStore';
import { credentialStore, recoveryCodeStore } from '../../core/sync/credentials';
import { useServer } from '../../core/sync/serverContext';
import { useNow } from '../../core/useNow';

/** `typing` : saisie ; `found` : compte retrouvé ; les autres : refus affiché sous le champ. */
export type RecoverStatus = 'typing' | 'working' | 'found' | Exclude<RecoveryOutcome, 'restored'>;

/** Écran 14 : « J'ai déjà un compte ». */
export function useRecoverAccountController() {
  const server = useServer();
  const restore = useProgressStore((s) => s.restore);
  const pseudo = useProgressStore((s) => s.settings.pseudo);
  const now = useNow();
  const { progress, streak } = useProgressView(now);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<RecoverStatus>('typing');

  const complete = normalizeRecoveryCode(code) !== null;

  const submit = useCallback(async () => {
    if (!complete || status === 'working') return;
    if (server === null) {
      setStatus('offline');
      return;
    }
    setStatus('working');
    try {
      const outcome = await recoverAccount(code, {
        api: server.api,
        credentials: credentialStore,
        recoveryCode: recoveryCodeStore,
        forgetToken: server.engine.forgetToken,
        restore,
      });
      setStatus(outcome === 'restored' ? 'found' : outcome);
    } catch {
      setStatus('busy');
    }
  }, [code, complete, restore, server, status]);

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/bienvenue');
  }, []);

  return {
    code,
    status,
    canSubmit: complete && status !== 'working',
    changeCode: (text: string) => {
      setCode(text);
      setStatus((current) => (current === 'working' ? current : 'typing'));
    },
    submit: () => void submit(),
    back: leave,
    startFresh: leave,
    found: {
      pseudo: pseudo ?? '',
      streak: streak.current,
      xp: progress.totalXp,
      lessons: progress.completedLessons.size,
    },
    /** Vers le chemin, sans laisser l'accueil dans l'historique. */
    continue: () => {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
    },
  };
}
