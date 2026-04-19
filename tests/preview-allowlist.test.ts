// Unit tests for the preview-proxy SSRF allowlist.
// Run: node --test --experimental-strip-types tests/preview-allowlist.test.ts
//
// The allowlist guards /api/preview/[target]/[[...path]]. A mis-scoped
// suffix = 1-hop SSRF for every authenticated user. Coverage here is the
// non-negotiable regression fence for that route.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isAllowedPreviewUrl,
  parseSuffixes,
} from '../src/lib/preview-allowlist.ts'

// ---------- parseSuffixes ----------

test('parseSuffixes: undefined → default list (includes daytonaproxy01.net)', () => {
  const s = parseSuffixes(undefined)
  assert.ok(s.includes('.daytonaproxy01.net'), 'must include prod suffix')
  assert.ok(s.includes('.daytona.work'))
  assert.ok(s.includes('.daytona.app'))
  assert.ok(s.includes('.daytona.io'))
})

test('parseSuffixes: empty string → defaults', () => {
  const s = parseSuffixes('')
  assert.ok(s.includes('.daytonaproxy01.net'))
})

test('parseSuffixes: env override wins over defaults', () => {
  const s = parseSuffixes('.example.com,.foo.dev')
  assert.deepEqual(s, ['.example.com', '.foo.dev'])
})

test('parseSuffixes: lowercases + trims + drops empties', () => {
  const s = parseSuffixes(' .EXAMPLE.COM , ,.foo.DEV ')
  assert.deepEqual(s, ['.example.com', '.foo.dev'])
})

// ---------- isAllowedPreviewUrl — allowed hosts ----------

test('allows current Daytona proxy (.daytonaproxy01.net)', () => {
  const url =
    'https://3000-f22b8308-be48-4781-97c4-ac4b20d63412.daytonaproxy01.net'
  assert.equal(isAllowedPreviewUrl(url), true)
})

test('allows legacy Daytona proxy (.daytona.work)', () => {
  assert.equal(
    isAllowedPreviewUrl('https://3000-abc.proxy.daytona.work/'),
    true,
  )
})

test('allows .daytona.app and .daytona.io', () => {
  assert.equal(isAllowedPreviewUrl('https://x.daytona.app/'), true)
  assert.equal(isAllowedPreviewUrl('https://x.daytona.io/'), true)
})

test('hostname match is case-insensitive', () => {
  assert.equal(
    isAllowedPreviewUrl('https://FOO.DAYTONAPROXY01.NET/path'),
    true,
  )
})

// ---------- isAllowedPreviewUrl — rejected hosts (SSRF surface) ----------

test('rejects cloud metadata IP (SSRF primary target)', () => {
  assert.equal(isAllowedPreviewUrl('https://169.254.169.254/'), false)
  assert.equal(isAllowedPreviewUrl('http://169.254.169.254/'), false)
})

test('rejects loopback', () => {
  assert.equal(isAllowedPreviewUrl('https://127.0.0.1/'), false)
  assert.equal(isAllowedPreviewUrl('https://localhost/'), false)
})

test('rejects internal-looking Railway hostnames', () => {
  assert.equal(
    isAllowedPreviewUrl('https://patchparty.railway.internal/'),
    false,
  )
})

test('rejects http:// even if hostname matches', () => {
  assert.equal(
    isAllowedPreviewUrl('http://3000-abc.daytonaproxy01.net/'),
    false,
  )
})

test('rejects non-http(s) schemes', () => {
  assert.equal(isAllowedPreviewUrl('file:///etc/passwd'), false)
  assert.equal(isAllowedPreviewUrl('ftp://x.daytonaproxy01.net/'), false)
  assert.equal(isAllowedPreviewUrl('javascript:alert(1)'), false)
})

test('rejects suffix-spoofing attempts', () => {
  // Attacker-controlled domain that ends with the literal string of a
  // suffix but is NOT actually a Daytona subdomain. `endsWith` with the
  // leading dot guarantees a boundary, so `evil.daytonaproxy01.net.attacker.com`
  // does not match.
  assert.equal(
    isAllowedPreviewUrl('https://daytonaproxy01.net.attacker.com/'),
    false,
  )
})

test('rejects bare suffix without subdomain (leading-dot match)', () => {
  // The suffix starts with `.` so the bare apex must fail. The allowlist
  // is for previews, which are always subdomains.
  assert.equal(isAllowedPreviewUrl('https://daytonaproxy01.net/'), false)
})

test('rejects garbage strings', () => {
  assert.equal(isAllowedPreviewUrl(''), false)
  assert.equal(isAllowedPreviewUrl('not-a-url'), false)
  assert.equal(isAllowedPreviewUrl('https://'), false)
})

// ---------- override path ----------

test('respects a narrower env override (no defaults leak through)', () => {
  const only = ['.my-daytona.internal']
  assert.equal(
    isAllowedPreviewUrl('https://x.my-daytona.internal/', only),
    true,
  )
  assert.equal(
    isAllowedPreviewUrl('https://x.daytonaproxy01.net/', only),
    false,
  )
})
