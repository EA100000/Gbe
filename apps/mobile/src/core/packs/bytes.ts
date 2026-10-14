import { CryptoDigestAlgorithm, digest } from 'expo-crypto';

import type { Sha256 } from './packStorage.types';

/** Empreinte SHA-256 (hexadécimal minuscule), calculée par le système. */
export const sha256Hex: Sha256 = async (bytes) => {
  // digest exige un tampon ordinaire (pas partagé) : on ne copie que si nécessaire.
  const data =
    bytes.buffer instanceof ArrayBuffer
      ? (bytes as Uint8Array<ArrayBuffer>)
      : new Uint8Array(bytes);
  const hash = new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, data));
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
};

export { decodeUtf8 } from './utf8';
