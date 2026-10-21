import { fireEvent, render, screen } from '@testing-library/react-native';

import { loadPlannedUnits } from '../../core/content/programme';
import { fakeUnit, setupStores } from '../../test-utils/fixtures';
import { PathScreen } from './PathScreen';

describe('chemin · la suite du programme', () => {
  it('annonce les unités prévues sans contenu, avec leur titre français', async () => {
    // Préparer
    await setupStores();
    // Agir
    await render(<PathScreen />);
    // Vérifier
    expect(screen.getByText('La suite du programme')).toBeOnTheScreen();
    expect(screen.getByText(/Section 1 · 1 unité prête sur 19/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Unité 2, Nombres : en préparation')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Unité 19, Une journée à Cotonou : en préparation'),
    ).toBeOnTheScreen();
  });

  it('explique ce qui attend une unité en préparation, puis referme', async () => {
    await setupStores();
    await render(<PathScreen />);

    await fireEvent.press(screen.getByLabelText('Unité 3, Au marché : en préparation'));

    expect(screen.getByTestId('upcoming-sheet')).toHaveTextContent(
      /Acheter, demander et négocier\. Nos deux experts/,
    );
    await fireEvent.press(screen.getByTestId('upcoming-close'));
    expect(screen.queryByTestId('upcoming-sheet')).toBeNull();
  });

  it('n’annonce plus une unité dont le pack est arrivé', async () => {
    await setupStores({ extraUnits: [fakeUnit(2)] });
    await render(<PathScreen />);

    expect(screen.queryByLabelText(/^Unité 2, .* : en préparation$/)).toBeNull();
    expect(screen.getByText(/2 unités prêtes sur 19/)).toBeOnTheScreen();
  });

  it('ignore un programme illisible au lieu de bloquer l’appli', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(loadPlannedUnits({ formatVersion: 1, units: [{ id: 'X' }] })).toEqual([]);
  });
});
