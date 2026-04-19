// AES-256-GCM encryption for BYOK Anthropic keys.
//
// Uses the Node built-in `crypto` module — no external deps. The encryption
// key is derived via standard HKDF-SHA256 (RFC 5869) from BYOK_ENCRYPTION_KEY,
// a dedicated env var that is never rotated by NextAuth. This separation
// matters: AUTH_SECRET rotation must not silently destroy stored API keys.
//
// Blob layout: [iv(12) | auth-tag(16) | ciphertext]
//
// Threat model:
//   - DB dump alone is insufficient to decrypt — attacker also needs
//     BYOK_ENCRYPTION_KEY.
//   - Key material never leaves memory except as the encrypted Bytes column.
//   - Rotating BYOK_ENCRYPTION_KEY requires re-encrypting existing rows;
//     no automatic rotation in v2.0.
//   - Legacy fallback: if BYOK_ENCRYPTION_KEY is missing, decryption tries
//     AUTH_SECRET so any keys written by the very first build still load.
//     New writes always use BYOK_ENCRYPTION_KEY (encryptKey throws otherwise).

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from 'node:crypto'

const KEY_LENGTH = 32 // AES-256
const IV_LENGTH = 12 // GCM recommended
const TAG_LENGTH = 16
const HKDF_SALT = 'patchparty-byok-v1'
const HKDF_INFO = 'byok-anthropic'

function getEncryptionSecret(): string | null {
  const dedicated = process.env.BYOK_ENCRYPTION_KEY
  if (dedicated && dedicated.length >= 32) return dedicated
  return null
}

function deriveKey(secret: string): Buffer {
  // RFC 5869 HKDF-SHA256, 32-byte output.
  return Buffer.from(
    hkdfSync('sha256', secret, HKDF_SALT, HKDF_INFO, KEY_LENGTH),
  )
}

export function encryptKey(plaintext: string): Buffer {
  if (!plaintext) {
    throw new Error('encryptKey: plaintext must be non-empty')
  }
  const secret = getEncryptionSecret()
  if (!secret) {
    throw new Error(
      'BYOK_ENCRYPTION_KEY not configured (must be ≥32 chars). ' +
        'Generate with `openssl rand -hex 32` and set in Railway env.',
    )
  }
  const key = deriveKey(secret)
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
  const iv = blob.subarray(0, IV_LENGTH)
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ct = blob.subarray(IV_LENGTH + TAG_LENGTH)

  // Try dedicated key first, then AUTH_SECRET legacy fallback.
  const candidates: string[] = []
  const dedicated = getEncryptionSecret()
  if (dedicated) candidates.push(dedicated)
  const legacy = process.env.AUTH_SECRET
  if (legacy && legacy.length >= 32) candidates.push(legacy)
  if (candidates.length === 0) {
    throw new Error('decryptKey: no encryption secret configured')
  }

  let lastError: unknown
  for (const secret of candidates) {
    try {
      const key = deriveKey(secret)
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
        'utf8',
      )
    } catch (error: unknown) {
      lastError = error
    }
  }
  throw lastError ?? new Error('decryptKey: auth tag verification failed')
}

/**
 * Short fingerprint suitable for display ("this is your key") without
 * revealing the key itself. 32 hex chars of sha256 — collision-safe for
 * per-user uniqueness.
 */
export function fingerprint(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 32)
}
