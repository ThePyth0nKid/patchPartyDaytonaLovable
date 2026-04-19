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
  const deletes: string[] = []
  const sandbox = {
    fs: {
      uploadFile: async (buf: Buffer, path: string) => {
        uploads.push({ path, content: buf.toString('utf-8') })
      },
      deleteFile: async (path: string) => {
        deletes.push(path)
      },
    },
    process: {
      executeCommand: async (cmd: string) => {
        commands.push(cmd)
        return { exitCode: 0, result: '' }
      },
    },
  }
  return { sandbox, uploads, commands, deletes }
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

test('token file contains the token and has restrictive chmod', async () => {
  const { sandbox, uploads, commands } = makeStubSandbox()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await setupGitAskpass(sandbox as any, FAKE_TOKEN)

  const tokenFile = uploads.find((u) => !u.path.endsWith('.sh'))
  assert.ok(tokenFile, 'token file was not uploaded')
  assert.equal(tokenFile!.content, FAKE_TOKEN)

  const chmod = commands.find((c) => c.includes('chmod'))
  assert.ok(chmod, 'chmod command was never issued')
  assert.ok(chmod!.includes('0600'), 'token file must be chmod 0600')
  assert.ok(chmod!.includes('0700'), 'askpass script must be chmod 0700')
  // chmod argv references the path, never the token itself.
  assert.ok(!chmod!.includes(FAKE_TOKEN), 'chmod argv unexpectedly contains token')
})

test('cleanup deletes both files and is idempotent against errors', async () => {
  const { sandbox, deletes } = makeStubSandbox()
  // Make deleteFile throw the first time it's called to verify allSettled/catch.
  let firstDelete = true
  sandbox.fs.deleteFile = async (path: string) => {
    deletes.push(path)
    if (firstDelete) {
      firstDelete = false
      throw new Error('simulated fs error')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = await setupGitAskpass(sandbox as any, FAKE_TOKEN)
  await handle.cleanup()

  assert.equal(deletes.length, 2, 'cleanup must attempt to delete both files')
  assert.ok(deletes.includes(handle.scriptPath))
  assert.ok(deletes.includes(handle.tokenPath))
})

test('envPrefix exposes GIT_ASKPASS + GIT_TERMINAL_PROMPT=0 but no token', async () => {
  const { sandbox } = makeStubSandbox()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = await setupGitAskpass(sandbox as any, FAKE_TOKEN)
  assert.match(handle.envPrefix, /GIT_ASKPASS="[^"]+\.sh"/)
  assert.match(handle.envPrefix, /GIT_TERMINAL_PROMPT=0/)
  assert.ok(!handle.envPrefix.includes(FAKE_TOKEN))
})
