import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useProgressStore } from '../../core/progress/progressStore';
import { setupStores } from '../../test-utils/fixtures';
import { LevelScreen } from './LevelScreen';
import { useOnboardingDraft } from './onboardingDraft';
import { ReasonScreen } from './ReasonScreen';
import { WelcomeScreen } from './WelcomeScreen';

beforeEach(async () => {
  jest.clearAllMocks();
  useOnboardingDraft.getState().reset();
  await setupStores();
});

describe('démarrage · pourquoi le fon', () => {
  it('attend une raison avant de continuer', async () => {
    await render(<ReasonScreen />);

    expect(screen.getByText('Pourquoi apprends-tu le fon ?')).toBeOnTheScreen();
    expect(screen.getByTestId('reason-continue')).toBeDisabled();
  });

  it('retient la raison choisie et passe au niveau', async () => {
    await render(<ReasonScreen />);

    await fireEvent.press(screen.getByTestId('reason-racines'));
    await fireEvent.press(screen.getByTestId('reason-continue'));

    expect(useOnboardingDraft.getState().reason).toBe('racines');
    expect(router.push).toHaveBeenCalledWith('/niveau');
  });

  it('se présente comme la première étape sur trois, sans bouton retour', async () => {
    await render(<ReasonScreen />);

    expect(screen.getByLabelText('Étape 1 sur 3')).toBeOnTheScreen();
    expect(screen.queryByTestId('onboarding-back')).toBeNull();
  });
});

describe('démarrage · ton niveau', () => {
  it('annonce le test de niveau pour qui comprend déjà des phrases', async () => {
    await render(<LevelScreen />);

    await fireEvent.press(screen.getByTestId('level-phrases-simples'));

    expect(screen.getByTestId('level-placement')).toHaveTextContent(
      /test de niveau arrive bientôt/,
    );
  });

  it('ne l’annonce pas à un débutant, et passe à l’objectif du jour', async () => {
    await render(<LevelScreen />);

    await fireEvent.press(screen.getByTestId('level-decouverte'));
    await fireEvent.press(screen.getByTestId('level-continue'));

    expect(screen.queryByTestId('level-placement')).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/objectif');
  });

  it('revient à l’étape précédente', async () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);
    await render(<LevelScreen />);

    await fireEvent.press(screen.getByTestId('onboarding-back'));

    expect(router.back).toHaveBeenCalled();
  });
});

describe('démarrage · fin', () => {
  it('enregistre la raison, le niveau et l’objectif, puis oublie le brouillon', async () => {
    jest.mocked(router.canDismiss).mockReturnValue(true);
    useOnboardingDraft.getState().setReason('famille');
    useOnboardingDraft.getState().setLevel('quelques-mots');
    await render(<WelcomeScreen />);

    await fireEvent.press(screen.getByTestId('goal-intense'));
    await fireEvent.press(screen.getByTestId('welcome-start'));

    expect(useProgressStore.getState().settings).toMatchObject({
      onboarded: true,
      dailyGoal: 'intense',
      learningReason: 'famille',
      selfLevel: 'quelques-mots',
    });
    expect(useOnboardingDraft.getState()).toMatchObject({ reason: null, level: null });
    // Les étapes du démarrage quittent la pile avant d'ouvrir le chemin.
    expect(router.dismissAll).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
