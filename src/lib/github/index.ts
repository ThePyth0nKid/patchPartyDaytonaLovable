// GitHub integration — simplified with PAT for hackathon speed.
// For production: replace with OAuth flow.

import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })

export function parseIssueUrl(url: string): {
  owner: string
  repo: string
  number: number
} | null {
  const match = url.match(
    /github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/,
  )
  if (!match) return null
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) }
}

export async function fetchIssue(url: string): Promise<{
  title: string
  body: string
  owner: string
  repo: string
  number: number
} | null> {
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
  } catch (e) {
    console.error('Failed to fetch issue:', e)
    return null
  }
}

export async function createPullRequest(params: {
  owner: string
  repo: string
  title: string
  body: string
  head: string
  base?: string
}): Promise<string | null> {
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
  } catch (e) {
    console.error('Failed to create PR:', e)
    return null
  }
}
