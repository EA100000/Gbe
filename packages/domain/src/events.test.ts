import fc from 'fast-check';

import {
  applyEvents,
  dedupeEvents,
  parseGameEvent,
  type ChestOpenedEvent,
  type GameEvent,
  type HeartLostEvent,
  type LessonCompletedEvent,
} from './events';

const T0 = Date.UTC(2026, 9, 13, 9, 0);

function lessonCompleted(overrides: Partial<LessonCompletedEvent> = {}): LessonCompletedEvent {
  return {
    id: 'evt-1',
    type: 'lesson_completed',
    at: T0,
    dayKey: '2026-10-13',
    lessonId: 'u01-l01',
    unitId: 'u01',
    packId: 'pack-u01',
    packVersion: 1,
    xp: 15,
    accuracy: 0.9,
    durationMs: 168_000,
    ...overrides,
  };
}

function heartLost(overrides: Partial<HeartLostEvent> = {}): HeartLostEvent {
  return {
    id: 'evt-h',
    type: 'heart_lost',
    at: T0,
    dayKey: '2026-10-13',
    lessonId: 'u01-l01',
    ...overrides,
  };
}

function chestOpened(overrides: Partial<ChestOpenedEvent> = {}): ChestOpenedEvent {
  return {
    id: 'evt-c',
    type: 'chest_opened',
    at: T0,
    dayKey: '2026-10-13',
    chestId: 'u01-calebasse',
    cauris: 20,
    ...overrides,
  };
}

describe('applyEvents', () => {
  it('additionne l’XP des leçons terminées', () => {
    const progress = applyEvents([
      lessonCompleted({ id: 'a', xp: 15 }),
      lessonCompleted({ id: 'b', xp: 10, lessonId: 'u01-l02' }),
    ]);
    expect(progress.totalXp).toBe(25);
    expect([...progress.completedLessons]).toEqual(['u01-l01', 'u01-l02']);
  });

  it('ne compte qu’une fois un événement reçu deux fois', () => {
    const event = lessonCompleted({ id: 'same' });
    expect(applyEvents([event, event]).totalXp).toBe(15);
  });

  it('donne le même résultat quel que soit l’ordre et les doublons (propriété)', () => {
    const events: GameEvent[] = [
      lessonCompleted({ id: 'a', at: T0 }),
      lessonCompleted({ id: 'b', at: T0 + 10, dayKey: '2026-10-14', xp: 10 }),
      heartLost({ id: 'h', at: T0 + 5 }),
      chestOpened({ id: 'c', at: T0 + 20 }),
    ];
    const reference = applyEvents(events);
    fc.assert(
      fc.property(fc.shuffledSubarray(events, { minLength: 0 }), (extra) => {
        const replayed = applyEvents([...extra, ...events.slice().reverse(), ...extra]);
        expect(replayed.totalXp).toBe(reference.totalXp);
        expect(replayed.cauris).toBe(reference.cauris);
        expect(replayed.heartLossTimes).toEqual(reference.heartLossTimes);
        expect([...replayed.activeDays].sort()).toEqual([...reference.activeDays].sort());
      }),
    );
  });

  it('range l’XP et le temps de pratique par jour', () => {
    const progress = applyEvents([
      lessonCompleted({ id: 'a', xp: 15, durationMs: 1000 }),
      lessonCompleted({ id: 'b', xp: 10, durationMs: 2000 }),
      lessonCompleted({ id: 'c', xp: 10, durationMs: 500, dayKey: '2026-10-14', at: T0 + 1 }),
    ]);
    expect(progress.xpByDay.get('2026-10-13')).toBe(25);
    expect(progress.practiceMsByDay.get('2026-10-13')).toBe(3000);
    expect([...progress.activeDays]).toEqual(['2026-10-13', '2026-10-14']);
  });

  it('garde les instants des vies perdues', () => {
    const progress = applyEvents([
      heartLost({ id: 'h1', at: T0 }),
      heartLost({ id: 'h2', at: T0 + 1 }),
    ]);
    expect(progress.heartLossTimes).toEqual([T0, T0 + 1]);
  });

  it('crédite les cauris d’une calebasse une seule fois, même sous deux identifiants', () => {
    const progress = applyEvents([
      chestOpened({ id: 'c1' }),
      chestOpened({ id: 'c2', at: T0 + 1 }),
    ]);
    expect(progress.cauris).toBe(20);
    expect([...progress.openedChests]).toEqual(['u01-calebasse']);
  });

  it('ne compte pas les vies perdues comme des jours de série', () => {
    expect(applyEvents([heartLost()]).activeDays.size).toBe(0);
  });
});

describe('dedupeEvents', () => {
  it('trie par date puis par identifiant', () => {
    const sorted = dedupeEvents([
      heartLost({ id: 'b', at: T0 }),
      heartLost({ id: 'a', at: T0 }),
      heartLost({ id: 'c', at: T0 - 1 }),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('parseGameEvent', () => {
  it('accepte un événement valide', () => {
    expect(parseGameEvent(lessonCompleted())).toEqual(lessonCompleted());
  });

  it('refuse un événement au jour mal formé', () => {
    expect(parseGameEvent(lessonCompleted({ dayKey: '13/10/2026' }))).toBeNull();
  });

  it('refuse un type d’événement inconnu', () => {
    expect(parseGameEvent({ ...heartLost(), type: 'gem_bought' })).toBeNull();
  });

  it('refuse une précision hors de [0, 1]', () => {
    expect(parseGameEvent(lessonCompleted({ accuracy: 1.5 }))).toBeNull();
  });
});

describe('entraînement (ADR 0019)', () => {
  it('compte l’XP et la série d’une séance d’entraînement, pas une leçon terminée', () => {
    const progress = applyEvents([
      {
        id: 'p1',
        type: 'practice_completed',
        at: T0,
        dayKey: '2026-10-13',
        mode: 'review',
        xp: 12,
        accuracy: 0.8,
        durationMs: 90_000,
      },
    ]);

    expect(progress.totalXp).toBe(12);
    expect([...progress.activeDays]).toEqual(['2026-10-13']);
    expect(progress.practiceMsByDay.get('2026-10-13')).toBe(90_000);
    expect(progress.completedLessons.size).toBe(0);
  });

  it('lit une réponse à un mot sans changer la progression', () => {
    const event = parseGameEvent({
      id: 'r1',
      type: 'item_answered',
      at: T0,
      dayKey: '2026-10-13',
      unitId: 'u01',
      itemId: 'sin',
      correct: false,
      mode: 'listen',
    });

    expect(event?.type).toBe('item_answered');
    expect(applyEvents(event === null ? [] : [event]).totalXp).toBe(0);
  });

  it('refuse une séance d’entraînement en mode « leçon »', () => {
    const event = { id: 'p', type: 'practice_completed', at: T0, dayKey: '2026-10-13' };

    expect(
      parseGameEvent({ ...event, mode: 'lesson', xp: 1, accuracy: 1, durationMs: 1 }),
    ).toBeNull();
  });
});
