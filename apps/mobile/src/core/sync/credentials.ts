import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import { parseCredentials, type CredentialStore, type GuestCredentials } from './credentialsShared';

export type { CredentialStore, GuestCredentials };

const KEY = 'gbe.guest';

/** Android et iOS : le secret du compte invité reste dans le stockage chiffré du système. */
export const credentialStore: CredentialStore = {
  async load() {
    return parseCredentials(await getItemAsync(KEY));
  },
  async save(credentials) {
    await setItemAsync(KEY, JSON.stringify(credentials));
  },
  async clear() {
    await deleteItemAsync(KEY);
  },
};
