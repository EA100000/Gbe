import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { loadContent } from '../../core/content/content';
import { useContentStore } from '../../core/content/contentStore';
import { useProgressStore } from '../../core/progress/progressStore';
import { bundledPacks } from '../../content/bundled-packs.generated';
import { setupStores } from '../../test-utils/fixtures';
import { bundledPackJson } from '../../test-utils/packFixtures';
import { LessonEndScreen } from '../lesson/LessonEndScreen';
import { WelcomeScreen } from '../onboarding/WelcomeScreen';
import { PathScreen } from '../path/PathScreen';
import { SoundsScreen } from '../sounds/SoundsScreen';
import { StoryScreen } from '../story/StoryScreen';

const completed = (lessonId: string, id: string) => ({
  id,
  type: 'lesson_completed' as const,
  at: Date.UTC(2026, 9, 13, 8, 0),
  dayKey: '2026-10-13',
  lessonId,
  unitId: 'u01',
  packId: 'u01-salutations',
  packVersion: 1,
  xp: 15,
  accuracy: 1,
  durationMs: 60_000,
});

beforeEach(() => jest.clearAllMocks());

describe('Bienvenue', () => {
  it('enregistre l’objectif choisi puis ouvre le chemin', async () => {
    await setupStores();
    await render(<WelcomeScreen />);

    expect(screen.getByText('Combien de temps par jour ?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('goal-serious'));
    await fireEvent.press(screen.getByTestId('welcome-start'));

    expect(useProgressStore.getState().settings).toEqual({ onboarded: true, dailyGoal: 'serious' });
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

describe('Chemin des leçons', () => {
  it('ouvre la leçon en cours et verrouille les suivantes', async () => {
    await setupStores({ events: [completed('u01-l01', 'a')] });
    await render(<PathScreen />);

    expect(screen.getByLabelText('Leçon 1, terminée : la refaire')).toBeOnTheScreen();
    expect(screen.getByLabelText('Leçon 3, verrouillée')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('Leçon 2 : commencer'));
    expect(router.push).toHaveBeenCalledWith('/lecon/u01-l02');
  });

  it('affiche la série et le bandeau « contenu de test »', async () => {
    await setupStores({ events: [completed('u01-l01', 'a')] });
    await render(<PathScreen />);

    expect(screen.getByLabelText('Série : 1 jours')).toBeOnTheScreen();
    expect(
      screen.getByText('Contenu de test, pas encore validé par les experts'),
    ).toBeOnTheScreen();
  });

  it('passe à la nouvelle version du pack en revenant sur le chemin', async () => {
    // Préparer : une version 2 a été téléchargée pendant une leçon.
    await setupStores();
    const v2 = loadContent(bundledPackJson(2), bundledPacks[0]?.audio ?? {});
    if (!v2.ok) throw new Error('pack v2 invalide');
    useContentStore.setState({ pending: [v2.content] });
    // Agir
    await render(<PathScreen />);
    // Vérifier
    expect(useContentStore.getState().content?.pack.version).toBe(2);
    expect(useContentStore.getState().pending).toBeNull();
  });

  it('ouvre la calebasse une seule fois quand l’unité est terminée', async () => {
    const ids = ['u01-l01', 'u01-l02', 'u01-l03', 'u01-l04', 'u01-histoire'];
    await setupStores({ events: ids.map((id, i) => completed(id, `e${i}`)) });
    await render(<PathScreen />);

    expect(await screen.findByLabelText('20 cauris')).toBeOnTheScreen();
    expect(screen.getByLabelText('Calebasse-récompense, ouverte')).toBeOnTheScreen();
  });
});

describe('Histoire au marché', () => {
  it('explique une réplique fausse puis valide la bonne', async () => {
    await setupStores();
    await render(<StoryScreen lessonId="u01-histoire" />);

    await fireEvent.press(screen.getByTestId('story-choice-0'));
    expect(screen.getByText(/c’est « merci »/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('story-choice-1'));
    expect(screen.getByText('Bien négocié !')).toBeOnTheScreen();
    const events = useProgressStore.getState().events;
    expect(events).toEqual([
      expect.objectContaining({ type: 'lesson_completed', accuracy: 0, xp: 10 }),
    ]);
  });

  it('masque et réaffiche la traduction', async () => {
    await setupStores();
    await render(<StoryScreen lessonId="u01-histoire" />);

    expect(screen.getByText('Oui ! Combien ça coûte ?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('story-translate'));
    expect(screen.queryByText('Oui ! Combien ça coûte ?')).toBeNull();
  });
});

describe('Leçon terminée', () => {
  it('affiche XP, précision, durée, série et histoire débloquée', async () => {
    await setupStores();
    useProgressStore.getState().setLastSummary({
      lessonId: 'u01-l04',
      xp: 15,
      accuracy: 0.9,
      durationMs: 168_000,
      streak: 5,
      summaryFr: 'Tu sais dire merci.',
      unlockedStory: { lessonId: 'u01-histoire', title: 'Au marché Dantokpa' },
    });
    await render(<LessonEndScreen />);

    expect(screen.getByLabelText('XP gagnés : +15')).toBeOnTheScreen();
    expect(screen.getByLabelText('Précision : 90 %')).toBeOnTheScreen();
    expect(screen.getByLabelText('Durée : 2:48')).toBeOnTheScreen();
    expect(screen.getByText('Série de 5 jours !')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('end-story'));
    expect(router.replace).toHaveBeenCalledWith('/histoire/u01-histoire');
  });
});

describe('Les sons du fon', () => {
  it('liste les lettres du pack et les tons', async () => {
    await setupStores();
    await render(<SoundsScreen />);

    expect(screen.getByText('Lettres propres au fon')).toBeOnTheScreen();
    expect(screen.getByLabelText('Écouter ɖokpó : un')).toBeOnTheScreen();
    expect(screen.getByLabelText('á : haut')).toBeOnTheScreen();
  });
});
