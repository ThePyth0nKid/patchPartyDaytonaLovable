// BYOK (Bring Your Own Key) — Anthropic API key management.
//
// Responsibilities:
//   - Validate a user-supplied key via a 1-token dry-run against Haiku.
//   - Persist the key encrypted-at-rest (AES-256-GCM, AUTH_SECRET-derived).
//   - Decrypt on-demand for agent calls; update lastUsedAt.
//   - Return display-safe fingerprint / presence info without ever exposing
//     the key to the client.

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { decryptKey, encryptKey, fingerprint } from './crypto'
import { log } from './log'

export interface ValidationResult {
  ok: boolean
  fingerprint?: string
  error?: string
}

const KEY_FORMAT = /^sk-ant-[a-zA-Z0-9_-]{20,}$/

/**
 * Verify a candidate key works by making a 1-token request to Haiku.
 * Returns `{ ok: false, error }` with a user-displayable message on failure.
 */
export async function validateAnthropicKey(
  key: string,
): Promise<ValidationResult> {
  if (!KEY_FORMAT.test(key)) {
    return { ok: false, error: 'Key format looks wrong (expected sk-ant-…)' }
  }

  const client = new Anthropic({ apiKey: key })
  try {
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    return { ok: true, fingerprint: fingerprint(key) }
  } catch (error: unknown) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return { ok: false, error: 'Key rejected by Anthropic (401).' }
      }
      if (error.status === 429) {
        return { ok: false, error: 'Rate-limited during validation — try again shortly.' }
      }
      return { ok: false, error: `Anthropic error ${error.status}` }
    }
    log.error('byok.validate unexpected error', { error: String(error) })
    return { ok: false, error: 'Validation failed. Please retry.' }
  }
}

/**
 * Store a validated key encrypted. Caller must have already validated — we
 * validate a second time defensively to avoid persisting a broken key.
 */
export async function saveKey(
  userId: string,
  key: string,
): Promise<ValidationResult> {
  const validation = await validateAnthropicKey(key)
  if (!validation.ok) return validation

  // Prisma types Bytes as Uint8Array<ArrayBuffer>; Node Buffer is compatible
  // at runtime but TS discriminates, so cast via Uint8Array.
  const encrypted = new Uint8Array(encryptKey(key))
  const fp = fingerprint(key)
  const now = new Date()

  await prisma.anthropicKey.upsert({
    where: { userId },
    create: {
      userId,
      encryptedKey: encrypted,
      keyFingerprint: fp,
      validatedAt: now,
    },
    update: {
      encryptedKey: encrypted,
      keyFingerprint: fp,
      validatedAt: now,
      lastUsedAt: null,
    },
  })

  return { ok: true, fingerprint: fp }
}

/** Decrypt and return the user's key, updating lastUsedAt. */
export async function loadKey(userId: string): Promise<string | null> {
  const row = await prisma.anthropicKey.findUnique({ where: { userId } })
  if (!row) return null

  // Fire-and-forget — lastUsedAt is for UI display, not hot-path-critical.
  void prisma.anthropicKey
    .update({ where: { userId }, data: { lastUsedAt: new Date() } })
    .catch((error: unknown) => log.error('byok.loadKey.lastUsedAt failed', { error: String(error) }))

  try {
    return decryptKey(Buffer.from(row.encryptedKey))
  } catch (error: unknown) {
    log.error('byok.loadKey decrypt failed', { userId, error: String(error) })
    return null
  }
}

/** Delete the user's stored key and reset their preferredKeyMode to MANAGED. */
export async function deleteKey(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.anthropicKey.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { preferredKeyMode: 'MANAGED' },
    }),
  ])
}

export interface KeyInfo {
  hasKey: boolean
  fingerprint?: string
  validatedAt?: Date
  lastUsedAt?: Date | null
  preferredKeyMode: 'MANAGED' | 'BYOK'
}

export async function getKeyInfo(userId: string): Promise<KeyInfo> {
  const [row, user] = await Promise.all([
    prisma.anthropicKey.findUnique({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { preferredKeyMode: true },
    }),
  ])
  const preferredKeyMode = user?.preferredKeyMode ?? 'MANAGED'
  if (!row) return { hasKey: false, preferredKeyMode }
  return {
    hasKey: true,
    fingerprint: row.keyFingerprint,
    validatedAt: row.validatedAt,
    lastUsedAt: row.lastUsedAt,
    preferredKeyMode,
  }
}

export async function setPreferredKeyMode(
  userId: string,
  mode: 'MANAGED' | 'BYOK',
): Promise<void> {
  if (mode === 'BYOK') {
    const hasKey = await prisma.anthropicKey.findUnique({ where: { userId } })
    if (!hasKey) {
      throw new Error('Cannot switch to BYOK without a stored key.')
    }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { preferredKeyMode: mode },
  })
}
