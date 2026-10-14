import { browserStorage } from '../db/webStorageRepositories';
import {
  parseCredentials,
  type CredentialStore,
  type GuestCredentials,
  type SecretTextStore,
} from './credentialsShared';

export type { CredentialStore, GuestCredentials, SecretTextStore };

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

/** Code de récupération (web : stockage du navigateur). */
export const recoveryCodeStore: SecretTextStore = {
  async load() {
    try {
      const value = storage.getItem('gbe.v1.recoveryCode');
      return value === null || value.length === 0 ? null : value;
    } catch {
      return null;
    }
  },
  async save(value) {
    try {
      storage.setItem('gbe.v1.recoveryCode', value);
    } catch (error) {
      console.warn('Enregistrement du code impossible', error);
    }
  },
  async clear() {
    try {
      storage.setItem('gbe.v1.recoveryCode', '');
    } catch {
      // Rien à effacer.
    }
  },
};
