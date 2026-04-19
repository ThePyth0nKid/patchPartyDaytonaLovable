// Pure classifier for unified-diff lines. Extracted from diff-drawer.tsx so
// it can be unit-tested under `node --test --experimental-strip-types`, which
// supports `.ts` but NOT `.tsx` (JSX) — see tests/diff-drawer-xss.test.ts.

export type DiffLineKind = 'added' | 'removed' | 'hunk' | 'meta' | 'context'

/**
 * Classify a single unified-diff line for background/marker styling.
 *
 * Order matters: `+++`/`---` (filename headers) must be checked BEFORE
 * the generic `+`/`-` content-line checks.
 */
export function classify(line: string): DiffLineKind {
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta'
  if (line.startsWith('diff --git')) return 'meta'
  if (line.startsWith('index ')) return 'meta'
  if (line.startsWith('@@')) return 'hunk'
  if (line.startsWith('+')) return 'added'
  if (line.startsWith('-')) return 'removed'
  return 'context'
}
