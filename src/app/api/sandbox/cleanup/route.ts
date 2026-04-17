import { NextRequest, NextResponse } from 'next/server'
import { Daytona } from '@daytonaio/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let sandboxIds: string[] = []
  try {
    const body = await req.json()
    if (Array.isArray(body?.sandboxIds)) {
      sandboxIds = body.sandboxIds.filter((x: unknown) => typeof x === 'string')
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 })
  }

  if (sandboxIds.length === 0) {
    return NextResponse.json({ ok: true, cleaned: 0 })
  }

  const daytona = new Daytona()
  let cleaned = 0
  await Promise.all(
    sandboxIds.map(async (id) => {
      try {
        const sb = await daytona.get(id)
        await daytona.delete(sb)
        cleaned++
      } catch (e) {
        console.error(`[cleanup] failed for ${id}:`, e)
      }
    }),
  )
  return NextResponse.json({ ok: true, cleaned })
}
