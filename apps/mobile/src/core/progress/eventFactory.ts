import type {
  ChestOpenedEvent,
  HeartLostEvent,
  ItemAnsweredEvent,
  LessonCompletedEvent,
  PracticeCompletedEvent,
} from '@gbe/domain';
import { randomUUID } from 'expo-crypto';

import { dayKeyAt, type Clock } from '../clock';

/** Fabrique les événements du journal, chacun avec un identifiant unique. */
export function heartLostEvent(clock: Clock, lessonId: string): HeartLostEvent {
  const at = clock.now();
  return { id: randomUUID(), type: 'heart_lost', at, dayKey: dayKeyAt(clock, at), lessonId };
}

export function lessonCompletedEvent(
  clock: Clock,
  data: Omit<LessonCompletedEvent, 'id' | 'type' | 'at' | 'dayKey'>,
): LessonCompletedEvent {
  const at = clock.now();
  return { id: randomUUID(), type: 'lesson_completed', at, dayKey: dayKeyAt(clock, at), ...data };
}

/**
 * L'ouverture d'une calebasse a un identifiant stable :
 * même déclenchée deux fois (deux appareils), elle ne crédite qu'une fois.
 */
export function chestOpenedEvent(clock: Clock, chestId: string, cauris: number): ChestOpenedEvent {
  const at = clock.now();
  return {
    id: `chest:${chestId}`,
    type: 'chest_opened',
    at,
    dayKey: dayKeyAt(clock, at),
    chestId,
    cauris,
  };
}

/** Premier essai sur un mot ou une phrase (ADR 0019). */
export function itemAnsweredEvent(
  clock: Clock,
  data: Omit<ItemAnsweredEvent, 'id' | 'type' | 'at' | 'dayKey'>,
): ItemAnsweredEvent {
  const at = clock.now();
  return { id: randomUUID(), type: 'item_answered', at, dayKey: dayKeyAt(clock, at), ...data };
}

/** Fin d'une séance d'entraînement (révision, écoute). */
export function practiceCompletedEvent(
  clock: Clock,
  data: Omit<PracticeCompletedEvent, 'id' | 'type' | 'at' | 'dayKey'>,
): PracticeCompletedEvent {
  const at = clock.now();
  return { id: randomUUID(), type: 'practice_completed', at, dayKey: dayKeyAt(clock, at), ...data };
}
