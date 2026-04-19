// Parse `git show --numstat` + `git show --name-status` output into
// structured per-file stats. Isolated from chat.ts so the parser is
// trivially unit-testable without the Daytona/Anthropic runtime.

export interface FileDiffStat {
  path: string
  added: number
  removed: number
  status: 'A' | 'M' | 'D'
}

/**
 * Parse `git show --numstat --format=` + `git show --name-status --format=`
 * output into one structured entry per changed file. Binary files report
 * `-` for added/removed in numstat; we coerce those to 0. Renamed files
 * (`R100 old → new` in name-status) fall through to the 'M' default —
 * acceptable for MVP since `apply_edit` emits only A/M/D.
 */
export function parseDiffStats(
  numstatOut: string,
  namestatusOut: string,
): FileDiffStat[] {
  const statusByPath = new Map<string, 'A' | 'M' | 'D'>()
  for (const line of namestatusOut.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(/^([AMD])\s+(.+)$/)
    if (m) statusByPath.set(m[2], m[1] as 'A' | 'M' | 'D')
  }
  const out: FileDiffStat[] = []
  for (const line of numstatOut.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/)
    if (!m) continue
    const added = m[1] === '-' ? 0 : parseInt(m[1], 10)
    const removed = m[2] === '-' ? 0 : parseInt(m[2], 10)
    const path = m[3]
    out.push({ path, added, removed, status: statusByPath.get(path) ?? 'M' })
  }
  return out
}
