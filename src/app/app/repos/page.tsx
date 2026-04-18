import Link from 'next/link'
import { redirect } from 'next/navigation'
import { GitBranch, Lock, Plus, Star, Unlock } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/app-shell'
import { Hairline } from '@/components/ui/hairline'

export const metadata = { title: 'Repos — PatchParty' }
export const dynamic = 'force-dynamic'

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86_400)}d ago`
}

export default async function ReposPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/app/repos')

  const repos = await prisma.activeRepo.findMany({
    where: { userId: session.user.id },
    orderBy: { lastUsedAt: 'desc' },
  })

  return (
    <AppShell active="repos">
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300 mb-3">
              Active repositories
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em]">
              Your project backlogs
            </h1>
            <p className="mt-3 text-slate-400 max-w-xl text-[14px]">
              Connect a repo once, burn through issues from one place.
            </p>
          </div>
          <Link
            href="/app/repos/add"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[7px] bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] text-black font-semibold text-[13px] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add repository
          </Link>
        </div>

        {repos.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-slate-800 p-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 mb-4">
              <GitBranch className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-slate-200 text-[15px] font-medium">
              No active repos yet
            </div>
            <p className="mt-2 text-slate-400 text-[13px] max-w-sm mx-auto">
              Pick a repo you want to work on. Once connected, you&apos;ll see its issue
              backlog here and can launch parties in one click.
            </p>
            <Link
              href="/app/repos/add"
              className="inline-flex mt-6 items-center gap-1.5 px-4 py-2 rounded-[7px] bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] text-black font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              Connect your first repo
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map((r) => (
              <Link
                key={r.id}
                href={`/app/repos/${r.owner}/${r.name}`}
                className="group relative rounded-[10px] border border-slate-800 bg-slate-900/50 p-5 hover:border-slate-700 hover:bg-slate-900/70 transition-all overflow-hidden"
              >
                <Hairline className="absolute inset-x-0 top-0" />
                <div className="flex items-start gap-2">
                  {r.isPrivate ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[13px] text-slate-100 truncate">
                      {r.owner}/<span className="text-slate-50 font-semibold">{r.name}</span>
                    </div>
                    {r.description && (
                      <p className="mt-1.5 text-[12.5px] text-slate-400 line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-[11px] font-mono text-slate-500">
                  {r.language && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
                      {r.language}
                    </span>
                  )}
                  {r.stars > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {r.stars}
                    </span>
                  )}
                  <span className="ml-auto text-slate-600">
                    used {timeAgo(r.lastUsedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
