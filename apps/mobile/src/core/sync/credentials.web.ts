import { browserStorage } from '../db/webStorageRepositories';
import { parseCredentials, type CredentialStore, type GuestCredentials } from './credentialsShared';

export type { CredentialStore, GuestCredentials };

const KEY = 'gbe.v1.guest';
const storage = browserStorage();

/** Web : stockage du navigateur (pas de coffre-fort chiffré disponible). */
export const credentialStore: CredentialStore = {
  async load() {
    try {
      return parseCredentials(storage.getItem(KEY));
    } catch {
      return null;
    }
  },
  async save(credentials) {
    try {
      storage.setItem(KEY, JSON.stringify(credentials));
    } catch (error) {
      console.warn('Enregistrement du compte impossible', error);
    }
  },
  async clear() {
    try {
      storage.setItem(KEY, '');
    } catch {
      // Rien à effacer.
    }
  },
};
