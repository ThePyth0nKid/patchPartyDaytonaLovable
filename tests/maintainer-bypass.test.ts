import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseMaintainerLogins } from '../src/lib/maintainers.ts'

function withEnv(value: string | undefined, fn: () => void) {
  const prev = process.env.MAINTAINER_GITHUB_LOGINS
  if (value === undefined) {
    delete process.env.MAINTAINER_GITHUB_LOGINS
  } else {
    process.env.MAINTAINER_GITHUB_LOGINS = value
  }
  try {
    fn()
  } finally {
    if (prev === undefined) {
      delete process.env.MAINTAINER_GITHUB_LOGINS
    } else {
      process.env.MAINTAINER_GITHUB_LOGINS = prev
    }
  }
}

test('parseMaintainerLogins: empty env returns empty set', () => {
  withEnv(undefined, () => {
    assert.equal(parseMaintainerLogins().size, 0)
  })
  withEnv('', () => {
    assert.equal(parseMaintainerLogins().size, 0)
  })
})

test('parseMaintainerLogins: single login', () => {
  withEnv('ThePyth0nKid', () => {
    const set = parseMaintainerLogins()
    assert.equal(set.size, 1)
    assert.ok(set.has('thepyth0nkid'))
  })
})

test('parseMaintainerLogins: comma-separated, trimmed, lower-cased', () => {
  withEnv(' ThePyth0nKid , OtherMaintainer ,   ', () => {
    const set = parseMaintainerLogins()
    assert.equal(set.size, 2)
    assert.ok(set.has('thepyth0nkid'))
    assert.ok(set.has('othermaintainer'))
  })
})

test('parseMaintainerLogins: ignores blank entries', () => {
  withEnv(',,,foo,,,bar,,,', () => {
    const set = parseMaintainerLogins()
    assert.equal(set.size, 2)
    assert.ok(set.has('foo'))
    assert.ok(set.has('bar'))
  })
})

test('parseMaintainerLogins: case-insensitive match', () => {
  withEnv('ThePyth0nKid', () => {
    const set = parseMaintainerLogins()
    assert.ok(set.has('thepyth0nkid'))
    assert.ok(set.has('ThePyth0nKid'.toLowerCase()))
    assert.equal(set.has('ThePyth0nKid'), false) // set is lowercase-only
  })
})
