// T4.2 — formatCostUsd rendering for the cumulative cost meter.
//
// Run: node --test --experimental-strip-types tests/format-cost.test.ts

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatCostUsd } from '../src/lib/format-cost.ts'

test('null / undefined / NaN / negative all read as $0.00', () => {
  assert.equal(formatCostUsd(null), '$0.00')
  assert.equal(formatCostUsd(undefined), '$0.00')
  assert.equal(formatCostUsd(NaN), '$0.00')
  assert.equal(formatCostUsd(-1), '$0.00')
  assert.equal(formatCostUsd(0), '$0.00')
})

test('sub-cent values render with 4 decimals so the meter never looks stuck', () => {
  assert.equal(formatCostUsd(0.0023), '$0.0023')
  assert.equal(formatCostUsd(0.0001), '$0.0001')
  assert.equal(formatCostUsd(0.0099), '$0.0099')
})

test('1¢ to 9.99¢ render with 3 decimals', () => {
  assert.equal(formatCostUsd(0.01), '$0.010')
  assert.equal(formatCostUsd(0.053), '$0.053')
  assert.equal(formatCostUsd(0.099), '$0.099')
})

test('≥10¢ renders with 2 decimals (standard dollar format)', () => {
  assert.equal(formatCostUsd(0.1), '$0.10')
  assert.equal(formatCostUsd(0.42), '$0.42')
  assert.equal(formatCostUsd(1.2345), '$1.23')
  assert.equal(formatCostUsd(42), '$42.00')
})

test('runaway / malformed values clamp to >$999,999', () => {
  assert.equal(formatCostUsd(1_000_000), '>$999,999')
  assert.equal(formatCostUsd(1e15), '>$999,999')
  // Infinity is already blocked by the !isFinite check, but verify.
  assert.equal(formatCostUsd(Infinity), '$0.00')
})

test('extremely small positive values render as $0.0000 (accepted rounding)', () => {
  // 1e-10 × toFixed(4) = "0.0000". Acceptable: sub-$0.00005 is effectively
  // zero for the meter, so the user sees $0.0000 until the running sum
  // hits measurable territory.
  assert.equal(formatCostUsd(1e-10), '$0.0000')
})
