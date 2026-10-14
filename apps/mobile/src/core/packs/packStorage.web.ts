import type { PackStorage } from './packStorage.types';

/**
 * Web : pas encore de stockage des packs téléchargés (Android d'abord).
 * L'appli web utilise le pack embarqué ; les mises à jour de packs y sont désactivées.
 */
export function createPackStorage(): PackStorage | null {
  return null;
}
