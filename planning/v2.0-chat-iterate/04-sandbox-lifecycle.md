# 04 — Sandbox Lifecycle

## Why

Nelson's principle: "Open as long as active, auto-pause on stillstand, crank back up on reopen."

- Daytona billing: ACTIVE sandbox ≈ $0.02/min compute. PAUSED sandbox ≈ $0.01/h storage.
- Aggressive kill = lost chat-session on brief AFK.
- Generous keep-alive = runaway COGS.
- Solution: auto-pause via Daytona's `sandbox.pause()`, resume on demand (3–8s round-trip typical).

## State Machine

```
      ┌──────┐   chat.turn (activity)   ┌──────────┐
      │IDLE_ │◄────────────────────────│  ACTIVE  │
      │WARN  │                          └────┬─────┘
      └──┬───┘ no activity > 10min            │ no activity > 15min
         │ activity                           │
         │                                    ▼
         │                              ┌─────────┐
         └────────────────────────────► │ PAUSED  │◄───┐
                                        └────┬────┘    │
                            user clicks Resume         │ auto-pause
                                             │         │ cron
                                             ▼         │
                                        ┌─────────┐    │
                                        │RESUMING │────┘
                                        └────┬────┘
                                             │ ready
                                             ▼
                                        ┌─────────┐
                                        │ ACTIVE  │
                                        └─────────┘

  After 7 days in PAUSED:

      PAUSED ────► TERMINATED (volume freed)
```

## Transitions

| From | Event | Action | To |
|---|---|---|---|
| ACTIVE | chat.turn / command | update `sandboxLastActivityAt` | ACTIVE |
| ACTIVE | cron, no activity >10min | emit `sandbox.idle_warn`, UI notify | IDLE_WARN |
| IDLE_WARN | chat.turn / command | update `sandboxLastActivityAt` | ACTIVE |
| IDLE_WARN | cron, no activity >15min total | `sandbox.pause()`, emit `sandbox.paused`, set `sandboxPausedAt` | PAUSED |
| PAUSED | user click "Resume" | `sandbox.resume()`, emit `sandbox.resumed` | RESUMING → ACTIVE |
| PAUSED | cron, paused >7days | `sandbox.delete()`, emit `sandbox.terminated` | TERMINATED |
| RESUMING | SDK returns ready | nothing (handler sets ACTIVE) | ACTIVE |
| any | `/pick` terminated loser | `sandbox.delete()` | TERMINATED |

## Cron Handlers

`src/app/api/cron/sandbox-lifecycle/route.ts` — runs every 2 min:

```ts
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) return new Response('forbidden', { status: 403 })

  const now = new Date()
  const tenMinAgo = new Date(now.getTime() - 10 * 60_000)
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60_000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600_000)

  // ACTIVE → IDLE_WARN
  const toWarn = await prisma.party.findMany({
    where: {
      sandboxState: 'ACTIVE',
      sandboxLastActivityAt: { lt: tenMinAgo },
      chatSessionAgentId: { not: null },
    },
    select: { id: true },
  })
  for (const { id } of toWarn) {
    await prisma.party.update({ where: { id }, data: { sandboxState: 'IDLE_WARN' } })
    await emitEvent('sandbox.idle_warn', { partyId: id })
  }

  // IDLE_WARN → PAUSED
  const toPause = await prisma.party.findMany({
    where: {
      sandboxState: 'IDLE_WARN',
      sandboxLastActivityAt: { lt: fifteenMinAgo },
    },
    include: { agents: { where: { id: { equals: prisma.party.fields.chatSessionAgentId } } } },
  })
  for (const party of toPause) {
    const agent = party.agents[0]
    if (!agent?.sandboxId) continue
    try {
      await daytona.sandbox.pause(agent.sandboxId)
      await prisma.party.update({
        where: { id: party.id },
        data: { sandboxState: 'PAUSED', sandboxPausedAt: now },
      })
      await emitEvent('sandbox.paused', { partyId: party.id, agentId: agent.id })
    } catch (e) {
      log.warn('pause failed', { partyId: party.id, error: String(e) })
    }
  }

  // PAUSED → TERMINATED (every 60min check is fine, but cheap to include here)
  const toTerm = await prisma.party.findMany({
    where: { sandboxState: 'PAUSED', sandboxPausedAt: { lt: sevenDaysAgo } },
    include: { agents: true },
  })
  for (const party of toTerm) {
    for (const agent of party.agents) {
      if (agent.sandboxId) {
        await daytona.sandbox.delete(agent.sandboxId).catch(() => {})
      }
    }
    await prisma.party.update({
      where: { id: party.id },
      data: { sandboxState: 'TERMINATED' },
    })
    await emitEvent('sandbox.terminated', { partyId: party.id })
  }

  return Response.json({ warned: toWarn.length, paused: toPause.length, terminated: toTerm.length })
}
```

Railway cron config (railway.json or dashboard):
```
*/2 * * * * curl -sfXPOST -H "x-cron-secret: $CRON_SECRET" https://patchparty.dev/api/cron/sandbox-lifecycle
```

## Resume Route

`POST /api/party/[id]/resume`:
```ts
// 1. auth
// 2. load party, check sandboxState === 'PAUSED'
// 3. set sandboxState = 'RESUMING'
// 4. await daytona.sandbox.resume(agent.sandboxId)  // 3-8s
// 5. set sandboxState = 'ACTIVE', update sandboxLastActivityAt
// 6. emit sandbox.resumed
// 7. return { ok: true }
```

If resume fails (Daytona volume expired or error): fall back to full re-spawn:
- Create new Daytona sandbox.
- `git clone` user's repo, `git checkout <branchName>` (branch still exists on GitHub).
- Run `npm install`.
- Restart preview server.
- Update `agent.sandboxId` to new id.
- State → ACTIVE.

This fallback takes 30–90s vs 3–8s for resume. UI shows "Rebuilding sandbox…" instead of "Resuming…".

## UI States

In `src/app/party/[id]/page.tsx` (post-pick):

| State | Indicator | Action Button |
|---|---|---|
| ACTIVE | green pulse dot, "Live" | — |
| IDLE_WARN | yellow dot, "Pausing in Xm" | "Keep alive" (sends dummy activity ping) |
| PAUSED | grey dot, "Paused 12m ago" | "Resume session" (primary button) |
| RESUMING | spinner | disabled |
| TERMINATED | red dot, "Session ended" | "Start new party from this branch" (shortcut) |

## Acceptance

1. Start chat session, send turn, wait 11 min → UI shows "Pausing in 4m".
2. Wait another 5 min → sandbox.pause called (check Daytona dashboard), UI shows "Paused".
3. Click "Resume" → within 10s UI shows "Live" green.
4. Send chat turn → commit appears on branch as expected.
5. Mock 7-day-old paused party in DB → cron terminates, Daytona sandbox list no longer shows it.
