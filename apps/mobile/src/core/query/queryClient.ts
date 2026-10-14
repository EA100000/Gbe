import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

/**
 * Données venues du serveur (catalogue des packs, puis Ligue) : cache, nouvel essai, déduplication.
 * L'état propre au téléphone (progression, réglages) n'y passe jamais : il vit dans SQLite.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60_000 },
  },
});

// Sur téléphone, « revenir dans l'appli » vaut retour du focus (rafraîchit les données périmées).
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) => {
      setFocused(state === 'active');
    });
    return () => subscription.remove();
  });
}
