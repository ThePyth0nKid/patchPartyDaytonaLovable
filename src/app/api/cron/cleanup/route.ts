// Scheduled cleanup — called by Railway Cron (or an external scheduler).
//
// Finds agents with a sandboxId older than SANDBOX_TTL_MINUTES and deletes
// the sandbox via the Daytona SDK, then clears the sandboxId on the row so
// a second run doesn't attempt the same delete.
//
// Protected by CRON_SECRET to avoid anyone on the public internet racking up
// Daytona delete calls.

import { NextRequest, NextResponse } from 'next/server'
import { Daytona } from '@daytonaio/sdk'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SANDBOX_TTL_MINUTES = 60

async function authorize(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

async function run(): Promise<{ scanned: number; cleaned: number; errors: number }> {
  const cutoff = new Date(Date.now() - SANDBOX_TTL_MINUTES * 60_000)
  const stale = await prisma.agent.findMany({
    where: {
      sandboxId: { not: null },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, sandboxId: true },
    take: 200,
  })

  if (stale.length === 0) {
    return { scanned: 0, cleaned: 0, errors: 0 }
  }

  const daytona = new Daytona()
  let cleaned = 0
  let errors = 0

  await Promise.all(
    stale.map(async (row) => {
      if (!row.sandboxId) return
      try {
        const sb = await daytona.get(row.sandboxId)
        await daytona.delete(sb)
        cleaned++
      } catch (error: unknown) {
        errors++
        // Likely already gone — clear the pointer anyway.
        console.warn(
          `[cron:cleanup] could not delete sandbox ${row.sandboxId}:`,
          error instanceof Error ? error.message : error,
        )
      } finally {
        await prisma.agent.update({
          where: { id: row.id },
          data: { sandboxId: null },
        }).catch(() => undefined)
      }
    }),
  )

  return { scanned: stale.length, cleaned, errors }
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await run()
  return NextResponse.json({ ok: true, ...result })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
