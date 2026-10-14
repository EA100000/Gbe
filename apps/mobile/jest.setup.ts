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
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(() => ({})),
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
