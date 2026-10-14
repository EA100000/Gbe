import { captureException } from '@sentry/react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { formatWait } from '../../core/i18n';
import { fakeClock, fakeUnit, setupStores } from '../../test-utils/fixtures';
import { ErrorScreen } from '../errors/ErrorScreen';
import { OutOfHeartsScreen } from '../hearts/OutOfHeartsScreen';
import { PathScreen } from '../path/PathScreen';

/** `count` vies perdues juste avant l'heure de l'horloge de test. */
function heartLosses(count: number, clock = fakeClock()) {
  return Array.from({ length: count }, (_, i) => ({
    id: `h${i}`,
    type: 'heart_lost' as const,
    at: clock.now() - 1000 + i,
    dayKey: '2026-10-13',
    lessonId: 'u01-l01',
  }));
}

beforeEach(() => jest.clearAllMocks());

describe('durées d’attente', () => {
  it('s’écrivent à la française, arrondies à la minute supérieure', () => {
    expect(formatWait(30_000)).toBe('1 min');
    expect(formatWait(24 * 60_000)).toBe('24 min');
    expect(formatWait(144 * 60_000)).toBe('2 h 24');
    expect(formatWait(122 * 60_000 - 1)).toBe('2 h 02');
    expect(formatWait(180 * 60_000)).toBe('3 h');
  });
});

describe('écran 16 : plus de vies', () => {
  it('montre les cinq cœurs vides et quand les vies reviennent', async () => {
    // Préparer : les 5 vies perdues il y a une seconde.
    const clock = fakeClock();
    await setupStores({ clock, events: heartLosses(5, clock) });
    // Agir
    await render(<OutOfHeartsScreen />);
    // Vérifier
    expect(screen.getByText('Plus de vies !')).toBeOnTheScreen();
    expect(screen.getByLabelText('0 vie sur 5')).toBeOnTheScreen();
    expect(screen.getByLabelText('Prochaine vie : dans 30 min')).toBeOnTheScreen();
    expect(screen.getByLabelText('Toutes tes vies : dans 2 h 30')).toBeOnTheScreen();
  });

  it('ramène au chemin ou mène aux sons du fon', async () => {
    await setupStores({ events: heartLosses(5) });
    await render(<OutOfHeartsScreen />);

    await fireEvent.press(screen.getByTestId('hearts-back'));
    expect(router.back).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('hearts-sounds'));
    expect(router.navigate).toHaveBeenCalledWith('/sons');
  });

  it('annonce une vie revenue pendant que l’écran est ouvert', async () => {
    const clock = fakeClock();
    await setupStores({ clock, events: heartLosses(5, clock) });
    clock.advance(31 * 60_000);

    await render(<OutOfHeartsScreen />);

    expect(screen.getByText('Une vie est revenue !')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 vie sur 5')).toBeOnTheScreen();
  });

  it('est ouvert depuis le chemin au lieu d’une leçon quand il n’y a plus de vie', async () => {
    await setupStores({ events: heartLosses(5) });
    await render(<PathScreen />);

    await fireEvent.press(screen.getByLabelText('Leçon 1 : commencer'));

    expect(router.push).toHaveBeenCalledWith('/vies');
  });
});

describe('écran 18 : unité verrouillée', () => {
  it('dit quelle unité terminer pour l’ouvrir', async () => {
    await setupStores({ extraUnits: [fakeUnit(2)] });

    await render(<PathScreen />);

    expect(screen.getByText('Termine l’unité 1 pour l’ouvrir')).toBeOnTheScreen();
  });
});

describe('écran 19 : un souci', () => {
  it('signale l’erreur et propose de réessayer l’écran en panne', async () => {
    const retry = jest.fn(async () => undefined);
    const error = new Error('panne');

    await render(<ErrorScreen error={error} retry={retry} />);
    await fireEvent.press(screen.getByTestId('error-retry'));

    expect(screen.getByText('Oups, un souci !')).toBeOnTheScreen();
    expect(captureException).toHaveBeenCalledWith(error);
    expect(retry).toHaveBeenCalled();
  });

  it('ramène au chemin', async () => {
    const retry = jest.fn(async () => undefined);
    await render(<ErrorScreen error={new Error('panne')} retry={retry} />);

    await fireEvent.press(screen.getByTestId('error-home'));

    expect(router.replace).toHaveBeenCalledWith('/');
    expect(retry).toHaveBeenCalled();
  });
});
