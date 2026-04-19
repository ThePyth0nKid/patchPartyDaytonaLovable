// T4.3 — parseShipDraft validation contract. The load/save/clear
// wrappers around localStorage are trivial IO; the interesting code is
// here: accepting only payloads that match our ShipDraft shape so a
// tampered or migrated localStorage entry can't crash the Ship sheet.
//
// Run: node --test --experimental-strip-types tests/ship-draft.test.ts

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseShipDraft, shipDraftKey } from '../src/lib/ship-draft.ts'

test('null input returns null (no draft stored)', () => {
  assert.equal(parseShipDraft(null), null)
})

test('malformed JSON returns null (not a crash)', () => {
  assert.equal(parseShipDraft('{not json'), null)
  assert.equal(parseShipDraft(''), null)
  assert.equal(parseShipDraft('undefined'), null)
})

test('non-object JSON (array / primitive / null) returns null', () => {
  assert.equal(parseShipDraft('null'), null)
  assert.equal(parseShipDraft('"just a string"'), null)
  assert.equal(parseShipDraft('42'), null)
  assert.equal(parseShipDraft('[]'), null)
})

test('missing or wrong-type fields return null', () => {
  assert.equal(parseShipDraft(JSON.stringify({ title: 'a', body: 'b' })), null)
  assert.equal(
    parseShipDraft(JSON.stringify({ title: 'a', body: 'b', type: 'chore' })),
    null,
  )
  assert.equal(
    parseShipDraft(JSON.stringify({ title: 1, body: 'b', type: 'feat' })),
    null,
  )
  assert.equal(
    parseShipDraft(JSON.stringify({ title: 'a', body: null, type: 'feat' })),
    null,
  )
})

test('valid feat draft round-trips', () => {
  const draft = { title: 'feat: ship it', body: 'body goes here', type: 'feat' }
  assert.deepEqual(parseShipDraft(JSON.stringify(draft)), draft)
})

test('valid fix draft round-trips', () => {
  const draft = { title: 'fix: nope', body: '', type: 'fix' }
  assert.deepEqual(parseShipDraft(JSON.stringify(draft)), draft)
})

test('extra fields are ignored (forward-compat)', () => {
  // A future version might add a 'personaId' field. The parser must not
  // reject payloads just because they have unfamiliar extras — doing so
  // would make every schema change a breaking change for saved drafts.
  const draft = {
    title: 'x',
    body: 'y',
    type: 'feat',
    personaId: 'someone',
    version: 2,
  }
  assert.deepEqual(parseShipDraft(JSON.stringify(draft)), {
    title: 'x',
    body: 'y',
    type: 'feat',
  })
})

test('storage key is namespaced per party', () => {
  assert.equal(shipDraftKey('abc123'), 'patchparty:ship:abc123')
  assert.equal(shipDraftKey('xyz'), 'patchparty:ship:xyz')
  // Different parties must not collide.
  assert.notEqual(shipDraftKey('party-a'), shipDraftKey('party-b'))
})
