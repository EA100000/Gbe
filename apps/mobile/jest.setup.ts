// Préparation commune des tests de l'appli : ni son réel, ni réseau, ni hasard.

jest.mock('./src/core/audio/audioService', () => ({
  playAudio: jest.fn(() => Promise.resolve()),
  stopAudio: jest.fn(),
  preloadAudio: jest.fn(() => Promise.resolve()),
}));

let mockUuidCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => {
    mockUuidCounter += 1;
    return `test-uuid-${mockUuidCounter}`;
  },
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  // Empreintes réelles, calculées par Node.
  digest: async (_algorithm: string, data: Uint8Array) => {
    const hash = jest
      .requireActual<typeof import('node:crypto')>('node:crypto')
      .createHash('sha256')
      .update(data)
      .digest();
    return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => true),
    dismissAll: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  // Écran toujours « au premier plan » dans les tests.
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

// Zones sûres simulées (pas d'encoche dans les tests).
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// Coffre-fort du téléphone simulé en mémoire.
jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});

// Notifications locales simulées : autorisées, rien n'est réellement programmé.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => 'rappel'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
}));

// Rapports de plantage simulés : rien ne part vers Sentry pendant les tests.
jest.mock('@sentry/react-native', () => ({ init: jest.fn(), captureException: jest.fn() }));

// Presse-papiers simulé.
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
