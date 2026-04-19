import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, GitBranch, Lock, Plus, Rocket, Unlock } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/app-shell'
import { Hairline } from '@/components/ui/hairline'
import { StatusPill } from '@/components/ui/status-pill'
import { DAILY_PARTY_LIMIT, loadUsage } from '@/lib/usage'

export const metadata = { title: 'Dashboard — PatchParty' }

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86_400)}d ago`
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/app')

  const [recentParties, activeRepos, usage] = await Promise.all([
    prisma.party.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { agents: { select: { status: true } } },
    }),
    prisma.activeRepo.findMany({
      where: { userId: session.user.id },
      orderBy: { lastUsedAt: 'desc' },
      take: 6,
    }),
    loadUsage(session.user.id),
  ])

  return (
    <AppShell active="dashboard">
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300 mb-6">
          Welcome back
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.02em]">
          Hello,{' '}
          <span className="bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] bg-clip-text text-transparent">
            {session.user.githubLogin ?? session.user.name ?? 'there'}
          </span>
        </h1>
        <p className="mt-4 text-slate-400 max-w-xl">
          Five Claude personas, ready to race on whichever issue you pick next.
        </p>

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          <Link
            href={activeRepos.length === 0 ? '/app/repos/add' : '/app/repos'}
            className="group md:col-span-2 relative rounded-[10px] border border-slate-800 bg-slate-900/60 p-7 overflow-hidden hover:border-slate-700 transition-colors"
          >
            <Hairline className="absolute inset-x-0 top-0" />
            <div className="flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-[#A78BFA]">
              <Rocket className="w-3.5 h-3.5" />
              {activeRepos.length === 0 ? 'Connect your first repo' : 'Pick up where you left off'}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              {activeRepos.length === 0
                ? 'One-time connect, then burn through your backlog.'
                : `${activeRepos.length} active ${activeRepos.length === 1 ? 'repo' : 'repos'} — jump into any backlog.`}
            </h2>
            <p className="mt-2 text-[14px] text-slate-400 max-w-md">
              Connect a repo once, work through its issues from one place — no URL paste, no repo
              re-picking. Agents branch, push, and PR under your identity.
            </p>
            <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-slate-200">
              {activeRepos.length === 0 ? 'Add repository' : 'Open repos'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          <div className="relative rounded-[10px] border border-slate-800 bg-slate-900/60 p-7">
            <Hairline className="absolute inset-x-0 top-0" color="#14B8A6" />
            <div className="text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-slate-400">
              Today&apos;s usage
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight">{usage.partiesToday}</span>
              <span className="text-slate-500">
                / {usage.unlimited ? '∞' : DAILY_PARTY_LIMIT}
              </span>
            </div>
            <p className="mt-2 text-[12px] text-slate-400">
              {usage.unlimited
                ? 'Maintainer · no cap.'
                : `Free tier: ${DAILY_PARTY_LIMIT} parties / 24h. Resets every midnight UTC.`}
            </p>
            <div className="mt-4 h-1 w-full bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#14B8A6] to-[#60A5FA]"
                style={{
                  width: usage.unlimited
                    ? '100%'
                    : `${Math.min(100, (usage.partiesToday / DAILY_PARTY_LIMIT) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {activeRepos.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between mb-5">
              <h2 className="text-xl font-semibold tracking-tight">Active repos</h2>
              <Link
                href="/app/repos/add"
                className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.14em] text-slate-400 hover:text-slate-100"
              >
                <Plus className="w-3.5 h-3.5" />
                Add repo
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeRepos.map((r) => (
                <Link
                  key={r.id}
                  href={`/app/repos/${r.owner}/${r.name}`}
                  className="group relative rounded-[10px] border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 hover:bg-slate-900/70 transition-all overflow-hidden"
                >
                  <Hairline className="absolute inset-x-0 top-0" />
                  <div className="flex items-center gap-2">
                    {r.isPrivate ? (
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <div className="font-mono text-[13px] text-slate-100 truncate">
                      {r.owner}/<span className="font-semibold">{r.name}</span>
                    </div>
                  </div>
                  {r.description && (
                    <p className="mt-2 text-[12px] text-slate-400 line-clamp-2 leading-relaxed">
                      {r.description}
                    </p>
                  )}
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.14em] text-[#A78BFA]">
                    Open backlog
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-16">
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-xl font-semibold tracking-tight">Recent parties</h2>
            <Link
              href="/app/parties"
              className="text-[12px] text-slate-400 hover:text-slate-50"
            >
              See all →
            </Link>
          </div>

          {recentParties.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-slate-800 p-10 text-center">
              <div className="text-slate-400">No parties yet.</div>
              <Link
                href={activeRepos.length === 0 ? '/app/repos/add' : '/app/repos'}
                className="inline-flex mt-4 items-center gap-1.5 px-4 py-2 rounded-[7px] bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] text-black font-semibold text-sm"
              >
                {activeRepos.length === 0 ? 'Connect your first repo' : 'Pick an issue'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 rounded-[10px] border border-slate-800 bg-slate-900/40 overflow-hidden">
              {recentParties.map((p) => (
                <Link
                  key={p.id}
                  href={`/party/${p.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-900/70 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusPill status={p.status} />
                      <span className="text-[12px] font-mono text-slate-500">
                        {p.repoOwner}/{p.repoName}#{p.issueNumber}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[14px] text-slate-100 truncate">
                      {p.issueTitle}
                    </div>
                  </div>
                  <div className="text-[12px] font-mono text-slate-500 whitespace-nowrap">
                    {timeAgo(p.createdAt)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </AppShell>
  )
}
