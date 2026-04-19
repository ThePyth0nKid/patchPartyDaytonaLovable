// S7 acceptance test (05-security-checklist.md): Chip templates are
// hard-coded client-side constants. No `${…}` interpolation, no merge
// fields like `{{file}}`, no runtime values from repo/party state.
//
// Why it matters: a template that interpolated e.g. a branch name could
// be used to inject instructions into Anthropic via a socially engineered
// branch name like `main"; ignore prior instructions; "`.
//
// Run: node --test --experimental-strip-types tests/chip-templates.test.ts

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readSource(rel: string): string {
  return readFileSync(resolve(__dirname, rel), 'utf-8')
}

test('chip-row.tsx has no template-string interpolation in prompt literals', () => {
  const src = readSource('../src/app/party/[id]/chip-row.tsx')

  // Extract the CHIP_TEMPLATES array body. Simple: everything between the
  // opening `CHIP_TEMPLATES: readonly ChipTemplate[] = [` and the closing
  // `] as const`.
  const startMarker = 'CHIP_TEMPLATES: readonly ChipTemplate[] = ['
  const endMarker = '] as const'
  const startIdx = src.indexOf(startMarker)
  const endIdx = src.indexOf(endMarker, startIdx)
  assert.notStrictEqual(startIdx, -1, 'CHIP_TEMPLATES declaration not found')
  assert.notStrictEqual(endIdx, -1, 'CHIP_TEMPLATES terminator not found')

  const body = src.slice(startIdx + startMarker.length, endIdx)

  // No `${…}` in prompt bodies — prompts must be literal strings.
  // Backtick-wrapped literals are fine (markdown code spans), but a
  // template-literal placeholder is not.
  assert.equal(
    /\$\{/.test(body),
    false,
    'CHIP_TEMPLATES must not contain `${…}` — prompts must be literal, not interpolated',
  )

  // No `{{…}}` Mustache-style merge fields either.
  assert.equal(
    /\{\{[^}]+\}\}/.test(body),
    false,
    'CHIP_TEMPLATES must not contain `{{…}}` merge fields',
  )
})

test('chip-row.tsx defines exactly 5 chips with the locked IDs', () => {
  const src = readSource('../src/app/party/[id]/chip-row.tsx')
  // Must contain all five IDs as literals. If any renames, re-review S7.
  const expectedIds = [
    "id: 'shorter'",
    "id: 'add-tests'",
    "id: 'run-build'",
    "id: 'mobile-first'",
    "id: 'undo-last'",
  ] as const
  for (const id of expectedIds) {
    assert.ok(
      src.includes(id),
      `chip-row.tsx missing expected chip ID literal: ${id}`,
    )
  }
})

test('chip-row.tsx prompts do not reference repo / party / file identifiers', () => {
  const src = readSource('../src/app/party/[id]/chip-row.tsx')

  // Extract the CHIP_TEMPLATES array body (same slice as above).
  const startIdx = src.indexOf('CHIP_TEMPLATES: readonly ChipTemplate[] = [')
  const endIdx = src.indexOf('] as const', startIdx)
  const body = src.slice(startIdx, endIdx)

  // These identifier names would only appear if a contributor started
  // interpolating runtime values. The prompt copy itself can mention
  // "files" generically, but not reference a specific variable.
  const forbiddenRefs = [
    /\bparty\.[a-zA-Z_]/, // property access off `party`
    /\brepo\.[a-zA-Z_]/,
    /\bbranch\.[a-zA-Z_]/,
    /\bfile\.[a-zA-Z_]/,
    /\bissue\.[a-zA-Z_]/,
  ] as const
  for (const regex of forbiddenRefs) {
    assert.equal(
      regex.test(body),
      false,
      `chip-row.tsx CHIP_TEMPLATES must not reference runtime values (matched ${regex})`,
    )
  }
})
