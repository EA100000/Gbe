import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import { parseCredentials, type CredentialStore, type GuestCredentials } from './credentialsShared';

export type { CredentialStore, GuestCredentials };

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
