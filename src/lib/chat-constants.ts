// Constants + pure helpers shared between server-side chat.ts and client-side
// turn UI. Kept dependency-free so client bundles don't pull in Prisma /
// Anthropic.

export const MAX_TURNS_PER_PARTY = 20

/**
 * Absolute ceiling on the TOTAL number of ChatTurn rows per party — includes
 * failed and undone rows. Prevents an attacker from growing the ChatTurn
 * table without bound by cycling chat+undo (each cycle is net-zero chargeable
 * but net-+2 rows). 10× the user-facing cap is generous for legitimate use
 * (a user who iterates all 20 turns and undoes/redoes each still stays under
 * 200 rows) while bounding any pathological cycling pattern.
 */
export const MAX_TOTAL_TURNS_PER_PARTY = 10 * MAX_TURNS_PER_PARTY

/**
 * Cap on `failed` rows per party. `failed` rows don't consume a chargeable
 * seat (T4.1) — but each failed turn still spins up a Daytona sandbox
 * operation and burns Anthropic tokens before failing. Without this bound,
 * a malicious prompt that reliably provokes a tool error would let an
 * attacker sustain ~240 AI invocations/hour forever on a shared managed
 * key (even under the 4/60s sliding-window rate limit). 2× the user-facing
 * cap leaves plenty of headroom for legitimate crashes.
 */
export const MAX_FAILED_TURNS_PER_PARTY = 2 * MAX_TURNS_PER_PARTY

/** The canonical set of ChatTurn.status values. Kept as a literal union so
 * code that WRITES status (server-side update / create calls) gets compile-
 * time checks on typos like `'APPLIED'`. The reader side of
 * `ChargeableTurnRow` keeps `status: string` because Prisma's generated
 * types return `string` (the Postgres column is plain `String`, not an
 * enum); narrowing happens inside the helper via literal equality. */
export type ChatTurnStatus = 'pending' | 'applied' | 'failed' | 'undone'

/** Minimal shape used by `countChargeableTurns`. `status` is intentionally
 * wider than `ChatTurnStatus` so Prisma rows flow through unchanged — the
 * helper narrows via equality checks, so an unknown status string is
 * treated as non-chargeable (safe-by-default). */
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
