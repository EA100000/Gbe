import { createRng, type Rng } from '@gbe/domain';

/**
 * Générateur pour les tirages sans enjeu (pseudo, ordre des réponses).
 * Les règles du domaine reçoivent toujours le générateur en paramètre : les tests fixent la graine.
 */
export function freshRng(): Rng {
  return createRng(Math.floor(Math.random() * 2 ** 32));
}
