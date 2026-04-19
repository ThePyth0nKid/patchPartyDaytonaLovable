// Parse the MAINTAINER_GITHUB_LOGINS env var into a lowercase Set for
// case-insensitive membership checks. Split out from usage.ts so the unit
// test can import it without pulling in Prisma.

export function parseMaintainerLogins(): Set<string> {
  const raw = process.env.MAINTAINER_GITHUB_LOGINS ?? ''
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0),
  )
}
