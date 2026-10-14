import type { FetchBytes } from './packStorage.types';

export const fetchBytes: FetchBytes = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Réponse ${response.status} pour ${url}`);
  return new Uint8Array(await response.arrayBuffer());
};
