import { heartLostEvent } from '../progress/eventFactory';
import { fakeClock } from '../../test-utils/fixtures';
import {
  browserStorage,
  createWebStorageRepositories,
  memoryStorage,
  type KeyValueStorage,
} from './webStorageRepositories';

describe('stockage web de la progression', () => {
  it('relit les événements enregistrés, sans doublon', async () => {
    // Préparer
    const repos = createWebStorageRepositories(memoryStorage());
    const event = heartLostEvent(fakeClock(), 'l1');
    // Agir
    await repos.events.append([event]);
    await repos.events.append([event]);
    // Vérifier
    expect(await repos.events.all()).toEqual([event]);
  });

  it('ignore un journal abîmé au lieu de planter', async () => {
    const storage = memoryStorage();
    storage.setItem('gbe.v1.events', '{pas du json');
    expect(await createWebStorageRepositories(storage).events.all()).toEqual([]);
  });

  it('écarte une entrée invalide et garde les autres', async () => {
    const storage = memoryStorage();
    const valid = heartLostEvent(fakeClock(), 'l1');
    storage.setItem('gbe.v1.events', JSON.stringify([JSON.stringify(valid), '{"type":"x"}', 42]));
    expect(await createWebStorageRepositories(storage).events.all()).toEqual([valid]);
  });

  it('ignore un journal qui n’est pas une liste', async () => {
    const storage = memoryStorage();
    storage.setItem('gbe.v1.events', '{"a":1}');
    expect(await createWebStorageRepositories(storage).events.all()).toEqual([]);
  });

  it('enregistre et relit les réglages', async () => {
    const repos = createWebStorageRepositories(memoryStorage());
    expect(await repos.settings.load()).toEqual({
      onboarded: false,
      dailyGoal: 'regular',
      pseudo: null,
    });
    await repos.settings.save({ onboarded: true, dailyGoal: 'relaxed', pseudo: 'Tortue calme' });
    expect(await repos.settings.load()).toEqual({
      onboarded: true,
      dailyGoal: 'relaxed',
      pseudo: 'Tortue calme',
    });
    await repos.settings.clear();
    expect((await repos.settings.load()).onboarded).toBe(false);
  });

  it('continue de fonctionner quand le navigateur refuse l’écriture', async () => {
    const refusing: KeyValueStorage = {
      getItem: () => {
        throw new Error('refusé');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const repos = createWebStorageRepositories(refusing);
    await repos.events.append([heartLostEvent(fakeClock(), 'l1')]);
    expect(await repos.events.all()).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('se replie sur la mémoire quand localStorage est indisponible', () => {
    const storage = browserStorage();
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
  });
});
