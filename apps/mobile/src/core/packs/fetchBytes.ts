import { fetch } from 'expo/fetch';

import type { FetchBytes } from './packStorage.types';

/** Téléchargement natif (expo/fetch) : lit les octets bruts, sans conversion de texte. */
export const fetchBytes: FetchBytes = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Réponse ${response.status} pour ${url}`);
  return await response.bytes();
};
