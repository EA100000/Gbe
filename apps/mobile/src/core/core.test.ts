import { buildPack } from '@gbe/content-schema/src/__fixtures__/pack';
import { fakeClock, memoryDatabase, testContent } from '../test-utils/fixtures';
import { loadContent, playableExercises } from './content/content';
import { createEventRepository, createSettingsRepository } from './db/repositories';
import { formatDuration, formatPercent, t, tPlural } from './i18n';
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
    expect(await repo.load()).toEqual({ onboarded: false, dailyGoal: 'regular', pseudo: null });
  });

  it('relit l’objectif et le pseudo enregistrés', async () => {
    const repo = createSettingsRepository(memoryDatabase());
    await repo.save({ onboarded: true, dailyGoal: 'intense', pseudo: 'Lion sage' });
    expect(await repo.load()).toEqual({
      onboarded: true,
      dailyGoal: 'intense',
      pseudo: 'Lion sage',
    });
  });

  it('ignore un pseudo stocké qui ne vient pas des listes', async () => {
    const db = memoryDatabase();
    const repo = createSettingsRepository(db);
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', 'pseudo', 'Insulte');
    expect((await repo.load()).pseudo).toBeNull();
  });

  it('revient aux réglages du premier lancement', async () => {
    const repo = createSettingsRepository(memoryDatabase());
    await repo.save({ onboarded: true, dailyGoal: 'intense', pseudo: 'Lion sage' });
    await repo.save({ onboarded: true, dailyGoal: 'intense', pseudo: null });
    expect((await repo.load()).pseudo).toBeNull();
    await repo.clear();
    expect(await repo.load()).toEqual({ onboarded: false, dailyGoal: 'regular', pseudo: null });
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

  it('affiche la durée et la précision comme la maquette', () => {
    expect(formatDuration(168_000)).toBe('2:48');
    expect(formatPercent(0.9)).toBe('90 %');
  });
});
