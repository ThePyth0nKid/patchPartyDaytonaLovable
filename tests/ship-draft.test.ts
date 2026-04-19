// T4.3 — parseShipDraft validation contract. The load/save/clear
// wrappers around localStorage are trivial IO; the interesting code is
// here: accepting only payloads that match our ShipDraft shape so a
// tampered or migrated localStorage entry can't crash the Ship sheet.
//
// Run: node --test --experimental-strip-types tests/ship-draft.test.ts

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  clearShipDraft,
  loadShipDraft,
  parseShipDraft,
  saveShipDraft,
  shipDraftKey,
} from '../src/lib/ship-draft.ts'
import { SHIP_BODY_MAX_LEN } from '../src/lib/ship-body.ts'

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

test('oversized title (> 200 chars) is rejected', () => {
  // Tampered localStorage entry would otherwise load into state and
  // sit there unfixable — the input's maxLength only throttles new
  // keystrokes, not programmatically set values.
  const big = {
    title: 'a'.repeat(201),
    body: 'ok',
    type: 'feat',
  }
  assert.equal(parseShipDraft(JSON.stringify(big)), null)
})

test('title exactly at cap (200) is accepted', () => {
  const ok = {
    title: 'a'.repeat(200),
    body: 'ok',
    type: 'feat',
  }
  const parsed = parseShipDraft(JSON.stringify(ok))
  assert.ok(parsed)
  assert.equal(parsed.title.length, 200)
})

test('oversized body (> SHIP_BODY_MAX_LEN) is rejected', () => {
  const big = {
    title: 'ok',
    body: 'b'.repeat(SHIP_BODY_MAX_LEN + 1),
    type: 'feat',
  }
  assert.equal(parseShipDraft(JSON.stringify(big)), null)
})

test('body exactly at cap is accepted', () => {
  const ok = {
    title: 'ok',
    body: 'b'.repeat(SHIP_BODY_MAX_LEN),
    type: 'feat',
  }
  const parsed = parseShipDraft(JSON.stringify(ok))
  assert.ok(parsed)
  assert.equal(parsed.body.length, SHIP_BODY_MAX_LEN)
})

/** Minimal in-memory Storage shim used to exercise loadShipDraft /
 *  saveShipDraft / clearShipDraft without a DOM. Installed on
 *  globalThis.window.localStorage for the duration of each round-trip
 *  test. */
function makeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size
    },
    clear: () => map.clear(),
  } as Storage
}

function withFakeWindow<T>(storage: Storage, fn: () => T): T {
  const g = globalThis as unknown as { window?: { localStorage: Storage } }
  const prev = g.window
  g.window = { localStorage: storage }
  try {
    return fn()
  } finally {
    if (prev === undefined) delete g.window
    else g.window = prev
  }
}

test('save → load round-trips through fake localStorage', () => {
  const storage = makeStorage()
  withFakeWindow(storage, () => {
    saveShipDraft('party-1', {
      title: 'feat: do the thing',
      body: 'body body body',
      type: 'feat',
    })
    const loaded = loadShipDraft('party-1')
    assert.deepEqual(loaded, {
      title: 'feat: do the thing',
      body: 'body body body',
      type: 'feat',
    })
  })
})

test('load without a window (SSR) returns null', () => {
  // No fake window installed — this simulates server-side render.
  const g = globalThis as unknown as { window?: unknown }
  assert.equal(g.window, undefined)
  assert.equal(loadShipDraft('anything'), null)
})

test('clear removes the party-scoped entry and leaves siblings', () => {
  const storage = makeStorage()
  withFakeWindow(storage, () => {
    saveShipDraft('party-keep', { title: 'k', body: 'k', type: 'feat' })
    saveShipDraft('party-drop', { title: 'd', body: 'd', type: 'fix' })
    clearShipDraft('party-drop')
    assert.equal(loadShipDraft('party-drop'), null)
    assert.deepEqual(loadShipDraft('party-keep'), {
      title: 'k',
      body: 'k',
      type: 'feat',
    })
  })
})

test('saveShipDraft swallows quota errors without throwing', () => {
  // Simulate privacy mode / full storage: setItem throws. We want a
  // silent no-op, never a thrown error that would break the caller's
  // keystroke handler.
  const throwing: Storage = {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('QuotaExceededError')
    },
    removeItem: () => {},
    key: () => null,
    length: 0,
    clear: () => {},
  }
  withFakeWindow(throwing, () => {
    assert.doesNotThrow(() => {
      saveShipDraft('party-x', { title: 't', body: 'b', type: 'feat' })
    })
  })
})
