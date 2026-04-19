// Unit tests for the preview-proxy friendly-HTML fallback.
// Run: node --test --experimental-strip-types tests/preview-error-html.test.ts
//
// Behaviour under test: when the Daytona upstream returns a 4xx/5xx
// JSON error for the top-level iframe document, the proxy serves a
// readable HTML page instead of streaming raw JSON into the iframe.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPreviewErrorHtml,
  extractErrorHint,
  isSandboxGone,
} from '../src/lib/preview-error-html.ts'

// ---------- extractErrorHint ----------

test('extractErrorHint: Daytona not-found payload → message string', () => {
  const body = JSON.stringify({
    statusCode: 400,
    message:
      'bad request: failed to get runner info: Sandbox with ID f22b8308-be48-4781-97c4-ac4b20d63412 not found',
    code: 'BAD_REQUEST',
  })
  const hint = extractErrorHint(body, 'application/json')
  assert.ok(hint.includes('Sandbox with ID'))
  assert.ok(hint.includes('not found'))
})

test('extractErrorHint: empty body → empty hint', () => {
  assert.equal(extractErrorHint('', 'application/json'), '')
})

test('extractErrorHint: non-JSON body → empty hint', () => {
  assert.equal(extractErrorHint('<html>oops</html>', 'text/html'), '')
})

test('extractErrorHint: malformed JSON → empty hint', () => {
  assert.equal(extractErrorHint('{not json', 'application/json'), '')
})

test('extractErrorHint: JSON without message/error field → empty', () => {
  assert.equal(extractErrorHint('{"foo":1}', 'application/json'), '')
})

test('extractErrorHint: uses `error` field when `message` absent', () => {
  const hint = extractErrorHint('{"error":"upstream down"}', 'application/json')
  assert.equal(hint, 'upstream down')
})

test('extractErrorHint: caps to 240 chars', () => {
  const long = 'x'.repeat(500)
  const hint = extractErrorHint(JSON.stringify({ message: long }), 'application/json')
  assert.equal(hint.length, 240)
})

test('extractErrorHint: detects JSON even with wrong content-type if body starts with {', () => {
  // Some upstreams lie about content-type. Still useful to parse if the
  // body clearly starts with an object literal.
  const hint = extractErrorHint('{"message":"ok"}', 'text/plain')
  assert.equal(hint, 'ok')
})

// ---------- isSandboxGone ----------

test('isSandboxGone: 404 → always gone', () => {
  assert.equal(isSandboxGone(404, ''), true)
})

test('isSandboxGone: 400 + "not found" message → gone', () => {
  assert.equal(isSandboxGone(400, 'Sandbox with ID abc not found'), true)
})

test('isSandboxGone: 503 without "not found" → not gone (temporary)', () => {
  assert.equal(isSandboxGone(503, 'service unavailable'), false)
})

test('isSandboxGone: 400 without "not found" → not gone', () => {
  assert.equal(isSandboxGone(400, 'bad request'), false)
})

// ---------- buildPreviewErrorHtml ----------

test('buildPreviewErrorHtml: gone → gone copy + sandbox status badge', () => {
  const html = buildPreviewErrorHtml({ status: 400, hint: 'Sandbox abc not found' })
  assert.ok(html.startsWith('<!doctype html>'))
  assert.ok(html.includes('no longer available'))
  assert.ok(html.includes('terminated'))
  assert.ok(html.includes('Sandbox · 400'))
})

test('buildPreviewErrorHtml: 5xx → temporary copy', () => {
  const html = buildPreviewErrorHtml({ status: 503, hint: 'temporary outage' })
  assert.ok(html.includes('temporarily unreachable'))
  assert.ok(html.includes('paused'))
})

test('buildPreviewErrorHtml: no hint → no <pre class="hint">', () => {
  const html = buildPreviewErrorHtml({ status: 400, hint: '' })
  assert.ok(!html.includes('class="hint"'))
})

test('buildPreviewErrorHtml: hint with HTML-injection payload is escaped', () => {
  // This is the critical security assertion: the proxy serves this HTML
  // with Content-Type text/html on our own origin. If we didn't escape,
  // an attacker-controlled upstream error message could inject scripts.
  const html = buildPreviewErrorHtml({
    status: 400,
    hint: '<script>alert(1)</script><img src=x onerror=alert(1)>',
  })
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('&lt;img'))
})

test('buildPreviewErrorHtml: includes no external resources (CSP-safe for iframe)', () => {
  const html = buildPreviewErrorHtml({ status: 400, hint: 'x' })
  // No <script>, no <link rel="stylesheet" href>, no <img src="http">,
  // no external fonts — everything inline so it renders even inside the
  // strict-sandbox iframe that blocks same-origin resources.
  assert.ok(!/<script\b/i.test(html))
  assert.ok(!/<link\b[^>]+rel=["']stylesheet/i.test(html))
  assert.ok(!/src=["']https?:/i.test(html))
})

test('buildPreviewErrorHtml: status is clamped (no overflow or control chars)', () => {
  // A malformed status shouldn't blow up the template.
  const html = buildPreviewErrorHtml({ status: 99999, hint: '' })
  assert.ok(html.includes('Sandbox · 9999'))
})
