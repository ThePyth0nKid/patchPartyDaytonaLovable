// Acceptance tests for setupGitAskpass — verifies the GitHub OAuth token
// never appears in any command argv. Run via Node 22+ built-in test runner:
//   node --test --experimental-strip-types tests/git-askpass.test.ts
//
// Rationale (planning/v2.1-iterate-ux/03-tasks.md, T1.4 acceptance):
//   "unit test greps the final command string for `x-access-token:` + the
//    actual token value — must not find either substring in argv."
//
// We stub the Sandbox surface with two recorders (fs.uploadFile contents +
// process.executeCommand argv strings), run setupGitAskpass, then assert
// neither recorder contains the literal token or the dangerous
// `x-access-token:<token>` URL form.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupGitAskpass, tokenlessGitHubRemote } from '../src/lib/git-askpass.ts'

interface UploadRecord {
  path: string
  content: string
}

function makeStubSandbox() {
  const uploads: UploadRecord[] = []
  const commands: string[] = []
  const sandbox = {
    fs: {
      uploadFile: async (buf: Buffer, path: string) => {
        uploads.push({ path, content: buf.toString('utf-8') })
      },
      deleteFile: async (_path: string) => {
        // unused by the current implementation (rm -rf is used instead)
      },
    },
    process: {
      executeCommand: async (cmd: string) => {
        commands.push(cmd)
        return { exitCode: 0, result: '' }
      },
    },
  }
  return { sandbox, uploads, commands }
}

const FAKE_TOKEN = 'ghs_F4K3t0k3nDoNotLeak_ABCDEFGHIJKLMNOPQRST'

test('token value never appears in any executeCommand argv', async () => {
  const { sandbox, commands } = makeStubSandbox()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = await setupGitAskpass(sandbox as any, FAKE_TOKEN)

  // Simulate the caller splicing the askpass env prefix into a git push.
  const remote = tokenlessGitHubRemote('octo', 'repo')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sandbox as any).process.executeCommand(
    `cd /repo && ${handle.envPrefix} git -c credential.helper= push "${remote}" HEAD:main`,
  )

  for (const cmd of commands) {
    assert.ok(
      !cmd.includes(FAKE_TOKEN),
      `token leaked into argv: ${cmd}`,
    )
    assert.ok(
      !cmd.includes('x-access-token:'),
      `URL-embedded token pattern "x-access-token:" leaked into argv: ${cmd}`,
    )
  }
})

test('tokenlessGitHubRemote produces a URL without any password component', () => {
  const remote = tokenlessGitHubRemote('octo', 'repo')
  assert.equal(remote, 'https://x-access-token@github.com/octo/repo.git')
  // Userinfo must be "x-access-token" with no ":password" after it.
  const userinfo = remote.slice('https://'.length, remote.indexOf('@'))
  assert.equal(userinfo, 'x-access-token', 'userinfo must not carry a password')
  assert.ok(!userinfo.includes(':'), 'userinfo unexpectedly contains ":" (password would follow)')
})

test('parent directory is created with mode 0700 before any file is uploaded', async () => {
  const { sandbox, commands, uploads } = makeStubSandbox()
  // Record the insertion order: mkdir command must precede any uploadFile.
  const events: Array<{ kind: 'cmd' | 'upload'; value: string }> = []
  const origExec = sandbox.process.executeCommand
  const origUpload = sandbox.fs.uploadFile
  sandbox.process.executeCommand = async (cmd: string) => {
    events.push({ kind: 'cmd', value: cmd })
    return origExec(cmd)
  }
  sandbox.fs.uploadFile = async (buf: Buffer, path: string) => {
    events.push({ kind: 'upload', value: path })
    return origUpload(buf, path)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await setupGitAskpass(sandbox as any, FAKE_TOKEN)

  const firstEvent = events[0]
  assert.equal(firstEvent.kind, 'cmd', 'first operation must be a command, not an upload')
  assert.match(
    firstEvent.value,
    /^mkdir -m 0700 "[^"]+"$/,
    'first command must be mkdir -m 0700 of the parent dir',
  )
  // Subsequent uploads must all target paths *inside* the parent.
  const mkdirPath = firstEvent.value.match(/^mkdir -m 0700 "([^"]+)"$/)![1]
  for (const e of events.filter((x) => x.kind === 'upload')) {
    assert.ok(
      e.value.startsWith(mkdirPath + '/'),
      `upload ${e.value} is outside the 0700 parent ${mkdirPath}`,
    )
  }
  // And both files landed inside the parent.
  assert.ok(uploads.every((u) => u.path.startsWith(mkdirPath + '/')))
  assert.ok(commands.length >= 1)
})

test('askpass script references the token file path, not the token itself', async () => {
  const { sandbox, uploads } = makeStubSandbox()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await setupGitAskpass(sandbox as any, FAKE_TOKEN)

  const script = uploads.find((u) => u.path.endsWith('.sh'))
  assert.ok(script, 'askpass script was not uploaded')
  assert.ok(!script!.content.includes(FAKE_TOKEN), 'askpass script leaks token inline')
  assert.match(script!.content, /^#!\/bin\/sh/, 'askpass script missing shebang')
  assert.match(script!.content, /cat "[^"]+"/, 'askpass script must cat a path, not echo a literal')
})

test('token file contains the token and chmod 0600 is issued on it', async () => {
  const { sandbox, uploads, commands } = makeStubSandbox()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = await setupGitAskpass(sandbox as any, FAKE_TOKEN)

  const tokenFile = uploads.find((u) => u.path === handle.tokenPath)
  assert.ok(tokenFile, 'token file was not uploaded')
  assert.equal(tokenFile!.content, FAKE_TOKEN)

  const chmod = commands.find((c) => c.includes('chmod'))
  assert.ok(chmod, 'chmod command was never issued')
  assert.ok(
    chmod!.includes(`chmod 0600 "${handle.tokenPath}"`),
    'token file must be chmod 0600 by path',
  )
  assert.ok(
    chmod!.includes(`chmod 0700 "${handle.scriptPath}"`),
    'askpass script must be chmod 0700 by path',
  )
  assert.ok(
    chmod!.includes(`chmod 0700 "${handle.dirPath}"`),
    'parent dir must be (re-)chmod 0700',
  )
  // chmod argv references paths, never the token value.
  assert.ok(!chmod!.includes(FAKE_TOKEN), 'chmod argv unexpectedly contains token')
})

test('cleanup rm -rfs the parent dir exactly once and swallows errors', async () => {
  const { sandbox, commands } = makeStubSandbox()
  // Make the rm -rf throw to verify cleanup swallows (runs in finally blocks).
  const origExec = sandbox.process.executeCommand
  sandbox.process.executeCommand = async (cmd: string) => {
    if (cmd.startsWith('rm -rf ')) {
      commands.push(cmd)
      throw new Error('simulated rm failure')
    }
    return origExec(cmd)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = await setupGitAskpass(sandbox as any, FAKE_TOKEN)
  await handle.cleanup() // must not throw

  const rms = commands.filter((c) => c.startsWith('rm -rf '))
  assert.equal(rms.length, 1, 'cleanup must issue exactly one rm -rf')
  assert.ok(
    rms[0] === `rm -rf "${handle.dirPath}"`,
    `cleanup must target the parent dir, got: ${rms[0]}`,
  )
})

test('envPrefix exposes GIT_ASKPASS + GIT_TERMINAL_PROMPT=0 but no token', async () => {
  const { sandbox } = makeStubSandbox()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = await setupGitAskpass(sandbox as any, FAKE_TOKEN)
  assert.match(handle.envPrefix, /GIT_ASKPASS="[^"]+\.sh"/)
  assert.match(handle.envPrefix, /GIT_TERMINAL_PROMPT=0/)
  assert.ok(!handle.envPrefix.includes(FAKE_TOKEN))
})
