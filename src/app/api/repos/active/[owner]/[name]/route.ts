import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { owner, name } = await params

  await prisma.activeRepo.deleteMany({
    where: { userId: session.user.id, owner, name },
  })

  return NextResponse.json({ ok: true })
}
