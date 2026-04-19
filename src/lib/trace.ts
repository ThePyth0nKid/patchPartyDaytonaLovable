// AsyncLocalStorage-backed traceId propagation.
//
// Every incoming party/chat/pick API handler wraps its work in `withTrace`
// so nested calls (runAgent → Anthropic → Daytona → Octokit) can pull the
// ambient traceId without threading it through every signature.
//
// Used by emitEvent() to stamp each PartyEvent row.

import { AsyncLocalStorage } from 'node:async_hooks'
import { nanoid } from 'nanoid'

interface TraceContext {
  traceId: string
  parentTraceId?: string
}

const traceStorage = new AsyncLocalStorage<TraceContext>()

export function withTrace<T>(traceId: string, fn: () => T): T
export function withTrace<T>(ctx: TraceContext, fn: () => T): T
export function withTrace<T>(
  arg: string | TraceContext,
  fn: () => T,
): T {
  const ctx: TraceContext =
    typeof arg === 'string' ? { traceId: arg } : arg
  return traceStorage.run(ctx, fn)
}

export function getCurrentTraceId(): string | undefined {
  return traceStorage.getStore()?.traceId
}

export function getCurrentTraceContext(): TraceContext | undefined {
  return traceStorage.getStore()
}

/** Convenience — generates a new 16-char traceId. */
export function newTraceId(): string {
  return nanoid(16)
}
