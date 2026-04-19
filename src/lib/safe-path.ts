// Path-safety guard for sandbox file operations.
//
// Claude's apply_edit / read_file tools accept a model-supplied path. Two
// threats we close here:
//   1. Directory-escape: `../../../etc/passwd`, absolute paths like
//      `/etc/shadow`, null-byte tricks.
//   2. Secrets exfiltration: even paths that stay inside the repo may
//      target .env, private keys, SSH keys, etc. Claude reading those
//      would let a prompt-injection in user input surface them back to
//      the attacker via the chat transcript.
//
// This module is isolated from chat.ts so it can be unit-tested without
// pulling in the Daytona/Anthropic SDK dependency graph.

import * as posixPath from 'node:path/posix'

// Basename patterns that are *always* refused, wherever they live in the
// repo. A repo-relative path like `apps/web/.env.production` matches the
// first pattern via basename check; `src/config/keys/id_ed25519.pub`
// matches the SSH pattern. We check both the basename and the full
// relative path against these regexes.
const SECRET_FILE_PATTERNS: RegExp[] = [
  // dotenv family: `.env`, `.env.local`, `.env.production`, etc.
  //   EXCEPTION: `.env.example` and `.env.sample` are conventional public
  //   templates; refusing them would break legitimate onboarding help.
  /^\.env(?:\.(?!example$|sample$)[^/\\]+)?$/,
  // Private key / cert material
  /\.(pem|key|p12|pfx|jks)$/i,
  // SSH private keys (with or without .pub mirror)
  /^id_(rsa|ed25519|ecdsa|dsa)(?:\.pub)?$/,
  // AWS / cloud CLI credential files
  /^credentials$/,
  /^\.netrc$/,
]

/** Reason a path was rejected. `null` means the path is safe. */
export type PathRejection = 'invalid' | 'escape' | 'secret'

export interface SafePathResult {
  ok: boolean
  resolved?: string
  reason?: PathRejection
}

/**
 * Resolve a model-supplied repo-relative path against the sandbox repo
 * root. Returns `{ok:true, resolved}` if safe, `{ok:false, reason}`
 * otherwise. A separate function `safeSandboxPath` returns the resolved
 * string (or null) for callers that only care about ok/not-ok.
 */
export function checkSandboxPath(
  repoDir: string,
  userPath: string,
): SafePathResult {
  if (typeof userPath !== 'string' || userPath.length === 0) {
    return { ok: false, reason: 'invalid' }
  }
  if (userPath.includes('\0')) return { ok: false, reason: 'invalid' }
  if (userPath.startsWith('/')) return { ok: false, reason: 'escape' }

  const resolved = posixPath.normalize(`${repoDir}/${userPath}`)
  const root = repoDir.endsWith('/') ? repoDir : `${repoDir}/`
  if (resolved !== repoDir && !resolved.startsWith(root)) {
    return { ok: false, reason: 'escape' }
  }

  const normalized = posixPath.normalize(userPath).replace(/\\/g, '/')
  const basename = posixPath.basename(normalized)
  if (matchesSecretPattern(basename) || matchesSecretPattern(normalized)) {
    return { ok: false, reason: 'secret' }
  }

  return { ok: true, resolved }
}

function matchesSecretPattern(candidate: string): boolean {
  // Check basename-style patterns against the path's basename, but also
  // against each segment — nested secret files like `deploy/.env` must
  // match the `.env` pattern even though the full path is not `.env`.
  for (const re of SECRET_FILE_PATTERNS) {
    if (re.test(candidate)) return true
  }
  const segments = candidate.split('/')
  for (const seg of segments) {
    if (!seg) continue
    for (const re of SECRET_FILE_PATTERNS) {
      if (re.test(seg)) return true
    }
  }
  return false
}

/**
 * Thin wrapper around checkSandboxPath that returns the resolved path
 * on success and null on any rejection. Matches the pre-existing shape
 * used inside chat.ts so callers don't need to restructure.
 */
export function safeSandboxPath(
  repoDir: string,
  userPath: string,
): string | null {
  const result = checkSandboxPath(repoDir, userPath)
  return result.ok && result.resolved ? result.resolved : null
}
