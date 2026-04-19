// T4.2 — display formatting for cumulative USD costs in the turn header.
//
// Why a dedicated helper:
//   - Sub-cent values ($0.0023) should still read as something nonzero
//     so a user mid-turn sees their meter move; `toFixed(2)` would
//     floor everything under $0.01 to "$0.00" and the UI would look
//     stuck.
//   - Once past $0.10 we drop to two-decimal dollars to stay tidy.
//   - Null / NaN / negative inputs coerce to $0.00 so a broken row
//     doesn't poison the whole display.

export function formatCostUsd(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return '$0.00'
  if (n === 0) return '$0.00'
  // Under one cent → four decimals, so a partial first turn still
  // registers ("$0.0012 total"). Prevents the deceptive "$0.00 total"
  // flash while the first cost event is still being accumulated.
  if (n < 0.01) return `$${n.toFixed(4)}`
  // 1¢–9.99¢ → three decimals for a smooth ramp between sub-cent and
  // dollar rendering.
  if (n < 0.1) return `$${n.toFixed(3)}`
  return `$${n.toFixed(2)}`
}
