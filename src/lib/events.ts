// Durable + realtime event pipeline.
//
// Every state-change in a Party goes through emitEvent():
//   1. persist a `PartyEvent` row (audit log, RLHF dataset)
//   2. pg_notify('party_events', json) so other containers + the local
//      LISTEN-backed SSE fan-out see it in realtime.
//
// Callers do not await the result of emitEvent — fire-and-forget. The pipeline
// handles its own errors (console.error) so telemetry failures never take down
// the user-visible party flow.

import { prisma } from './prisma'
import { getCurrentTraceId } from './trace'

export const EventType = {
  PARTY_STARTED: 'party.started',
  PARTY_COMPLETED: 'party.completed',
  PARTY_FAILED: 'party.failed',

  AGENT_QUEUED: 'agent.queued',
  AGENT_RUNNING: 'agent.running',
  AGENT_STREAMING: 'agent.streaming',
  AGENT_DONE: 'agent.done',
  AGENT_ERROR: 'agent.error',

  PERSONA_PICKED: 'persona.picked',

  SANDBOX_PAUSED: 'sandbox.paused',
  SANDBOX_RESUMED: 'sandbox.resumed',
  SANDBOX_TERMINATED: 'sandbox.terminated',

  CHAT_TURN_SENT: 'chat.turn.sent',
  CHAT_TURN_APPLIED: 'chat.turn.applied',
  CHAT_TURN_FAILED: 'chat.turn.failed',

  PR_OPENED: 'pr.opened',
  PR_MERGED: 'pr.merged',
  PR_CLOSED_UNMERGED: 'pr.closed_unmerged',

  BYOK_KEY_USED: 'byok.key_used',
  BYOK_KEY_ROTATED: 'byok.key_rotated',
} as const

export type EventType = (typeof EventType)[keyof typeof EventType]

export interface EventPayload {
  partyId: string
  agentId?: string
  [k: string]: unknown
}

export interface NotifyMessage {
  partyId: string
  type: EventType
  traceId: string
  payload: EventPayload
  createdAt: string
}

/**
 * Lightweight fan-out message for SSE bridging across containers.
 * Carries an already-serialised PartyStreamEvent so the receiving side can
 * hand it straight to SSE listeners without reconstruction.
 */
export interface StreamNotifyMessage {
  kind: 'stream'
  partyId: string
  senderId: string
  event: unknown
}

/** Postgres NOTIFY channels. */
export const NOTIFY_CHANNEL = 'party_events'
export const STREAM_CHANNEL = 'party_stream'

/**
 * Persist + broadcast a party event. Fire-and-forget from callers —
 * this function catches its own errors.
 */
export async function emitEvent(
  type: EventType,
  payload: EventPayload,
): Promise<void> {
  const traceId = getCurrentTraceId() ?? 'no-trace'
  const createdAt = new Date().toISOString()

  try {
    await prisma.partyEvent.create({
      data: {
        partyId: payload.partyId,
        agentId: payload.agentId,
        type,
        traceId,
        payload: payload as object,
      },
    })
  } catch (error: unknown) {
    console.error('emitEvent.persist failed:', { type, error })
    // persist-failure should not abort notify — subscribers still benefit
  }

  try {
    const message: NotifyMessage = {
      partyId: payload.partyId,
      type,
      traceId,
      payload,
      createdAt,
    }
    // Parameterized pg_notify — payload bound as $2 to avoid injection.
    await prisma.$executeRaw`SELECT pg_notify(${NOTIFY_CHANNEL}, ${JSON.stringify(message)})`
  } catch (error: unknown) {
    console.error('emitEvent.notify failed:', { type, error })
  }
}
