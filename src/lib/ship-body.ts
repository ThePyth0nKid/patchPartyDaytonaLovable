// Pure helpers for the Ship-PR flow (T3.5 — closes S5 in
// 05-security-checklist.md). Kept dependency-free so both the server route
// and the unit test can import them without pulling Prisma / Daytona.
//
// Two concerns live here:
//
//   1. `sanitizeShipBody` — defense against an attacker-in-the-middle / copy-
//      paste-injection vector: a malicious body containing HTML comments is
//      normally invisible on GitHub but survives in the raw markdown, where a
//      future re-ingestion path could splice it into an Anthropic prompt. We
//      strip `<!-- … -->` and enforce a hard 2000-char cap (our own, not
//      GitHub's) before the body ever leaves our backend.
//
//   2. `buildPreviewBody` — aggregates the `assistantResponse` first-lines of
//      the applied turns into a markdown bullet list, plus a footer linking
//      back to the party. This is what the user sees pre-filled in the sheet.
//      Client-side edits replace it wholesale; both paths go through
//      `sanitizeShipBody` on POST.

export const SHIP_BODY_MAX_LEN = 2000

export interface ShipBodyTurn {
  turnIndex: number
  userMessage: string
  assistantResponse: string | null
}

export interface ShipBodyFile {
  path: string
  added: number
  removed: number
}

export function sanitizeShipBody(input: string): string {
  if (typeof input !== 'string') return ''
  // Strip HTML comments in all their forms, including the malformed variants
  // some chat UIs emit. `/<!--[\s\S]*?-->/g` handles the well-formed case;
  // we also sweep any dangling opener `<!--` to the end of string because an
  // attacker might deliberately leave it unclosed to fool a naive parser.
  let out = input.replace(/<!--[\s\S]*?-->/g, '')
  const dangling = out.indexOf('<!--')
  if (dangling !== -1) out = out.slice(0, dangling)
  out = out.trim()
  if (out.length > SHIP_BODY_MAX_LEN) {
    out = out.slice(0, SHIP_BODY_MAX_LEN)
  }
  return out
}

export function sanitizeShipTitle(input: string): string {
  if (typeof input !== 'string') return ''
  // GitHub truncates at 256; we enforce 200 so "[via PatchParty: X]" etc.
  // suffixes still fit. Strip newlines — a title with `\n` breaks the PR UI.
  return input.replace(/[\r\n]+/g, ' ').trim().slice(0, 200)
}

/**
 * Strip a leading "#1234 — " or "#1234: " issue-number prefix. Issues opened
 * from GitHub already have the number in their URL; repeating it in the PR
 * title adds noise.
 */
export function stripIssueNumberPrefix(title: string): string {
  if (typeof title !== 'string') return ''
  return title.replace(/^#?\s*\d+\s*[—\-:·]\s*/, '').trim()
}

/**
 * Compose the pre-filled body from applied chat turns. The caller is
 * responsible for excluding 'undone' / 'failed' rows — buildPreviewBody does
 * not filter, it just formats what it's given.
 */
export function buildPreviewBody(
  turns: readonly ShipBodyTurn[],
  files: readonly ShipBodyFile[],
  partyId: string,
): string {
  const bullets = turns
    .map((t) => firstLine(t.assistantResponse ?? t.userMessage ?? ''))
    .filter((line) => line.length > 0)
    .map((line) => `- ${line}`)

  const filesBlock =
    files.length > 0
      ? files
          .slice(0, 20)
          .map(
            (f) =>
              `- \`${f.path}\` +${f.added} -${f.removed}`,
          )
          .join('\n')
      : '_(no file changes recorded — iterate a turn before shipping)_'

  const intro = '## Implemented by PatchParty'
  const turnsHeader = bullets.length > 0 ? '### What changed\n' + bullets.join('\n') : ''
  const filesHeader = '### Files\n' + filesBlock
  const footer = `_Shipped from PatchParty party ${partyId}._`

  return [intro, turnsHeader, filesHeader, footer]
    .filter((s) => s.length > 0)
    .join('\n\n')
}

/**
 * Aggregate per-file diff stats across multiple `ChatTurn.diffStats` rows so
 * the preview endpoint can return a deduped list with summed +/-.
 */
export function aggregateDiffStats(
  rows: ReadonlyArray<ReadonlyArray<ShipBodyFile>>,
): ShipBodyFile[] {
  const agg = new Map<string, ShipBodyFile>()
  for (const row of rows) {
    for (const entry of row) {
      if (!entry || typeof entry.path !== 'string') continue
      const current = agg.get(entry.path)
      if (current) {
        agg.set(entry.path, {
          path: entry.path,
          added: current.added + numOrZero(entry.added),
          removed: current.removed + numOrZero(entry.removed),
        })
      } else {
        agg.set(entry.path, {
          path: entry.path,
          added: numOrZero(entry.added),
          removed: numOrZero(entry.removed),
        })
      }
    }
  }
  return Array.from(agg.values()).sort((a, b) => a.path.localeCompare(b.path))
}

function numOrZero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function firstLine(s: string): string {
  const trimmed = s.trim()
  if (!trimmed) return ''
  const idx = trimmed.indexOf('\n')
  const line = idx >= 0 ? trimmed.slice(0, idx) : trimmed
  return line.length > 160 ? line.slice(0, 157) + '…' : line
}
