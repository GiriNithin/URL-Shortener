/**
 * Encode a numeric ID to a base62 short code.
 * Base62 uses 0-9, a-z, A-Z (62 chars) — URL-safe, no special characters.
 */
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = 62;

export function idToShortCode(id: number): string {
  if (id <= 0) return BASE62_CHARS[0];
  let n = id;
  let code = '';
  while (n > 0) {
    code = BASE62_CHARS[n % BASE] + code;
    n = Math.floor(n / BASE);
  }
  return code;
}

/**
 * Decode a base62 short code back to numeric ID.
 */
export function shortCodeToId(code: string): number {
  let id = 0;
  for (let i = 0; i < code.length; i++) {
    const idx = BASE62_CHARS.indexOf(code[i]);
    if (idx === -1) return 0;
    id = id * BASE + idx;
  }
  return id;
}
