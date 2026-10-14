import { createAudioPlayer, preload, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';

/**
 * Lecteur audio unique de l'appli.
 * - un seul son à la fois : jouer un nouveau clip remplace le précédent ;
 * - pause automatique quand l'appli passe en arrière-plan (appel, autre appli) ;
 * - aucune lecture automatique : chaque son part d'un geste de l'apprenant (règle du web).
 */
export type AudioSource = number | string;

let player: AudioPlayer | null = null;
let configured = false;

function getPlayer(): AudioPlayer {
  if (player === null) {
    player = createAudioPlayer(null);
    AppState.addEventListener('change', (state) => {
      if (state !== 'active') player?.pause();
    });
  }
  return player;
}

async function configure(): Promise<void> {
  if (configured) return;
  configured = true;
  // « doNotMix » demande le focus audio : un appel entrant met nos sons en pause.
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
    shouldPlayInBackground: false,
  });
}

export async function playAudio(source: AudioSource): Promise<void> {
  try {
    await configure();
    const current = getPlayer();
    current.pause();
    current.replace(source);
    await current.seekTo(0);
    current.play();
  } catch (error) {
    // Un son qui ne part pas ne doit jamais bloquer la leçon.
    console.warn('Lecture audio impossible', error);
  }
}

export function stopAudio(): void {
  player?.pause();
}

/** Précharge les audios d'une leçon pour un passage sans attente d'un exercice à l'autre. */
export async function preloadAudio(sources: readonly AudioSource[]): Promise<void> {
  await Promise.all(
    sources.map(async (source) => {
      try {
        // Sur le web, preload peut ne rien renvoyer : on n'enchaîne pas directement sur .catch.
        await preload(source);
      } catch (error) {
        console.warn('Préchargement impossible', error);
      }
    }),
  );
}
