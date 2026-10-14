import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useProgressStore } from '../../core/progress/progressStore';
import { fakeClock, setupStores } from '../../test-utils/fixtures';
import { LessonScreen } from '../lesson/LessonScreen';
import { useLessonStore } from '../lesson/lessonStore';

async function choose(itemId: string) {
  await fireEvent.press(screen.getByTestId(`choice-${itemId}`));
  await fireEvent.press(screen.getByTestId('check-button'));
}

describe('une leçon complète, hors-ligne', () => {
  beforeEach(() => {
    useLessonStore.getState().reset();
    jest.clearAllMocks();
  });

  it('se joue de la première image jusqu’à l’écran de fin', async () => {
    // Préparer
    const clock = fakeClock();
    await setupStores({ clock });
    await render(<LessonScreen lessonId="u01-l01" />);

    // Agir et vérifier : écran vide, « Vérifier » inactif
    expect(screen.getByText('Lequel veut dire « eau » ?')).toBeOnTheScreen();
    expect(screen.getByTestId('check-button')).toBeDisabled();

    // Mauvaise réponse : panneau rouge, une vie en moins, enregistrée dans le journal
    await choose('hwe');
    expect(screen.getByTestId('feedback-wrong')).toBeOnTheScreen();
    expect(screen.getByText('Pas tout à fait…')).toBeOnTheScreen();
    expect(screen.getByLabelText('4 vies restantes')).toBeOnTheScreen();
    expect(useProgressStore.getState().events.map((e) => e.type)).toEqual(['heart_lost']);

    // « Réessayer », puis bonne réponse : panneau bleu
    await fireEvent.press(screen.getByTestId('feedback-button'));
    await choose('sin');
    expect(screen.getByTestId('feedback-correct')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('feedback-button'));

    // Les trois autres images
    for (const answer of ['hwe', 'xwe', 'kwe']) {
      await choose(answer);
      await fireEvent.press(screen.getByTestId('feedback-button'));
    }

    // Les paires : « Continuer » reste inactif tant qu'il en manque
    expect(screen.getByText('Associe les paires')).toBeOnTheScreen();
    for (const pair of [0, 1, 2, 3]) {
      await fireEvent.press(screen.getByTestId(`pair-left-${pair}`));
      await fireEvent.press(screen.getByTestId(`pair-right-${pair}`));
    }
    expect(screen.getByText('Parfait !')).toBeOnTheScreen();
    clock.advance(168_000);
    await fireEvent.press(screen.getByTestId('feedback-button'));

    // Fin : leçon enregistrée, bilan prêt, écran de fin demandé
    const { events, lastSummary } = useProgressStore.getState();
    expect(events.map((e) => e.type)).toEqual(['heart_lost', 'lesson_completed']);
    expect(lastSummary).toMatchObject({
      lessonId: 'u01-l01',
      accuracy: 0.8,
      xp: 15,
      durationMs: 168_000,
      streak: 1,
      unlockedStory: null,
    });
    expect(router.replace).toHaveBeenCalledWith('/fin');
  });

  it('propose la bonne phrase après une erreur dans la phrase à construire', async () => {
    await setupStores();
    await render(<LessonScreen lessonId="u01-l03" />);

    expect(screen.getByText('Merci')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Ajouter sin'));
    await fireEvent.press(screen.getByTestId('check-button'));

    expect(screen.getByText('Bonne réponse :')).toBeOnTheScreen();
    expect(screen.getByText('A wà nǔ')).toBeOnTheScreen();
  });

  it('arrête la leçon quand il ne reste plus de vie', async () => {
    const clock = fakeClock();
    const losses = Array.from({ length: 5 }, (_, i) => ({
      id: `h${i}`,
      type: 'heart_lost' as const,
      at: clock.now() - 1000 + i,
      dayKey: '2026-10-13',
      lessonId: 'u01-l01',
    }));
    await setupStores({ clock, events: losses });
    await render(<LessonScreen lessonId="u01-l01" />);

    expect(screen.getByText('Plus de vies')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Retour au chemin'));
    expect(router.back).toHaveBeenCalled();
  });
});
