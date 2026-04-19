// POST /api/party/[id]/chat — stream a chat-iterate turn as SSE.
//
// Body: { message: string }.
// Response: text/event-stream with events defined in ChatSseEvent.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { runChatTurn, type ChatSseEvent } from '@/lib/chat'
import { getFallbackOctokit, getOctokitFor } from '@/lib/github'
import { newTraceId, withTrace } from '@/lib/trace'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const Schema = z.object({
  message: z.string().min(1).max(8000),
})

function formatSse(event: ChatSseEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params

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

  const party = await prisma.party.findUnique({
    where: { id },
    select: { userId: true, chatSessionAgentId: true, sandboxState: true },
  })
  if (!party) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (party.userId !== session.user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!party.chatSessionAgentId) {
    return NextResponse.json(
      { error: 'Pick a persona before chatting.' },
      { status: 400 },
    )
  }
  if (party.sandboxState === 'TERMINATED') {
    return NextResponse.json(
      { error: 'Sandbox terminated. Start a new party.' },
      { status: 410 },
    )
  }

  const gh = await getOctokitFor(session.user.id)
  const userToken =
    gh?.token ?? (getFallbackOctokit() ? process.env.GITHUB_TOKEN : undefined)
  if (!userToken) {
    return NextResponse.json(
      { error: 'GitHub token unavailable. Re-link your account.' },
      { status: 403 },
    )
  }

  const traceId = newTraceId()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await withTrace(traceId, async () => {
          const iter = runChatTurn(
            { partyId: id, userId: session.user.id, userToken },
            parsed.data.message,
          )
          for await (const event of iter) {
            controller.enqueue(encoder.encode(formatSse(event)))
          }
        })
      } catch (error: unknown) {
        log.error('chat route stream failed', {
          partyId: id,
          error: String(error),
        })
        controller.enqueue(
          encoder.encode(
            formatSse({
              event: 'turn_failed',
              data: { error: 'internal error' },
            }),
          ),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-trace-id': traceId,
    },
  })
}
