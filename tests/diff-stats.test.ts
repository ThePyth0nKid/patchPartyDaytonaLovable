// Unit tests for parseDiffStats — runnable via Node 22+ built-in test runner:
//   node --test --experimental-strip-types tests/diff-stats.test.ts
//
// The parser lives in src/lib/diff-stats.ts and is intentionally isolated
// from the Daytona/Anthropic runtime so these tests never touch the network.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDiffStats } from '../src/lib/diff-stats.ts'

test('parses an added file (status A, numstat with added lines only)', () => {
  const numstat = '12\t0\tsrc/app/new-feature.ts\n'
  const namestatus = 'A\tsrc/app/new-feature.ts\n'
  const result = parseDiffStats(numstat, namestatus)
  assert.deepEqual(result, [
    { path: 'src/app/new-feature.ts', added: 12, removed: 0, status: 'A' },
  ])
})

test('parses a modified file (status M, mixed added/removed)', () => {
  const numstat = '4\t1\tsrc/components/Header.tsx\n'
  const namestatus = 'M\tsrc/components/Header.tsx\n'
  const result = parseDiffStats(numstat, namestatus)
  assert.deepEqual(result, [
    { path: 'src/components/Header.tsx', added: 4, removed: 1, status: 'M' },
  ])
})

test('parses a deleted file (status D, all lines removed)', () => {
  const numstat = '0\t27\tsrc/legacy/old-util.ts\n'
  const namestatus = 'D\tsrc/legacy/old-util.ts\n'
  const result = parseDiffStats(numstat, namestatus)
  assert.deepEqual(result, [
    { path: 'src/legacy/old-util.ts', added: 0, removed: 27, status: 'D' },
  ])
})

test('handles a multi-file commit preserving order', () => {
  const numstat = [
    '12\t0\tsrc/app/new.ts',
    '4\t1\tsrc/components/Header.tsx',
    '0\t27\tsrc/legacy/old.ts',
    '',
  ].join('\n')
  const namestatus = [
    'A\tsrc/app/new.ts',
    'M\tsrc/components/Header.tsx',
    'D\tsrc/legacy/old.ts',
    '',
  ].join('\n')
  const result = parseDiffStats(numstat, namestatus)
  assert.equal(result.length, 3)
  assert.equal(result[0].status, 'A')
  assert.equal(result[1].status, 'M')
  assert.equal(result[2].status, 'D')
})

test('coerces binary `-` markers to 0 and defaults status to M when missing', () => {
  // numstat reports `-\t-\tpath` for binary files; if name-status is missing
  // for some reason, default to M so the UI has a renderable status.
  const numstat = '-\t-\tpublic/logo.png\n'
  const namestatus = ''
  const result = parseDiffStats(numstat, namestatus)
  assert.deepEqual(result, [
    { path: 'public/logo.png', added: 0, removed: 0, status: 'M' },
  ])
})

test('skips malformed lines without throwing', () => {
  const numstat = 'garbage\n\n12\t3\tsrc/ok.ts\nalso garbage'
  const namestatus = 'junk\nM\tsrc/ok.ts\n'
  const result = parseDiffStats(numstat, namestatus)
  assert.deepEqual(result, [
    { path: 'src/ok.ts', added: 12, removed: 3, status: 'M' },
  ])
})

test('returns empty array for empty input', () => {
  assert.deepEqual(parseDiffStats('', ''), [])
})
