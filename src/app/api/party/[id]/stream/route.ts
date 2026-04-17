import { NextRequest } from 'next/server'
import { partyStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const party = partyStore.get(id)

  if (!party) {
    return new Response('Party not found', { status: 404 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initial = `data: ${JSON.stringify({ type: 'initial', party })}\n\n`
      controller.enqueue(encoder.encode(initial))

      // Subscribe to events
      const unsubscribe = partyStore.subscribe(id, (event) => {
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(payload))

          // Close stream when all agents are done or errored
          const current = partyStore.get(id)
          if (current) {
            const allFinished = Object.values(current.agents).every(
              (a) => a.status === 'done' || a.status === 'error',
            )
            if (allFinished) {
              const done = `data: ${JSON.stringify({ type: 'party_done', party: current })}\n\n`
              controller.enqueue(encoder.encode(done))
              setTimeout(() => {
                unsubscribe()
                controller.close()
              }, 100)
            }
          }
        } catch (e) {
          console.error('SSE error:', e)
        }
      })

      // Heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 15000)

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
