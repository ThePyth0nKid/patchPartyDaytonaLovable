// T4.1 — countChargeableTurns: the pure counter that enforces the 20-turn
// cap on the server (src/lib/chat.ts reserveTurnSlot) AND drives the "N/20"
// display in the client (src/app/party/[id]/turn-column.tsx). Both sides
// import the same helper from src/lib/chat-constants.ts so the number the
// user sees matches the number the server enforces.
//
// What "chargeable" means:
//   - applied or pending turns count
//   - failed or undone turns do NOT count
//   - synthetic revert turns (turnIndex referenced by another row's
//     revertedByTurnIndex) do NOT count — they cancel themselves out
//
// Run: node --test --experimental-strip-types tests/chargeable-turns.test.ts

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countChargeableTurns } from '../src/lib/chat-constants.ts'

test('empty party: 0 chargeable', () => {
  assert.equal(countChargeableTurns([]), 0)
})

test('happy path: 5 applied turns → 5 chargeable', () => {
  const rows = [0, 1, 2, 3, 4].map((i) => ({
    turnIndex: i,
    status: 'applied',
    revertedByTurnIndex: null,
  }))
  assert.equal(countChargeableTurns(rows), 5)
})

test('one pending counts', () => {
  const rows = [
    { turnIndex: 0, status: 'applied', revertedByTurnIndex: null },
    { turnIndex: 1, status: 'pending', revertedByTurnIndex: null },
  ]
  assert.equal(countChargeableTurns(rows), 2)
})

test('failed turns are free (T4.1 — was 1 before, 0 now)', () => {
  const rows = [
    { turnIndex: 0, status: 'failed', revertedByTurnIndex: null },
    { turnIndex: 1, status: 'failed', revertedByTurnIndex: null },
  ]
  assert.equal(countChargeableTurns(rows), 0)
})

test('undone turns are free', () => {
  const rows = [
    { turnIndex: 0, status: 'undone', revertedByTurnIndex: 1 },
    { turnIndex: 1, status: 'applied', revertedByTurnIndex: null }, // synthetic revert
  ]
  // turn 0 is undone (not counted). turn 1 is a synthetic revert (its
  // turnIndex = 1 is what turn 0's revertedByTurnIndex points at), also
  // not counted. Net: 0.
  assert.equal(countChargeableTurns(rows), 0)
})

test('undo+synthetic pair is net-zero even when the party is near the cap', () => {
  // 18 real applied turns (indices 0..17), then turn 18 is undone, then
  // turn 19 is the synthetic revert. Chargeable should be 17 — NOT 19 (as
  // the pre-T4.1 total count would have been) and NOT 20 (cap).
  const real = Array.from({ length: 18 }, (_, i) => ({
    turnIndex: i,
    status: i === 17 ? 'undone' : 'applied',
    revertedByTurnIndex: i === 17 ? 18 : null,
  }))
  const synthetic = {
    turnIndex: 18,
    status: 'applied',
    revertedByTurnIndex: null,
  }
  const rows = [...real, synthetic]
  assert.equal(countChargeableTurns(rows), 17)
})

test('mixed happy path: 20 rows, some failed/undone → correct chargeable', () => {
  // 15 applied, 2 failed, 2 undone+synthetic (4 rows), 1 pending = 20 rows.
  // Chargeable: 15 applied + 1 pending = 16. Failed: 0. Undone pairs: 0.
  const rows: Array<{
    turnIndex: number
    status: string
    revertedByTurnIndex: number | null
  }> = []
  for (let i = 0; i < 15; i++) {
    rows.push({ turnIndex: i, status: 'applied', revertedByTurnIndex: null })
  }
  rows.push({ turnIndex: 15, status: 'failed', revertedByTurnIndex: null })
  rows.push({ turnIndex: 16, status: 'failed', revertedByTurnIndex: null })
  rows.push({ turnIndex: 17, status: 'undone', revertedByTurnIndex: 18 })
  rows.push({ turnIndex: 18, status: 'applied', revertedByTurnIndex: null })
  rows.push({ turnIndex: 19, status: 'pending', revertedByTurnIndex: null })
  assert.equal(countChargeableTurns(rows), 16)
})

test('stale pending rows that get reaped to failed stop counting', () => {
  // Simulated pre-reap state.
  const beforeReap = [
    { turnIndex: 0, status: 'applied', revertedByTurnIndex: null },
    { turnIndex: 1, status: 'pending', revertedByTurnIndex: null },
  ]
  assert.equal(countChargeableTurns(beforeReap), 2)

  const afterReap = [
    { turnIndex: 0, status: 'applied', revertedByTurnIndex: null },
    { turnIndex: 1, status: 'failed', revertedByTurnIndex: null },
  ]
  assert.equal(countChargeableTurns(afterReap), 1)
})

test('multiple undo events in sequence stay net-zero', () => {
  // Turns 0..3 applied, then user undoes turn 3 (synthetic=4), then undoes
  // turn 2 (synthetic=5). Chargeable: turns 0 and 1 (2 rows). Everything
  // else is either 'undone' or a revert target.
  const rows = [
    { turnIndex: 0, status: 'applied', revertedByTurnIndex: null },
    { turnIndex: 1, status: 'applied', revertedByTurnIndex: null },
    { turnIndex: 2, status: 'undone', revertedByTurnIndex: 5 },
    { turnIndex: 3, status: 'undone', revertedByTurnIndex: 4 },
    { turnIndex: 4, status: 'applied', revertedByTurnIndex: null },
    { turnIndex: 5, status: 'applied', revertedByTurnIndex: null },
  ]
  assert.equal(countChargeableTurns(rows), 2)
})

test('a never-committed pending undo row still does not count if the original turn also points at it', () => {
  // Edge case: the original row already has revertedByTurnIndex set
  // (pointing to a synthetic that's still 'pending'). The synthetic is a
  // revert target, so it's not counted. The original is 'undone', not
  // counted. Net: 0 for the pair, regardless of status on the synthetic.
  const rows = [
    { turnIndex: 0, status: 'undone', revertedByTurnIndex: 1 },
    { turnIndex: 1, status: 'pending', revertedByTurnIndex: null },
  ]
  assert.equal(countChargeableTurns(rows), 0)
})

test('synthetic revert row that itself fails is also net-zero', () => {
  // Defence-in-depth edge: the revert git operation crashed after the
  // synthetic row was created. The synthetic becomes 'failed' (free by
  // the status filter) and the original stays 'applied' with
  // revertedByTurnIndex still set to the failed synthetic's turnIndex.
  // Outcome: the original still counts (user's work isn't undone), the
  // failed synthetic doesn't count. This locks in the invariant that the
  // two exclusion paths (status filter vs revert-target set) compose
  // correctly regardless of which hits first.
  const rows = [
    { turnIndex: 0, status: 'applied', revertedByTurnIndex: 1 },
    { turnIndex: 1, status: 'failed', revertedByTurnIndex: null },
  ]
  // Original is applied, chargeable. Synthetic is failed, not chargeable.
  // revertedByTurnIndex on the original references turn 1 — but turn 1's
  // status filter would exclude it anyway. Order-independent: 1.
  assert.equal(countChargeableTurns(rows), 1)
})

test('unknown status strings are treated as non-chargeable (safe-by-default)', () => {
  // Forward-compat: if a migration someday introduces a new status
  // (e.g. 'archived'), the helper must not silently upgrade it to
  // chargeable. Equality checks against the two known-chargeable values
  // keep this safe.
  const rows = [
    { turnIndex: 0, status: 'applied', revertedByTurnIndex: null },
    { turnIndex: 1, status: 'archived', revertedByTurnIndex: null },
    { turnIndex: 2, status: 'APPLIED', revertedByTurnIndex: null }, // typo
  ]
  assert.equal(countChargeableTurns(rows), 1)
})
