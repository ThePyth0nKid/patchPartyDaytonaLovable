// S2 acceptance test (05-security-checklist.md): Claude-generated diff
// content must render as literal text, not as DOM. The DiffDrawer uses
// prism-react-renderer's element-based API, which escapes token content
// through React text nodes — there is no dangerouslySetInnerHTML path.
//
// We don't boot React here. Instead we:
//   1. Statically assert the component source NEVER uses
//      `dangerouslySetInnerHTML`.
//   2. Verify the line-classification helper treats attacker strings like
//      `</pre><script>alert(1)</script><pre>` as plain context lines (no
//      special rendering branch that could bypass escaping).
//
// Run: node --test --experimental-strip-types tests/diff-drawer-xss.test.ts

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const drawerPath = resolve(
  __dirname,
  '../src/app/party/[id]/diff-drawer.tsx',
)
const drawerSource = readFileSync(drawerPath, 'utf-8')

test('DiffDrawer never uses dangerouslySetInnerHTML as JSX prop', () => {
  // The only place `dangerouslySetInnerHTML` may appear is in comments
  // (we document the rule right at the top of diff-drawer.tsx). What we
  // forbid is the JSX prop form: `dangerouslySetInnerHTML={...}`.
  const jsxPropRegex = /dangerouslySetInnerHTML\s*=\s*\{/
  assert.equal(
    jsxPropRegex.test(drawerSource),
    false,
    'DiffDrawer must render all content via React text nodes. Found a ' +
      'dangerouslySetInnerHTML={...} JSX prop — forbidden for ' +
      'Claude-influenced content.',
  )
})

test('DiffDrawer uses prism-react-renderer Highlight (element API)', () => {
  // The only safe highlighter path is the render-prop Highlight component
  // that yields token arrays into React elements. This test locks that in.
  assert.match(drawerSource, /from 'prism-react-renderer'/)
  assert.match(drawerSource, /Highlight/)
})

test('XSS-shaped diff content classifies as context lines, not HTML', () => {
  // The drawer's classify() decides per-line background + marker but never
  // branches into raw-HTML rendering. Simulate the same logic here (kept
  // in sync by hand — if the classifier grows, mirror it here).
  function classify(line: string): string {
    if (line.startsWith('+++') || line.startsWith('---')) return 'meta'
    if (line.startsWith('diff --git')) return 'meta'
    if (line.startsWith('index ')) return 'meta'
    if (line.startsWith('@@')) return 'hunk'
    if (line.startsWith('+')) return 'added'
    if (line.startsWith('-')) return 'removed'
    return 'context'
  }

  // The fixture from 05-security-checklist.md §S2.
  const attackerLine = `</pre><script>alert(1)</script><pre>`
  assert.equal(
    classify(attackerLine),
    'context',
    'Attacker string must classify as a plain context line (it does not ' +
      'start with a diff-marker char).',
  )

  // The same string marked as an added line is still just "added" — the
  // only place it reaches is the token content prop, which React escapes.
  const addedAttacker = `+${attackerLine}`
  assert.equal(classify(addedAttacker), 'added')
})

test('prism-react-renderer has no innerHTML-producing surface in the tree', () => {
  // Belt-and-braces: ensure we don't ALSO shell out to rehype/remark or a
  // markdown renderer that might run inner HTML. We check for JSX prop
  // forms + imports so comments don't give false positives.
  assert.equal(/from ['"]remark/.test(drawerSource), false)
  assert.equal(/from ['"]rehype/.test(drawerSource), false)
  assert.equal(/innerHTML\s*=/.test(drawerSource), false)
})
