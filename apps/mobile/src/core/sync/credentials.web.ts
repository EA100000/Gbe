import { browserStorage } from '../db/webStorageRepositories';
import { parseCredentials, type CredentialStore, type GuestCredentials } from './credentialsShared';

export type { CredentialStore, GuestCredentials };

const storage = browserStorage();

/** Web : stockage du navigateur (pas de coffre-fort chiffré disponible). */
function createCredentialStore(key: string): CredentialStore {
  return {
    async load() {
      try {
        return parseCredentials(storage.getItem(key));
      } catch {
        return null;
      }
    },
    async save(credentials) {
      try {
        storage.setItem(key, JSON.stringify(credentials));
      } catch (error) {
        console.warn('Enregistrement du compte impossible', error);
      }
    },
    async clear() {
      try {
        storage.setItem(key, '');
      } catch {
        // Rien à effacer.
      }
    },
  };
}

export const credentialStore = createCredentialStore('gbe.v1.guest');
export const pendingDeletionStore = createCredentialStore('gbe.v1.pendingDeletion');
