// Unit tests for checkSandboxPath / safeSandboxPath.
// Run: node --test --experimental-strip-types tests/safe-path.test.ts
//
// Covers T2.3 acceptance: reject .env*, .pem/.key, id_rsa etc whether they
// appear as bare basenames or nested in the repo-relative path. Also
// re-tests the escape-prevention logic that was previously inline in
// chat.ts's `safeSandboxPath`.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkSandboxPath, safeSandboxPath } from '../src/lib/safe-path.ts'

const ROOT = '/home/daytona/repo'

// ---------- SAFE paths ----------

test('accepts a normal source file', () => {
  const r = checkSandboxPath(ROOT, 'src/app/page.tsx')
  assert.equal(r.ok, true)
  assert.equal(r.resolved, '/home/daytona/repo/src/app/page.tsx')
})

test('accepts an env template (whitelisted exception)', () => {
  // .env.example and .env.sample are conventional public templates — we
  // must not block them or legitimate onboarding breaks.
  assert.equal(checkSandboxPath(ROOT, '.env.example').ok, true)
  assert.equal(checkSandboxPath(ROOT, '.env.sample').ok, true)
  assert.equal(checkSandboxPath(ROOT, 'apps/web/.env.example').ok, true)
})

test('accepts a file whose name merely *contains* a secret-ish substring', () => {
  // "keys.ts" is not a private-key file; it must be allowed.
  assert.equal(checkSandboxPath(ROOT, 'src/lib/keys.ts').ok, true)
  // "passwords.md" in a docs folder — also not a credentials file.
  assert.equal(checkSandboxPath(ROOT, 'docs/passwords.md').ok, true)
})

test('accepts a path that traverses and then lands back inside the repo', () => {
  // Reading `src/../README.md` is fine; normalization leaves us inside root.
  const r = checkSandboxPath(ROOT, 'src/../README.md')
  assert.equal(r.ok, true)
  assert.equal(r.resolved, '/home/daytona/repo/README.md')
})

// ---------- ESCAPE rejections ----------

test('rejects absolute paths', () => {
  assert.deepEqual(checkSandboxPath(ROOT, '/etc/passwd'), {
    ok: false,
    reason: 'escape',
  })
})

test('rejects parent-directory escape', () => {
  assert.deepEqual(checkSandboxPath(ROOT, '../../../etc/shadow'), {
    ok: false,
    reason: 'escape',
  })
})

test('rejects null-byte paths', () => {
  assert.deepEqual(checkSandboxPath(ROOT, 'src/\0passwd'), {
    ok: false,
    reason: 'invalid',
  })
})

test('rejects empty and non-string paths', () => {
  assert.deepEqual(checkSandboxPath(ROOT, ''), {
    ok: false,
    reason: 'invalid',
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert.deepEqual(checkSandboxPath(ROOT, null as any), {
    ok: false,
    reason: 'invalid',
  })
})

// ---------- SECRET rejections ----------

test('rejects .env at the repo root', () => {
  assert.deepEqual(checkSandboxPath(ROOT, '.env'), {
    ok: false,
    reason: 'secret',
  })
})

test('rejects .env variants (.env.local, .env.production, etc.)', () => {
  for (const p of ['.env.local', '.env.production', '.env.prod', '.env.staging']) {
    const r = checkSandboxPath(ROOT, p)
    assert.equal(r.ok, false, `expected ${p} to be rejected`)
    assert.equal(r.reason, 'secret', `expected reason 'secret' for ${p}`)
  }
})

test('rejects .env nested in a subdirectory', () => {
  const r = checkSandboxPath(ROOT, 'apps/web/.env')
  assert.deepEqual(r, { ok: false, reason: 'secret' })
})

test('rejects private-key extensions (.pem, .key, .p12, .pfx, .jks)', () => {
  for (const p of [
    'config/server.pem',
    'certs/tls.key',
    'deploy/keystore.p12',
    'wat/cert.pfx',
    'android/release.jks',
  ]) {
    const r = checkSandboxPath(ROOT, p)
    assert.equal(r.ok, false, `expected ${p} to be rejected`)
    assert.equal(r.reason, 'secret')
  }
})

test('rejects SSH private keys with or without .pub mirror', () => {
  for (const p of [
    'id_rsa',
    'id_rsa.pub',
    'id_ed25519',
    'id_ed25519.pub',
    'id_ecdsa',
    'id_dsa',
    '.ssh/id_rsa',
  ]) {
    const r = checkSandboxPath(ROOT, p)
    assert.equal(r.ok, false, `expected ${p} to be rejected`)
    assert.equal(r.reason, 'secret')
  }
})

test('rejects AWS credentials and .netrc', () => {
  assert.equal(checkSandboxPath(ROOT, '.aws/credentials').ok, false)
  assert.equal(checkSandboxPath(ROOT, '.aws/credentials').reason, 'secret')
  assert.equal(checkSandboxPath(ROOT, '.netrc').ok, false)
  assert.equal(checkSandboxPath(ROOT, '.netrc').reason, 'secret')
})

// ---------- safeSandboxPath thin-wrapper shape ----------

test('safeSandboxPath returns resolved path on accept, null on reject', () => {
  assert.equal(
    safeSandboxPath(ROOT, 'src/app/page.tsx'),
    '/home/daytona/repo/src/app/page.tsx',
  )
  assert.equal(safeSandboxPath(ROOT, '.env'), null)
  assert.equal(safeSandboxPath(ROOT, '../../etc/passwd'), null)
})
