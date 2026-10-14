import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
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

  it('n’ouvre pas de leçon sans vie et mène à l’écran « Plus de vies »', async () => {
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
    await fireEvent.press(screen.getByTestId('feedback-button'));
    expect(router.replace).toHaveBeenCalledWith('/vies');
  });

  it('corrige la réponse qui fait perdre la dernière vie, puis mène à « Plus de vies »', async () => {
    // Préparer : 4 vies déjà perdues, il en reste une.
    const clock = fakeClock();
    const losses = Array.from({ length: 4 }, (_, i) => ({
      id: `h${i}`,
      type: 'heart_lost' as const,
      at: clock.now() - 1000 + i,
      dayKey: '2026-10-13',
      lessonId: 'u01-l01',
    }));
    await setupStores({ clock, events: losses });
    await render(<LessonScreen lessonId="u01-l01" />);

    // Agir : mauvaise réponse.
    await choose('hwe');

    // Vérifier : la correction s'affiche, puis « Continuer » mène à l'écran 16.
    expect(screen.getByText('Pas tout à fait…')).toBeOnTheScreen();
    expect(screen.getByLabelText('0 vie restante')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('feedback-button'));
    expect(router.replace).toHaveBeenCalledWith('/vies');
  });
});

describe('quitter une leçon (écran 17)', () => {
  beforeEach(() => {
    useLessonStore.getState().reset();
    jest.clearAllMocks();
  });

  it('demande confirmation, puis reprend la leçon', async () => {
    await setupStores();
    await render(<LessonScreen lessonId="u01-l01" />);

    await fireEvent.press(screen.getByTestId('lesson-quit'));
    expect(screen.getByText('Tu pars déjà ?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('quit-stay'));

    expect(screen.queryByText('Tu pars déjà ?')).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('quitte la leçon après confirmation', async () => {
    await setupStores();
    await render(<LessonScreen lessonId="u01-l01" />);

    await fireEvent.press(screen.getByTestId('lesson-quit'));
    await fireEvent.press(screen.getByTestId('quit-leave'));

    expect(router.back).toHaveBeenCalled();
    expect(useLessonStore.getState().state).toBeNull();
  });

  it('demande aussi confirmation avec le bouton « retour » d’Android', async () => {
    const handlers: Parameters<typeof BackHandler.addEventListener>[1][] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {
      handlers.push(handler);
      return { remove: jest.fn() };
    });
    await setupStores();
    await render(<LessonScreen lessonId="u01-l01" />);

    let handled: boolean | null | undefined = false;
    await act(async () => {
      handled = handlers.at(-1)?.({} as never);
    });

    expect(handled).toBe(true);
    expect(screen.getByText('Tu pars déjà ?')).toBeOnTheScreen();
    spy.mockRestore();
  });
});
