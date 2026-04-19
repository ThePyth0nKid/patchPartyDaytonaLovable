import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import {
  deleteKey,
  getKeyInfo,
  saveKey,
  setPreferredKeyMode,
} from '@/lib/byok'
import { log } from '@/lib/log'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const info = await getKeyInfo(session.user.id)
  return NextResponse.json(info)
}

const SaveKeySchema = z.object({
  key: z.string().min(20).max(200),
  preferredKeyMode: z.enum(['MANAGED', 'BYOK']).optional(),
})

const ModeOnlySchema = z.object({
  preferredKeyMode: z.enum(['MANAGED', 'BYOK']),
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

  // Mode-only updates (user toggles MANAGED ↔ BYOK without re-entering key).
  const modeOnly = ModeOnlySchema.safeParse(body)
  if (
    modeOnly.success &&
    !(body as { key?: unknown }).key
  ) {
    try {
      await setPreferredKeyMode(session.user.id, modeOnly.data.preferredKeyMode)
    } catch (error: unknown) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : 'failed' },
        { status: 400 },
      )
    }
    const info = await getKeyInfo(session.user.id)
    return NextResponse.json({ ok: true, ...info })
  }

  const withKey = SaveKeySchema.safeParse(body)
  if (!withKey.success) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const result = await saveKey(session.user.id, withKey.data.key)
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'validation failed' },
      { status: 400 },
    )
  }

  if (withKey.data.preferredKeyMode) {
    try {
      await setPreferredKeyMode(session.user.id, withKey.data.preferredKeyMode)
    } catch (error: unknown) {
      log.error('byok.POST preferredKeyMode failed', { error: String(error) })
    }
  }

  const info = await getKeyInfo(session.user.id)
  return NextResponse.json({ ok: true, ...info })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  await deleteKey(session.user.id)
  return NextResponse.json({ ok: true })
}
