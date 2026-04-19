# 02 — BYOK (Bring Your Own Key)

## Why

COGS at list-price: $3.50–$5.50 per 5-persona race. At 100 free parties/day that's $500/day burn. BYOK lets power-users pay Anthropic directly, removing the COGS-cap on viral growth.

Also: feature-completeness parity with Cursor/Claude-Code (both accept BYOK).

## Threat Model

- **Key exfiltration via server logs**: regex-redact `sk-ant-...` in `log.ts` + never write key to stdout.
- **Key exfiltration via SQL dump**: AES-GCM encryption at rest; DB-dump alone is insufficient to decrypt without `AUTH_SECRET`.
- **Key exfiltration via client response**: API routes return only `keyFingerprint` (first 32 chars SHA256), never the key itself.
- **Key misuse by malicious sandbox**: key never touches sandbox (Anthropic calls happen server-side only).
- **Dev-laptop compromise via `.env`**: `AUTH_SECRET` is the crypto-root; treat as production-secret. Dev-only keys are throwaway.

## Crypto (`src/lib/crypto.ts`)

Use node's `crypto` (built-in), no external deps.

```ts
import { createHmac, createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

const KEY_LENGTH = 32 // AES-256
const IV_LENGTH = 12  // GCM standard
const TAG_LENGTH = 16

function deriveKey(context: string): Buffer {
  // HKDF via HMAC-SHA256
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET not configured')
  const prk = createHmac('sha256', 'patchparty-byok-v1').update(secret).digest()
  return createHmac('sha256', prk).update(context).digest().subarray(0, KEY_LENGTH)
}

export function encryptKey(plaintext: string): Buffer {
  const key = deriveKey('byok-anthropic')
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Layout: [iv(12) | tag(16) | ciphertext]
  return Buffer.concat([iv, tag, ct])
}

export function decryptKey(blob: Buffer): string {
  const key = deriveKey('byok-anthropic')
  const iv = blob.subarray(0, IV_LENGTH)
  const tag = blob.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ct = blob.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

export function fingerprint(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 32)
}
```

## Validation (`src/lib/byok.ts`)

```ts
import Anthropic from '@anthropic-ai/sdk'

export async function validateAnthropicKey(key: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^sk-ant-[a-zA-Z0-9_-]{20,}$/.test(key)) {
    return { ok: false, error: 'Key format looks wrong (expected sk-ant-...)' }
  }
  const client = new Anthropic({ apiKey: key })
  try {
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    })
    return { ok: true }
  } catch (e) {
    if (e instanceof Anthropic.APIError && e.status === 401) {
      return { ok: false, error: 'Key rejected by Anthropic (401).' }
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function loadKey(userId: string): Promise<string | null> {
  const row = await prisma.anthropicKey.findUnique({ where: { userId } })
  if (!row) return null
  await prisma.anthropicKey.update({
    where: { userId },
    data: { lastUsedAt: new Date() },
  })
  return decryptKey(row.encryptedKey)
}
```

## Schema

```prisma
model AnthropicKey {
  id             String    @id @default(cuid())
  userId         String    @unique
  encryptedKey   Bytes
  keyFingerprint String
  validatedAt    DateTime
  lastUsedAt     DateTime?
  createdAt      DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// on User:
preferredKeyMode KeyMode @default(MANAGED)

enum KeyMode { MANAGED BYOK }
```

## API Routes

- `POST /api/byok/validate` — body `{ key }`, runs 1-token dry-run. Returns `{ ok, fingerprint }` or `{ ok: false, error }`.
- `POST /api/byok` — body `{ key }` — validates (re-calls validateAnthropicKey), encrypts, upserts. Returns `{ fingerprint, validatedAt }`.
- `GET /api/byok` — returns `{ hasKey, fingerprint, lastUsedAt, validatedAt }` or `{ hasKey: false }`.
- `DELETE /api/byok` — deletes row, resets `User.preferredKeyMode` to MANAGED.

Auth: all routes require session. Rate-limit: 5 validations/min/user (prevent brute-force).

## UI (`/app/settings`)

- Section "Anthropic API Key"
- If no key: input + "Add & validate" button. Shows spinner during validation. On success: fingerprint + "Remove" button.
- If key: fingerprint (e.g., `sk-ant-••••xxxx1234`), "Validated 2 days ago", "Last used 5 min ago", "Replace key" + "Remove key" buttons.
- Toggle: "Use my key for all parties" (sets `preferredKeyMode`). Only enabled if key exists.

## Integration in `src/lib/agent.ts`

```ts
import { loadKey } from '@/lib/byok'

async function getAnthropicClient(userId: string): Promise<Anthropic> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.preferredKeyMode === 'BYOK') {
    const key = await loadKey(userId)
    if (key) return new Anthropic({ apiKey: key })
    // Fallback to managed if BYOK configured but key disappeared
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}
```

BYOK-mode parties skip `checkAndReserveUsage` (no rate-limit). Still logged in `PartyEvent` with `byok.key_used` event for support traceability.

## Log-Redaction (`src/lib/log.ts`)

```ts
const KEY_PATTERN = /sk-ant-[a-zA-Z0-9_-]+/g
function redact(s: string): string {
  return s.replace(KEY_PATTERN, 'sk-ant-[REDACTED]')
}
// All log.info/warn/error wrap arguments through redact()
```

## Acceptance

1. User pastes valid key → validation succeeds in <2s → row persisted with encrypted blob.
2. Dump `SELECT encrypted_key FROM anthropic_key` → blob is binary, not readable.
3. Party starts with BYOK mode → `UsageCounter.partiesToday` does NOT increment.
4. `grep -r "sk-ant-" logs/` returns 0 matches (only `[REDACTED]`).
5. Replace key → old row gone, new row, new fingerprint.
