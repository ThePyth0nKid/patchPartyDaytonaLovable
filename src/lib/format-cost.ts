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

/** Upper guard against runaway or malformed costs. At this range `toFixed`
 * on a float stops being reliable *and* the string would overflow the
 * compact header layout. Realistic Anthropic spend per party is ≪ $100. */
const DISPLAY_CEILING_USD = 999_999

export function formatCostUsd(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return '$0.00'
  if (n === 0) return '$0.00'
  if (n > DISPLAY_CEILING_USD) return '>$999,999'
  // Under one cent → four decimals, so a partial first turn still
  // registers ("$0.0012 total"). Prevents the deceptive "$0.00 total"
  // flash while the first cost event is still being accumulated. Values
  // small enough that even 4 decimals round to zero (< $0.00005) still
  // read as $0.00 — accepted: they're effectively zero for the meter.
  if (n < 0.01) return `$${n.toFixed(4)}`
  // 1¢–9.99¢ → three decimals for a smooth ramp between sub-cent and
  // dollar rendering.
  if (n < 0.1) return `$${n.toFixed(3)}`
  return `$${n.toFixed(2)}`
}
