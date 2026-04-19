// Constants + pure helpers shared between server-side chat.ts and client-side
// turn UI. Kept dependency-free so client bundles don't pull in Prisma /
// Anthropic.

export const MAX_TURNS_PER_PARTY = 20

/** Minimal shape used by `countChargeableTurns`. */
export interface ChargeableTurnRow {
  turnIndex: number
  status: string
  revertedByTurnIndex: number | null
}

/**
 * Count turns that consume a seat against MAX_TURNS_PER_PARTY (T4.1).
 *
 * A turn is "chargeable" iff:
 *   1. Its status is 'pending' or 'applied' (failed + undone rows are free).
 *   2. It is NOT a synthetic revert — i.e. no other row's
 *      `revertedByTurnIndex` points at its `turnIndex`.
 *
 * Rationale: prior to T4.1 the cap counted every row, so a crashed turn
 * stole a seat forever and `undo` at cap left the user strictly worse off
 * (original + synthetic = 2 seats burned for zero net work). The chargeable
 * definition makes the cap honest — the user can always undo freely, and
 * only user-visible, non-reverted chat turns count.
 */
export function countChargeableTurns(
  rows: ReadonlyArray<ChargeableTurnRow>,
): number {
  const revertTargets = new Set<number>()
  for (const r of rows) {
    if (r.revertedByTurnIndex !== null) {
      revertTargets.add(r.revertedByTurnIndex)
    }
  }
  let n = 0
  for (const r of rows) {
    if (r.status !== 'pending' && r.status !== 'applied') continue
    if (revertTargets.has(r.turnIndex)) continue
    n++
  }
  return n
}
