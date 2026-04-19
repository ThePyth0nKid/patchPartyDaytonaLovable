// Cost report CLI.
//
// Usage:
//   npm run costs                       # last 100 parties
//   npm run costs -- --last 500
//   npm run costs -- --since 2026-04-01
//   npm run costs -- --party <id>
//
// Prints median / p95 per party, plus per-persona breakdown and COGS split
// (agent tokens, chat tokens, sandbox time).

import { prisma } from '../src/lib/prisma'
import { computePartyCost, RATES, sandboxCost } from '../src/lib/costing'

interface Args {
  since?: Date
  last?: number
  partyId?: string
}

function parseArgs(argv: string[]): Args {
  const out: Args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--since' && argv[i + 1]) {
      out.since = new Date(argv[i + 1])
      i++
    } else if (a === '--last' && argv[i + 1]) {
      out.last = parseInt(argv[i + 1], 10)
      i++
    } else if (a === '--party' && argv[i + 1]) {
      out.partyId = argv[i + 1]
      i++
    }
  }
  return out
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function p95(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
  return sorted[idx]
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(4)}`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.partyId) {
    const cost = await computePartyCost(args.partyId)
    console.log(JSON.stringify(cost, null, 2))
    await prisma.$disconnect()
    return
  }

  const where: { createdAt?: { gte: Date } } = {}
  if (args.since) where.createdAt = { gte: args.since }

  const parties = await prisma.party.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: args.last ?? 100,
    select: { id: true, createdAt: true },
  })

  const costs = await Promise.all(
    parties.map((p) => computePartyCost(p.id)),
  )
  const totals = costs.map((c) => c.total)

  console.log('')
  console.log(`Parties analyzed: ${costs.length}`)
  console.log(`Window: ${args.since ? args.since.toISOString() : `last ${parties.length}`}`)
  console.log('')
  console.log('── Per-party total ──')
  console.log(`  median: ${fmtUsd(median(totals))}`)
  console.log(`  p95:    ${fmtUsd(p95(totals))}`)
  console.log(`  max:    ${fmtUsd(Math.max(0, ...totals))}`)
  console.log(`  sum:    ${fmtUsd(totals.reduce((a, b) => a + b, 0))}`)
  console.log('')

  const agentTok = costs.map((c) => c.agentTokenCost)
  const chatTok = costs.map((c) => c.chatTokenCost)
  const sbCost = costs.map((c) => c.sandboxCost)
  console.log('── Breakdown (median) ──')
  console.log(`  agent tokens: ${fmtUsd(median(agentTok))}`)
  console.log(`  chat tokens:  ${fmtUsd(median(chatTok))}`)
  console.log(`  sandbox:      ${fmtUsd(median(sbCost))}`)
  console.log('')

  console.log('── Rates ──')
  console.log(`  opus input:        $${RATES.opus.input * 1_000_000}/Mt`)
  console.log(`  opus output:       $${RATES.opus.output * 1_000_000}/Mt`)
  console.log(`  opus cache-read:   $${RATES.opus.cacheRead * 1_000_000}/Mt`)
  console.log(`  opus cache-create: $${RATES.opus.cacheCreate * 1_000_000}/Mt`)
  console.log(`  daytona:           $${(RATES.daytona.perSecond * 60).toFixed(4)}/min`)

  void sandboxCost
  await prisma.$disconnect()
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
