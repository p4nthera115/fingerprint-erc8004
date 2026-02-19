/**
 * SHA-256 hashing utilities using the Web Crypto API.
 * Pure, deterministic — no external crypto libraries.
 */

/**
 * Hash any string to a 32-byte Uint8Array via SHA-256.
 */
export async function hashString(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(buffer)
}

/**
 * Hash any string to a hex string.
 */
export async function hashStringToHex(input: string): Promise<string> {
  const bytes = await hashString(input)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Map a byte value [0, 255] to a float in [min, max].
 */
export function byteToFloat(byte: number, min: number, max: number): number {
  return min + (byte / 255) * (max - min)
}

/**
 * Map a byte value [0, 255] to an integer in [0, count - 1].
 */
export function byteToIndex(byte: number, count: number): number {
  return Math.floor((byte / 256) * count)
}
