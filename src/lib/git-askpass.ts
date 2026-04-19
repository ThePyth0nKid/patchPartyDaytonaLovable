// Ephemeral GIT_ASKPASS helper for Daytona sandboxes.
//
// Problem: embedding a GitHub OAuth token directly in a `git push` URL
// (`https://x-access-token:${token}@github.com/...`) leaves it in the
// command argv. Daytona captures process argv in its logs, so a compromise
// of those logs (or an operator audit view) would surface valid tokens.
//
// Fix: write the token to a 0600-mode temp file, point a tiny `#!/bin/sh`
// askpass script at it with `cat`, and invoke `git push` with
// `GIT_ASKPASS=<script> GIT_TERMINAL_PROMPT=0 git -c credential.helper= push
// https://x-access-token@github.com/<owner>/<repo>.git`. The token never
// appears in any argv (neither the outer executeCommand nor the cat
// subprocess — cat only sees the token-file path).

import { randomBytes } from 'node:crypto'
import type { Sandbox } from '@daytonaio/sdk'

export interface GitAskpassHandle {
  /** Absolute path to the askpass shell script inside the sandbox. */
  scriptPath: string
  /** Absolute path to the token file (mode 0600). */
  tokenPath: string
  /** Env prefix to splice into the `git push` command: `GIT_ASKPASS=... GIT_TERMINAL_PROMPT=0`. */
  envPrefix: string
  /** Delete both files; always safe to call (ignores errors). */
  cleanup: () => Promise<void>
}

/**
 * Write the askpass script + token file into the sandbox and return a handle
 * that callers splice into their `git push` invocation. Token never appears
 * in any command argv.
 */
export async function setupGitAskpass(
  sandbox: Sandbox,
  token: string,
): Promise<GitAskpassHandle> {
  const id = randomBytes(8).toString('hex')
  const scriptPath = `/tmp/patchparty-askpass-${id}.sh`
  const tokenPath = `/tmp/patchparty-token-${id}`

  // Token file first, 0600. The askpass script does `cat "$TOKEN_PATH"` so
  // the shell only sees the path as argv, never the token value.
  await sandbox.fs.uploadFile(Buffer.from(token, 'utf-8'), tokenPath)
  await sandbox.fs.uploadFile(
    Buffer.from(`#!/bin/sh\ncat "${tokenPath}"\n`, 'utf-8'),
    scriptPath,
  )
  await sandbox.process.executeCommand(
    `chmod 0600 "${tokenPath}" && chmod 0700 "${scriptPath}"`,
  )

  const envPrefix = `GIT_ASKPASS="${scriptPath}" GIT_TERMINAL_PROMPT=0`

  const cleanup = async (): Promise<void> => {
    await Promise.allSettled([
      sandbox.fs.deleteFile(tokenPath).catch(() => undefined),
      sandbox.fs.deleteFile(scriptPath).catch(() => undefined),
    ])
  }

  return { scriptPath, tokenPath, envPrefix, cleanup }
}

/**
 * Compose the tokenless GitHub remote URL that the askpass flow will
 * authenticate against. `https://x-access-token@github.com/<owner>/<repo>.git`
 * (no password in URL — git fetches it via askpass).
 */
export function tokenlessGitHubRemote(owner: string, repo: string): string {
  return `https://x-access-token@github.com/${owner}/${repo}.git`
}
