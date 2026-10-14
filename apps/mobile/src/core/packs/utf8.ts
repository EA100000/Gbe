/** Plus petit caractère codable sur 2, 3 ou 4 octets. */
const MIN_CODE_POINT = [0, 0, 0x80, 0x800, 0x10000] as const;

/**
 * Décode de l'UTF-8 sans dépendre de TextDecoder (absent de certains moteurs JavaScript mobiles).
 * Indispensable pour le fon : ɖ, ɛ, ɔ et les tons combinés tiennent sur plusieurs octets.
 * Une séquence invalide devient le caractère de remplacement U+FFFD.
 */
export function decodeUtf8(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    let codePoint = 0xfffd;
    let length = 1;
    if (b0 < 0x80) {
      codePoint = b0;
    } else if (b0 >= 0xc2 && b0 < 0xe0) {
      length = 2;
    } else if (b0 >= 0xe0 && b0 < 0xf0) {
      length = 3;
    } else if (b0 >= 0xf0 && b0 < 0xf5) {
      length = 4;
    }
    if (length > 1) {
      const rest = bytes.subarray(i + 1, i + length);
      const valid = rest.length === length - 1 && rest.every((b) => (b & 0xc0) === 0x80);
      if (valid) {
        codePoint = b0 & (0xff >> (length + 1));
        for (const b of rest) codePoint = (codePoint << 6) | (b & 0x3f);
        // Rejette les encodages trop longs (même caractère écrit sur plus d'octets que nécessaire).
        const tooSmall = codePoint < (MIN_CODE_POINT[length] ?? 0);
        if (tooSmall || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
          codePoint = 0xfffd;
        }
      } else {
        codePoint = 0xfffd;
        length = 1;
      }
    }
    out += String.fromCodePoint(codePoint);
    i += length;
  }
  return out;
}
