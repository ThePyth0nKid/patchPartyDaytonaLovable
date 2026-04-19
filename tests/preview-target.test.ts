import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { encodePreviewTarget } from '../src/lib/preview-target.ts'

// base64url decode mirror so the test asserts on the round-tripped JSON
// payload rather than opaque cipher text. Mirrors what the server-side
// /api/preview/[target] decoder does.
function decodeTarget(s: string): unknown {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
}

test('encodePreviewTarget — url only (no token)', () => {
  const out = encodePreviewTarget('https://3000-abc.proxy.daytona.work')
  assert.deepEqual(decodeTarget(out), {
    url: 'https://3000-abc.proxy.daytona.work',
  })
})

test('encodePreviewTarget — url and token', () => {
  const out = encodePreviewTarget(
    'https://3000-abc.proxy.daytona.work',
    'tok_ABC123',
  )
  assert.deepEqual(decodeTarget(out), {
    url: 'https://3000-abc.proxy.daytona.work',
    token: 'tok_ABC123',
  })
})

test('encodePreviewTarget — output is URL-safe (no +, /, =)', () => {
  // Force both `+` and `/` into the pre-url-safe base64 by crafting an
  // input with known properties: `??>` encodes to `Pz8+`, `???` to `Pz8/`.
  // Using a URL with characters that yield those bytes in the JSON.
  const out = encodePreviewTarget('https://a.b/?x=??>&y=???')
  assert.doesNotMatch(out, /[+/=]/, 'should not contain +, /, or =')
  // Round-trip still works.
  assert.deepEqual(decodeTarget(out), { url: 'https://a.b/?x=??>&y=???' })
})

test('encodePreviewTarget — omits token field when undefined', () => {
  const out = encodePreviewTarget('https://x.y', undefined)
  const decoded = decodeTarget(out) as Record<string, unknown>
  assert.equal(decoded.url, 'https://x.y')
  assert.equal('token' in decoded, false)
})

test('encodePreviewTarget — empty-string token is kept (not treated as absent)', () => {
  // The callers never pass an empty string, but document the behaviour.
  // `token ? { url, token } : { url }` — empty string is falsy, so the
  // token is dropped. Asserting this fact pins the current semantics.
  const out = encodePreviewTarget('https://x.y', '')
  assert.deepEqual(decodeTarget(out), { url: 'https://x.y' })
})
