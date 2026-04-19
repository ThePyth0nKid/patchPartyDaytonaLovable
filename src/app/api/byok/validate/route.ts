import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { validateAnthropicKey } from '@/lib/byok'

const Schema = z.object({
  key: z.string().min(20).max(200),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const result = await validateAnthropicKey(parsed.data.key)
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'validation failed' },
      { status: 200 },
    )
  }
  return NextResponse.json({ ok: true, fingerprint: result.fingerprint })
}
