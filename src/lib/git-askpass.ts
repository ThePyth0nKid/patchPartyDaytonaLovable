// Ephemeral GIT_ASKPASS helper for Daytona sandboxes.
//
// Problem: embedding a GitHub OAuth token directly in a `git push` URL
// (`https://x-access-token:${token}@github.com/...`) leaves it in the
// command argv. Daytona captures process argv in its logs, so a compromise
// of those logs (or an operator audit view) would surface valid tokens.
//
// Fix: place both files inside a dedicated 0700-mode parent directory
// (created *before* either file lands), then point a tiny `#!/bin/sh`
// askpass script at the token file with `cat`. Invoke git with
// `GIT_ASKPASS=<script> GIT_TERMINAL_PROMPT=0 git -c credential.helper= push
// https://x-access-token@github.com/<owner>/<repo>.git`.
//
// Token isolation properties:
//   - Token value never appears in any executeCommand argv; it travels via
//     `sandbox.fs.uploadFile` (Daytona's filesystem API, not argv).
//   - The 0700 parent directory is created before the token file is
//     uploaded, so even during the umask window between uploadFile and
//     chmod the token is unreadable to any other UID — traversal into the
//     parent is blocked by the directory's own mode.
//   - `chmod 0600` on the token file still runs as belt-and-braces.

import { randomBytes } from 'node:crypto'
import type { Sandbox } from '@daytonaio/sdk'

export interface GitAskpassHandle {
  /** Absolute path to the askpass shell script inside the sandbox. */
  scriptPath: string
  /** Absolute path to the token file (mode 0600). */
  tokenPath: string
  /** Absolute path to the 0700-mode parent directory holding both files. */
  dirPath: string
  /** Env prefix to splice into the `git push` command: `GIT_ASKPASS=... GIT_TERMINAL_PROMPT=0`. */
  envPrefix: string
  /** Delete the directory and its contents; always safe to call (ignores errors). */
  cleanup: () => Promise<void>
}

/**
 * Write the askpass script + token file into the sandbox and return a handle
 * that callers splice into their `git push` invocation. Token never lands in
 * any command argv, and is never reachable by another UID on the sandbox
 * even in the window before chmod runs — the parent directory is 0700 from
 * the moment it exists.
 */
export async function setupGitAskpass(
  sandbox: Sandbox,
  token: string,
): Promise<GitAskpassHandle> {
  const id = randomBytes(8).toString('hex')
  const dirPath = `/tmp/patchparty-askpass-${id}`
  const scriptPath = `${dirPath}/askpass.sh`
  const tokenPath = `${dirPath}/token`

  // Step 1: create the parent directory already in 0700 mode so traversal
  // is blocked before any child file can appear inside it.
  await sandbox.process.executeCommand(`mkdir -m 0700 "${dirPath}"`)

  // Step 2: upload both files via Daytona's filesystem API. The token
  // value travels through fs.uploadFile (not argv). Even if uploadFile
  // initially creates the file with default umask, the 0700 parent blocks
  // any other process from opening it.
  await sandbox.fs.uploadFile(Buffer.from(token, 'utf-8'), tokenPath)
  await sandbox.fs.uploadFile(
    Buffer.from(`#!/bin/sh\ncat "${tokenPath}"\n`, 'utf-8'),
    scriptPath,
  )

  // Step 3: belt-and-braces chmod. Tightens the individual file perms in
  // case uploadFile left them at 0644. argv here is safe — only paths.
  await sandbox.process.executeCommand(
    `chmod 0700 "${dirPath}" && chmod 0600 "${tokenPath}" && chmod 0700 "${scriptPath}"`,
  )

  const envPrefix = `GIT_ASKPASS="${scriptPath}" GIT_TERMINAL_PROMPT=0`

  const cleanup = async (): Promise<void> => {
    // `rm -rf` the whole parent directory in one shot. Called in finally
    // blocks; must never throw or it would mask the original error.
    await sandbox.process
      .executeCommand(`rm -rf "${dirPath}"`)
      .catch(() => undefined)
  }

  return { scriptPath, tokenPath, dirPath, envPrefix, cleanup }
}

/**
 * Compose the tokenless GitHub remote URL that the askpass flow will
 * authenticate against. `https://x-access-token@github.com/<owner>/<repo>.git`
 * (no password in URL — git fetches it via askpass).
 */
export function tokenlessGitHubRemote(owner: string, repo: string): string {
  return `https://x-access-token@github.com/${owner}/${repo}.git`
}
