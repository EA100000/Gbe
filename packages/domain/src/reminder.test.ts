import fc from 'fast-check';

import {
  isReminderHour,
  localMinutes,
  localTimeToEpoch,
  planReminders,
  REMINDER_HORIZON_DAYS,
  REMINDER_HOURS,
  type ReminderPlanInput,
} from './reminder';

const base: ReminderPlanInput = {
  today: '2026-10-14',
  minutesNow: 9 * 60,
  hour: 19,
  goalReachedToday: false,
  activeToday: false,
  streak: 5,
};

describe('plan des rappels', () => {
  it('rappelle aujourd’hui et les jours suivants, une fois par jour', () => {
    // Agir
    const plan = planReminders(base);
    // Vérifier
    expect(plan).toHaveLength(REMINDER_HORIZON_DAYS);
    expect(plan.map((r) => r.dayKey)).toEqual([
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
    ]);
  });

  it('ne rappelle pas aujourd’hui quand l’objectif du jour est atteint', () => {
    const plan = planReminders({ ...base, goalReachedToday: true, activeToday: true });

    expect(plan[0]?.dayKey).toBe('2026-10-15');
    expect(plan).toHaveLength(REMINDER_HORIZON_DAYS - 1);
  });

  it('ne rappelle pas aujourd’hui quand l’heure est passée', () => {
    expect(planReminders({ ...base, minutesNow: 19 * 60 })[0]?.dayKey).toBe('2026-10-15');
    expect(planReminders({ ...base, minutesNow: 18 * 60 + 59 })[0]?.dayKey).toBe('2026-10-14');
  });

  it('cite la série aujourd’hui, puis demain seulement si l’apprenant a joué aujourd’hui', () => {
    const notPlayed = planReminders(base);
    const played = planReminders({ ...base, activeToday: true });

    expect(notPlayed.slice(0, 3).map((r) => r.streak)).toEqual([5, null, null]);
    expect(played.slice(0, 3).map((r) => r.streak)).toEqual([5, 5, null]);
  });

  it('ne cite jamais une série rompue', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fc.integer({ min: 0, max: 1439 }), (a, g, m) => {
        const plan = planReminders({
          ...base,
          streak: 0,
          activeToday: a,
          goalReachedToday: g,
          minutesNow: m,
        });
        expect(plan.every((r) => r.streak === null)).toBe(true);
      }),
    );
  });
});

describe('heures', () => {
  it('propose des heures entières de 6 h à 23 h', () => {
    expect(REMINDER_HOURS[0]).toBe(6);
    expect(REMINDER_HOURS.at(-1)).toBe(23);
  });

  it('reconnaît une heure valable', () => {
    expect(isReminderHour(0)).toBe(true);
    expect(isReminderHour(23)).toBe(true);
    expect(isReminderHour(24)).toBe(false);
    expect(isReminderHour(7.5)).toBe(false);
  });

  it('place 19 h, heure du Bénin (UTC+1), à 18 h UTC', () => {
    const at = localTimeToEpoch('2026-10-14', 19, () => 60);
    expect(new Date(at).toISOString()).toBe('2026-10-14T18:00:00.000Z');
  });

  it('suit le changement d’heure (Paris, passage à l’heure d’hiver le 25/10/2026)', () => {
    // Décalage +120 jusqu'au 25/10 à 1 h UTC, puis +60.
    const paris = (at: number) => (at < Date.UTC(2026, 9, 25, 1) ? 120 : 60);
    expect(new Date(localTimeToEpoch('2026-10-24', 19, paris)).toISOString()).toBe(
      '2026-10-24T17:00:00.000Z',
    );
    expect(new Date(localTimeToEpoch('2026-10-25', 19, paris)).toISOString()).toBe(
      '2026-10-25T18:00:00.000Z',
    );
  });

  it('donne les minutes écoulées depuis minuit, heure locale', () => {
    expect(localMinutes(Date.UTC(2026, 9, 14, 18, 30), 60)).toBe(19 * 60 + 30);
    expect(localMinutes(Date.UTC(2026, 9, 14, 23, 30), 60)).toBe(30);
    expect(localMinutes(Date.UTC(2026, 9, 14, 0, 30), -300)).toBe(19 * 60 + 30);
  });
});
