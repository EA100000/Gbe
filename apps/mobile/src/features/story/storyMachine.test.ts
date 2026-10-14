import type { StoryExercise } from '@gbe/content-schema';

import {
  initialStoryState,
  markListened,
  pickReply,
  storyAccuracy,
  storyProgress,
  toggleTranslation,
} from './storyMachine';

const story: Pick<StoryExercise, 'question' | 'lines'> = {
  lines: [
    { speaker: 'vendor', fon: 'r1', audio: 'a1' },
    { speaker: 'learner', fon: 'r2', audio: 'a2' },
    { speaker: 'vendor', fon: 'r3' },
  ],
  question: {
    promptFr: 'Que réponds-tu ?',
    successFr: 'Bien joué !',
    choices: [
      { fon: 'c1', correct: false, explanation: [{ fr: 'Pas encore' }] },
      { fon: 'c2', correct: true, explanation: [{ fr: 'Bravo' }] },
    ],
  },
};

describe('histoire', () => {
  it('affiche la traduction par défaut, comme la maquette, et peut la masquer', () => {
    expect(initialStoryState.showTranslation).toBe(true);
    expect(toggleTranslation(initialStoryState).showTranslation).toBe(false);
  });

  it('fait avancer la barre à mesure que les répliques sont écoutées', () => {
    const once = markListened(initialStoryState, 0);
    expect(storyProgress(once, story)).toBeCloseTo(0.45);
    expect(markListened(once, 0)).toBe(once);
  });

  it('montre l’explication d’une mauvaise réplique sans terminer l’histoire', () => {
    const state = pickReply(initialStoryState, story, 0);
    expect(state.solved).toBe(false);
    expect(state.wrongChoice).toBe(0);
  });

  it('termine l’histoire sur la bonne réplique et remplit la barre', () => {
    const state = pickReply(initialStoryState, story, 1);
    expect(state.solved).toBe(true);
    expect(storyProgress(state, story)).toBe(1);
    expect(storyAccuracy(state)).toBe(1);
  });

  it('compte une précision nulle si la bonne réplique vient après une erreur', () => {
    const state = pickReply(pickReply(initialStoryState, story, 0), story, 1);
    expect(storyAccuracy(state)).toBe(0);
  });

  it('ignore un nouveau choix une fois l’histoire réussie', () => {
    const solved = pickReply(initialStoryState, story, 1);
    expect(pickReply(solved, story, 0)).toBe(solved);
  });

  it('reste à zéro pour une histoire sans audio', () => {
    expect(storyProgress(initialStoryState, { lines: [{ speaker: 'vendor', fon: 'x' }] })).toBe(0);
  });
});
