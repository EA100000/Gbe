import { buildPack } from '@gbe/content-schema/src/__fixtures__/pack';
import { fakeClock, memoryDatabase, testContent } from '../test-utils/fixtures';
import { loadContent, playableExercises } from './content/content';
import {
  createEventRepository,
  createSettingsRepository,
  DEFAULT_SETTINGS,
} from './db/repositories';
import { formatDuration, formatPercent, t, tPlural } from './i18n';
import { fr } from './i18n/fr';
import { heartLostEvent } from './progress/eventFactory';

describe('chargement du contenu', () => {
  it('valide le pack embarqué et indexe ses éléments', () => {
    const content = testContent();
    expect(content.pack.unit.lessons.length).toBeGreaterThan(0);
    expect(content.audioSources.size).toBe(content.pack.audios.length);
  });

  it('refuse un pack dont un fichier audio manque', () => {
    const result = loadContent(buildPack(), { 'audio/a.m4a': 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe('audio/b.m4a');
  });

  it('refuse un pack invalide', () => {
    expect(loadContent({ id: 'x' }, {}).ok).toBe(false);
  });

  it('écarte les exercices que cette version ne sait pas afficher', () => {
    const lesson = buildPack().unit.lessons[0];
    if (lesson === undefined) throw new Error('fixture');
    expect(playableExercises(lesson).map((e) => e.type)).not.toContain('pronunciation');
  });
});

describe('dépôt des événements', () => {
  it('n’enregistre qu’une fois un événement envoyé deux fois', async () => {
    const db = memoryDatabase();
    const repo = createEventRepository(db);
    const event = heartLostEvent(fakeClock(), 'l1');
    await repo.append([event]);
    await repo.append([event]);
    expect(await repo.all()).toEqual([event]);
  });

  it('ignore une ligne abîmée au lieu de planter', async () => {
    const db = memoryDatabase();
    db.rows.push(
      { id: 'x', at: 0, payload: '{pas du json' },
      { id: 'y', at: 1, payload: '{"type":"inconnu"}' },
    );
    expect(await createEventRepository(db).all()).toEqual([]);
  });
});

describe('dépôt des réglages', () => {
  it('rend les réglages par défaut au premier lancement', async () => {
    const repo = createSettingsRepository(memoryDatabase());
    expect(await repo.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('relit l’objectif, le pseudo et le rappel enregistrés', async () => {
    const repo = createSettingsRepository(memoryDatabase());
    const saved = {
      onboarded: true,
      dailyGoal: 'intense' as const,
      pseudo: 'Lion sage',
      reminder: { enabled: true, hour: 7 },
      reminderOffered: true,
    };
    await repo.save(saved);
    expect(await repo.load()).toEqual(saved);
  });

  it('remplace une heure de rappel abîmée par l’heure par défaut', async () => {
    const db = memoryDatabase();
    const repo = createSettingsRepository(db);
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', 'reminderHour', '31');
    expect((await repo.load()).reminder).toEqual({ enabled: false, hour: 19 });
  });

  it('ignore un pseudo stocké qui ne vient pas des listes', async () => {
    const db = memoryDatabase();
    const repo = createSettingsRepository(db);
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', 'pseudo', 'Insulte');
    expect((await repo.load()).pseudo).toBeNull();
  });

  it('revient aux réglages du premier lancement', async () => {
    const repo = createSettingsRepository(memoryDatabase());
    const settings = { ...DEFAULT_SETTINGS, onboarded: true, dailyGoal: 'intense' as const };
    await repo.save({ ...settings, pseudo: 'Lion sage' });
    await repo.save({ ...settings, pseudo: null });
    expect((await repo.load()).pseudo).toBeNull();
    await repo.clear();
    expect(await repo.load()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('traductions', () => {
  it('remplace les paramètres et garde les inconnus visibles', () => {
    expect(t('path.unit', { n: 1, title: 'Salutations' })).toBe('Unité 1 · Salutations');
    expect(t('path.unit', { n: 1 })).toBe('Unité 1 · {title}');
  });

  it('accorde la série au singulier et au pluriel', () => {
    expect(tPlural(1, 'end.streak.one', 'end.streak.other')).toBe('Série de 1 jour !');
    expect(tPlural(5, 'end.streak.one', 'end.streak.other')).toBe('Série de 5 jours !');
  });

  it('a toujours une forme au singulier et une au pluriel', () => {
    const keys = Object.keys(fr);
    const plurals = keys.filter((key) => key.endsWith('.one') || key.endsWith('.other'));
    for (const key of plurals) {
      const stem = key.replace(/\.(one|other)$/, '');
      expect(keys).toContain(`${stem}.one`);
      expect(keys).toContain(`${stem}.other`);
    }
    expect(plurals.length).toBeGreaterThan(0);
  });

  it('accorde vies et série à 0 et 1 comme en français (singulier)', () => {
    expect(tPlural(0, 'lesson.heartsLeft.one', 'lesson.heartsLeft.other')).toBe('0 vie restante');
    expect(tPlural(1, 'path.streak.one', 'path.streak.other')).toBe('Série : 1 jour');
    expect(tPlural(3, 'path.hearts.one', 'path.hearts.other')).toBe('3 vies');
  });

  it('affiche la durée et la précision comme la maquette', () => {
    expect(formatDuration(168_000)).toBe('2:48');
    expect(formatPercent(0.9)).toBe('90 %');
  });
});
