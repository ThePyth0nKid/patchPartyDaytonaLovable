import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Rocket } from 'lucide-react'
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

  const [recentParties, usage] = await Promise.all([
    prisma.party.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { agents: { select: { status: true } } },
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
            href="/app/new"
            className="group md:col-span-2 relative rounded-[10px] border border-slate-800 bg-slate-900/60 p-7 overflow-hidden hover:border-slate-700 transition-colors"
          >
            <Hairline className="absolute inset-x-0 top-0" />
            <div className="flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-[#A78BFA]">
              <Rocket className="w-3.5 h-3.5" />
              Start a new party
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              Pick a repo, pick an issue, press go.
            </h2>
            <p className="mt-2 text-[14px] text-slate-400 max-w-md">
              No URL copy-paste. Browse every repo you own or collaborate on; filter issues by
              label; launch a party in two clicks.
            </p>
            <div className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-slate-200">
              Choose repo
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
              <span className="text-slate-500">/ {DAILY_PARTY_LIMIT}</span>
            </div>
            <p className="mt-2 text-[12px] text-slate-400">
              Free tier: {DAILY_PARTY_LIMIT} parties / 24h. Resets every midnight UTC.
            </p>
            <div className="mt-4 h-1 w-full bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#14B8A6] to-[#60A5FA]"
                style={{
                  width: `${Math.min(100, (usage.partiesToday / DAILY_PARTY_LIMIT) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

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
                href="/app/new"
                className="inline-flex mt-4 items-center gap-1.5 px-4 py-2 rounded-[7px] bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] text-black font-semibold text-sm"
              >
                Start your first party
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
