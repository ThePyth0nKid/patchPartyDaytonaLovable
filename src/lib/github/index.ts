// GitHub integration — user-scoped Octokit factory.
// Pull a per-user access token out of the Account table (Auth.js v5) and
// build a one-shot Octokit client for the request. No singletons; no shared
// PATs in production.

import { Octokit } from '@octokit/rest'
import { prisma } from '@/lib/prisma'

export interface GithubUserIdentity {
  token: string
  login: string | null
}

export async function getGithubTokenForUser(
  userId: string,
): Promise<GithubUserIdentity | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'github' },
    select: { access_token: true, user: { select: { githubLogin: true } } },
  })

  if (!account?.access_token) {
    return null
  }

  return {
    token: account.access_token,
    login: account.user.githubLogin ?? null,
  }
}

export function getOctokitWithToken(token: string): Octokit {
  return new Octokit({ auth: token })
}

export async function getOctokitFor(userId: string): Promise<
  { octokit: Octokit; token: string; login: string | null } | null
> {
  const identity = await getGithubTokenForUser(userId)
  if (!identity) return null
  return {
    octokit: getOctokitWithToken(identity.token),
    token: identity.token,
    login: identity.login,
  }
}

/**
 * Fallback for legacy/local development. Use only when no session is present
 * AND the env PAT is explicitly configured. Never relied on in production.
 */
export function getFallbackOctokit(): Octokit | null {
  const token = process.env.GITHUB_TOKEN
  if (!token) return null
  return getOctokitWithToken(token)
}

// GitHub owner/repo names only contain [A-Za-z0-9._-] (see
// https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts).
// A loose `[^/]+` matcher let shell metacharacters (`;`, backticks,
// `$(...)`) reach the `git clone` command in agent.ts / sandbox-lifecycle.ts.
// We tighten at the parse boundary so every downstream consumer gets a
// safe value for free.
const OWNER_OR_REPO = /^[A-Za-z0-9._-]+$/

export function parseIssueUrl(url: string): {
  owner: string
  repo: string
  number: number
} | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/)
  if (!match) return null
  const [, owner, repo, num] = match
  if (!OWNER_OR_REPO.test(owner) || !OWNER_OR_REPO.test(repo)) return null
  return { owner, repo, number: parseInt(num, 10) }
}

export interface FetchedIssue {
  title: string
  body: string
  owner: string
  repo: string
  number: number
}

export async function fetchIssue(
  octokit: Octokit,
  url: string,
): Promise<FetchedIssue | null> {
  const parsed = parseIssueUrl(url)
  if (!parsed) return null

  try {
    const { data } = await octokit.issues.get({
      owner: parsed.owner,
      repo: parsed.repo,
      issue_number: parsed.number,
    })
    return {
      title: data.title,
      body: data.body ?? '',
      owner: parsed.owner,
      repo: parsed.repo,
      number: parsed.number,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('fetchIssue failed:', message)
    return null
  }
}

export async function createPullRequest(
  octokit: Octokit,
  params: {
    owner: string
    repo: string
    title: string
    body: string
    head: string
    base?: string
  },
): Promise<string | null> {
  try {
    const { data } = await octokit.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base ?? 'main',
    })
    return data.html_url
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('createPullRequest failed:', message)
    return null
  }
}
