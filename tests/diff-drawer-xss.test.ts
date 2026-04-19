// S2 acceptance test (05-security-checklist.md): Claude-generated diff
// content must render as literal text, not as DOM. The DiffDrawer uses
// prism-react-renderer's element-based API, which escapes token content
// through React text nodes — there is no dangerouslySetInnerHTML path.
//
// Coverage: every component in the turn-render tree must enforce the rule
// (DiffDrawer, TurnCard, TurnColumn). A future contributor adding a
// `dangerouslySetInnerHTML={...}` JSX prop to any of them would bypass
// this test unless we scan all three — so we do.
//
// Run: node --test --experimental-strip-types tests/diff-drawer-xss.test.ts

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { classify } from '../src/app/party/[id]/diff-classify.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const TURN_RENDER_TREE = [
  '../src/app/party/[id]/diff-drawer.tsx',
  '../src/app/party/[id]/turn-card.tsx',
  '../src/app/party/[id]/turn-column.tsx',
] as const

function readSource(rel: string): string {
  return readFileSync(resolve(__dirname, rel), 'utf-8')
}

test('no dangerouslySetInnerHTML JSX prop in any turn-render component', () => {
  // Only the JSX prop form is forbidden; the string may appear in
  // comments documenting the rule.
  const jsxPropRegex = /dangerouslySetInnerHTML\s*=\s*\{/
  for (const rel of TURN_RENDER_TREE) {
    const src = readSource(rel)
    assert.equal(
      jsxPropRegex.test(src),
      false,
      `${rel} must not contain \`dangerouslySetInnerHTML={…}\` — the turn-render tree is required to be HTML-string-free.`,
    )
  }
})

test('DiffDrawer uses prism-react-renderer Highlight (element API)', () => {
  const src = readSource('../src/app/party/[id]/diff-drawer.tsx')
  assert.match(src, /from 'prism-react-renderer'/)
  assert.match(src, /Highlight/)
})

test('no remark/rehype/innerHTML sinks in the turn-render tree', () => {
  for (const rel of TURN_RENDER_TREE) {
    const src = readSource(rel)
    assert.equal(
      /from ['"]remark/.test(src),
      false,
      `${rel} must not import a remark markdown pipeline`,
    )
    assert.equal(
      /from ['"]rehype/.test(src),
      false,
      `${rel} must not import a rehype HTML pipeline`,
    )
    assert.equal(
      /innerHTML\s*=/.test(src),
      false,
      `${rel} must not set innerHTML directly`,
    )
  }
})

test('classify(): XSS-shaped diff content is a plain context line', () => {
  const attacker = `</pre><script>alert(1)</script><pre>`
  assert.equal(
    classify(attacker),
    'context',
    'Attacker string must classify as context — no HTML-rendering branch.',
  )
  // And when prefixed with a `+` (added-line marker), still just "added" —
  // the only place the string reaches is the token content prop, which
  // React escapes.
  assert.equal(classify(`+${attacker}`), 'added')
  assert.equal(classify(`-${attacker}`), 'removed')
})

test('classify(): filename headers beat content markers', () => {
  // +++ and --- are meta (file headers), NOT added/removed content.
  assert.equal(classify('+++ b/src/file.ts'), 'meta')
  assert.equal(classify('--- a/src/file.ts'), 'meta')
  assert.equal(classify('diff --git a/foo b/bar'), 'meta')
  assert.equal(classify('index abc123..def456 100644'), 'meta')
  assert.equal(classify('@@ -1,4 +1,6 @@'), 'hunk')
  assert.equal(classify('+ added line'), 'added')
  assert.equal(classify('- removed line'), 'removed')
  assert.equal(classify(' context line'), 'context')
  assert.equal(classify(''), 'context')
})
