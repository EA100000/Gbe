import type { ItemAnsweredEvent } from '@gbe/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { playAudio } from '../../core/audio/audioService';
import { useProgressStore } from '../../core/progress/progressStore';
import { setupStores } from '../../test-utils/fixtures';
import { LessonEndScreen } from '../lesson/LessonEndScreen';
import { useLessonStore } from '../lesson/lessonStore';
import { PracticeScreen } from '../practice/PracticeScreen';
import { ReviewScreen } from './ReviewScreen';
import { buildReview } from './reviewSession';

let n = 0;
const answered = (itemId: string, correct: boolean): ItemAnsweredEvent => {
  n += 1;
  return {
    id: `r${n}`,
    type: 'item_answered',
    at: Date.UTC(2026, 9, 20, 9, n),
    dayKey: '2026-10-20',
    unitId: 'u01',
    itemId,
    correct,
    mode: 'lesson',
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  useLessonStore.getState().reset();
});

describe('onglet Réviser', () => {
  it('invite à finir une leçon tant qu’il n’y a rien à revoir', async () => {
    await setupStores();

    await render(<ReviewScreen />);

    expect(screen.getByText(/Termine une leçon/)).toBeOnTheScreen();
    expect(screen.getByText('Aucune erreur à revoir pour le moment.')).toBeOnTheScreen();
    expect(screen.getByTestId('review-start')).toBeDisabled();
  });

  it('montre les erreurs à revoir et les mots à consolider', async () => {
    // Préparer : « sin » raté, « ɖokpó » réussi une fois
    await setupStores({ events: [answered('sin', false), answered('n1', true)] });
    // Agir
    await render(<ReviewScreen />);
    // Vérifier
    expect(screen.getByText('1 erreur récente à revoir')).toBeOnTheScreen();
    expect(screen.getByTestId('review-mistakes')).toHaveTextContent(/sin/);
    expect(screen.getByText('Mots à consolider')).toBeOnTheScreen();
    expect(screen.getByLabelText('Maîtrise : 1 sur 4')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Écouter ɖokpó'));
    expect(playAudio).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('review-start'));
    expect(router.push).toHaveBeenCalledWith('/revision');
  });
});

describe('séance de révision', () => {
  it('se joue sans perdre de vie, renvoie l’erreur plus loin, puis se termine', async () => {
    // Préparer
    await setupStores({ events: [answered('sin', false)] });
    await render(<PracticeScreen mode="review" build={buildReview} />);
    expect(screen.getByText('TON ERREUR D’AVANT')).toBeOnTheScreen();
    expect(screen.getByTestId('lesson-badge')).toHaveTextContent('Entraînement');

    // Agir : mauvaise image, puis la bonne quand l'exercice revient
    const wrong = screen
      .getAllByTestId(/^choice-u01:/)
      .find((el) => el.props.testID !== 'choice-u01:sin');
    if (wrong === undefined) throw new Error('distracteur absent');
    await fireEvent.press(wrong);
    await fireEvent.press(screen.getByTestId('check-button'));
    expect(screen.getByTestId('feedback-wrong')).toHaveTextContent(/Pas de vie perdue/);
    await fireEvent.press(screen.getByTestId('feedback-button'));
    await fireEvent.press(screen.getByTestId('choice-u01:sin'));
    await fireEvent.press(screen.getByTestId('check-button'));
    await fireEvent.press(screen.getByTestId('feedback-button'));

    // Vérifier
    const { events, lastSummary } = useProgressStore.getState();
    const types = events.map((e) => e.type);
    expect(types).not.toContain('heart_lost');
    expect(types).toContain('practice_completed');
    expect(events.filter((e) => e.type === 'item_answered' && e.mode === 'review')).toEqual([
      expect.objectContaining({ itemId: 'sin', correct: false, unitId: 'u01' }),
    ]);
    expect(lastSummary).toMatchObject({ kind: 'review', streak: 1 });
    expect(router.replace).toHaveBeenCalledWith('/fin');
  });

  it('termine sur « Révision terminée ! » et revient à l’onglet Réviser', async () => {
    await setupStores();
    useProgressStore.getState().setLastSummary({
      kind: 'review',
      lessonId: 'revision',
      xp: 15,
      accuracy: 1,
      durationMs: 40_000,
      streak: 1,
      summaryFr: null,
      unlockedStory: null,
    });
    await render(<LessonEndScreen />);

    expect(screen.getAllByText('Révision terminée !').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('end-continue'));
    expect(router.dismissTo).toHaveBeenCalledWith('/reviser');
  });
});
