import { AppState, type AppStateStatus } from 'react-native';

import type * as AudioServiceModule from './audioService';

// Ce fichier teste le vrai lecteur : on retire la simulation globale de jest.setup.ts.
jest.unmock('./audioService');

const mockPlayer = {
  pause: jest.fn(),
  replace: jest.fn(),
  seekTo: jest.fn(async () => undefined),
  play: jest.fn(),
};
const mockSetAudioMode = jest.fn(async () => undefined);

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockPlayer),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioMode(...(args as [])),
  preload: jest.fn(async () => undefined),
}));

describe('lecteur audio', () => {
  let listener: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, cb) => {
      listener = cb as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
  });

  it('ne joue qu’un son à la fois, sans lecture en arrière-plan', async () => {
    // Préparer
    const { playAudio } = jest.requireActual<typeof AudioServiceModule>('./audioService');
    // Agir
    await playAudio(1);
    await playAudio(2);
    // Vérifier
    expect(mockSetAudioMode).toHaveBeenCalledTimes(1);
    expect(mockSetAudioMode).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: 'doNotMix', shouldPlayInBackground: false }),
    );
    expect(mockPlayer.replace).toHaveBeenLastCalledWith(2);
    expect(mockPlayer.pause).toHaveBeenCalledTimes(2);
  });

  it('met le son en pause quand l’appli passe en arrière-plan (appel, autre appli)', async () => {
    const { playAudio } = jest.requireActual<typeof AudioServiceModule>('./audioService');
    await playAudio(1);
    mockPlayer.pause.mockClear();

    listener?.('background');

    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  it('ne bloque jamais la leçon si un son ne part pas', async () => {
    const { playAudio } = jest.requireActual<typeof AudioServiceModule>('./audioService');
    mockPlayer.play.mockImplementationOnce(() => {
      throw new Error('format');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(playAudio(3)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
