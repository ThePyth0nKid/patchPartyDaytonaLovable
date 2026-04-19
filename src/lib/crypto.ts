// AES-256-GCM encryption for BYOK Anthropic keys.
//
// Uses the Node built-in `crypto` module — no external deps. The encryption
// key is derived from AUTH_SECRET via HKDF-HMAC-SHA256 with a per-context
// info string, so different features using the same env-secret end up with
// independent derived keys.
//
// Blob layout: [iv(12) | auth-tag(16) | ciphertext]
//
// Threat model:
//   - DB dump alone is insufficient to decrypt — attacker also needs
//     AUTH_SECRET.
//   - Key material never leaves memory except as the encrypted Bytes column.
//   - AUTH_SECRET rotation requires re-encrypting existing rows; handled
//     manually for v2.0 (no automatic rotation).

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto'

const KEY_LENGTH = 32 // AES-256
const IV_LENGTH = 12 // GCM recommended
const TAG_LENGTH = 16

function deriveKey(context: string): Buffer {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET not configured — crypto unavailable')
  }
  // HKDF-Extract + Expand (single-step, output length = KEY_LENGTH)
  const prk = createHmac('sha256', 'patchparty-byok-v1')
    .update(secret)
    .digest()
  return createHmac('sha256', prk)
    .update(context)
    .digest()
    .subarray(0, KEY_LENGTH)
}

export function encryptKey(plaintext: string): Buffer {
  if (!plaintext) {
    throw new Error('encryptKey: plaintext must be non-empty')
  }
  const key = deriveKey('byok-anthropic')
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct])
}

export function decryptKey(blob: Buffer): string {
  if (blob.length <= IV_LENGTH + TAG_LENGTH) {
    throw new Error('decryptKey: blob too short')
  }
  const key = deriveKey('byok-anthropic')
  const iv = blob.subarray(0, IV_LENGTH)
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ct = blob.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

/**
 * Short fingerprint suitable for display ("this is your key") without
 * revealing the key itself. 32 hex chars of sha256 — collision-safe for
 * per-user uniqueness.
 */
export function fingerprint(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 32)
}
