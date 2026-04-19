// Parse `git show --numstat` + `git show --name-status` output into
// structured per-file stats. Isolated from chat.ts so the parser is
// trivially unit-testable without the Daytona/Anthropic runtime.

export interface FileDiffStat {
  path: string
  added: number
  removed: number
  status: 'A' | 'M' | 'D' | 'R' | 'C'
}

type Status = FileDiffStat['status']

/**
 * Parse `git show --numstat --format=` + `git show --name-status --format=`
 * output into one structured entry per changed file. Binary files report
 * `-` for added/removed in numstat; we coerce those to 0.
 *
 * Renames and copies are handled correctly:
 *   numstat for a rename emits either `a\tb\t{old => new}` or the
 *     `a\tb\told\tnew` form (in subdir-rename variants).
 *   name-status emits `R100\told\tnew` or `C100\told\tnew`.
 * We always normalise to the *new* path so downstream UI pills point at the
 * file that now exists in the working tree.
 */
export function parseDiffStats(
  numstatOut: string,
  namestatusOut: string,
): FileDiffStat[] {
  const statusByPath = new Map<string, Status>()
  for (const line of namestatusOut.split('\n')) {
    if (!line.trim()) continue
    // name-status is tab-separated, not whitespace-separated — filenames
    // may contain spaces.
    const cols = line.split('\t')
    if (cols.length < 2) continue
    const code = cols[0]
    // R100, R75, C90 etc. — grab the leading letter.
    const letter = code[0]
    if (letter === 'A' || letter === 'M' || letter === 'D') {
      statusByPath.set(cols[1], letter)
    } else if (letter === 'R' || letter === 'C') {
      // `R100\told\tnew` — the new path is the third column.
      if (cols.length >= 3) statusByPath.set(cols[2], letter)
    }
    // T (type change), U (unmerged), X (unknown) are ignored; numstat will
    // surface the path with the default 'M' fallback if relevant.
  }

  const out: FileDiffStat[] = []
  for (const line of numstatOut.split('\n')) {
    if (!line.trim()) continue
    const cols = line.split('\t')
    if (cols.length < 3) continue
    const addedRaw = cols[0]
    const removedRaw = cols[1]
    const added = addedRaw === '-' ? 0 : parseInt(addedRaw, 10)
    const removed = removedRaw === '-' ? 0 : parseInt(removedRaw, 10)
    if (!Number.isFinite(added) || !Number.isFinite(removed)) continue

    // Resolve path. Three cases git emits for renames/copies:
    //   1. `a\tb\told => new`            (inline-arrow form, one column)
    //   2. `a\tb\t{path/{old => new}/tail}` (brace form inside path)
    //   3. `a\tb\told\tnew`              (separate-column form, two cols)
    let path: string
    if (cols.length >= 4) {
      path = cols[3]
    } else {
      const raw = cols[2]
      const arrow = raw.indexOf(' => ')
      if (arrow >= 0) {
        const braceOpen = raw.lastIndexOf('{', arrow)
        const braceClose = raw.indexOf('}', arrow)
        if (braceOpen >= 0 && braceClose > arrow) {
          // Brace form: prefix{old => new}suffix → prefix + new + suffix
          const prefix = raw.slice(0, braceOpen)
          const newPart = raw.slice(arrow + 4, braceClose)
          const suffix = raw.slice(braceClose + 1)
          path = prefix + newPart + suffix
        } else {
          // Inline form: take right side.
          path = raw.slice(arrow + 4)
        }
      } else {
        path = raw
      }
    }

    out.push({ path, added, removed, status: statusByPath.get(path) ?? 'M' })
  }
  return out
}
