import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import {
  parseCredentials,
  type CredentialStore,
  type GuestCredentials,
  type SecretTextStore,
} from './credentialsShared';

export type { CredentialStore, GuestCredentials, SecretTextStore };

/** Android et iOS : identifiants dans le stockage chiffré du système. */
function createCredentialStore(key: string): CredentialStore {
  return {
    async load() {
      return parseCredentials(await getItemAsync(key));
    },
    async save(credentials) {
      await setItemAsync(key, JSON.stringify(credentials));
    },
    async clear() {
      await deleteItemAsync(key);
    },
  };
}

/** Compte invité en cours. */
export const credentialStore = createCredentialStore('gbe.guest');
/** Compte supprimé sur le téléphone, dont la suppression sur le serveur reste à faire (hors-ligne). */
export const pendingDeletionStore = createCredentialStore('gbe.pendingDeletion');

/** Code de récupération du compte, pour le réafficher sans le redemander au serveur. */
export const recoveryCodeStore: SecretTextStore = {
  async load() {
    const value = await getItemAsync('gbe.recoveryCode');
    return value === null || value.length === 0 ? null : value;
  },
  async save(value) {
    await setItemAsync('gbe.recoveryCode', value);
  },
  async clear() {
    await deleteItemAsync('gbe.recoveryCode');
  },
};
