import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { useProgressStore } from '../../core/progress/progressStore';
import { setupStores } from '../../test-utils/fixtures';
import { ProfileScreen } from './ProfileScreen';
import { contactEmail, describeSystem, isBeta, problemReportUrl } from './problemReport';

describe('signalement d’un problème', () => {
  it('ne garde qu’une adresse e-mail valable', () => {
    expect(contactEmail(' equipe@gbe.app ')).toBe('equipe@gbe.app');
    expect(contactEmail('pas-une-adresse')).toBeNull();
    expect(contactEmail('')).toBeNull();
    expect(contactEmail(undefined)).toBeNull();
  });

  it('décrit le système du téléphone', () => {
    expect(describeSystem('android', 34)).toBe('Android (API 34)');
    expect(describeSystem('ios', '18.1')).toBe('iOS 18.1');
    expect(describeSystem('web', undefined)).toBe('web');
  });

  it('pré-remplit l’objet et le corps avec les versions, et rien d’autre', () => {
    // Agir
    const url = problemReportUrl({
      email: 'equipe@gbe.app',
      appVersion: '0.1.0',
      system: 'Android (API 34)',
    });
    // Vérifier
    const [address, query = ''] = url.replace('mailto:', '').split('?');
    const params = new URLSearchParams(query);
    expect(address).toBe('equipe@gbe.app');
    expect(params.get('subject')).toBe('Tourismo 0.1.0 : un problème');
    expect(params.get('body')).toContain('Tourismo 0.1.0 · Android (API 34)');
  });

  it('considère les versions 0.x comme des bêtas', () => {
    expect(isBeta('0.1.0')).toBe(true);
    expect(isBeta('1.0.0')).toBe(false);
  });
});

describe('profil : bêta', () => {
  const saved = process.env.EXPO_PUBLIC_CONTACT_EMAIL;

  beforeEach(async () => {
    jest.clearAllMocks();
    await setupStores();
    await useProgressStore.getState().completeOnboarding('regular');
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_CONTACT_EMAIL;
    else process.env.EXPO_PUBLIC_CONTACT_EMAIL = saved;
  });

  it('ouvre un e-mail de signalement quand une adresse est configurée', async () => {
    process.env.EXPO_PUBLIC_CONTACT_EMAIL = 'equipe@gbe.app';
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-report'));

    expect(openURL).toHaveBeenCalledWith(
      expect.stringMatching(/^mailto:equipe@gbe\.app\?subject=/),
    );
  });

  it('cache la ligne sans adresse', async () => {
    delete process.env.EXPO_PUBLIC_CONTACT_EMAIL;

    await render(<ProfileScreen />);

    expect(screen.queryByTestId('profile-report')).toBeNull();
  });

  it('affiche la version de l’appli', async () => {
    await render(<ProfileScreen />);

    expect(screen.getByTestId('profile-version')).toHaveTextContent(/^Tourismo \d+\.\d+\.\d+/);
  });
});
