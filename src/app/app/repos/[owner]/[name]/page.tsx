import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink, Lock, Unlock } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/app-shell'
import { RepoBacklog } from './backlog'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; name: string }>
}) {
  const { owner, name } = await params
  return { title: `${owner}/${name} — PatchParty` }
}

export default async function RepoBacklogPage({
  params,
}: {
  params: Promise<{ owner: string; name: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { owner, name } = await params
  const repo = await prisma.activeRepo.findUnique({
    where: {
      userId_owner_name: { userId: session.user.id, owner, name },
    },
  })
  if (!repo) notFound()

  // Touch lastUsedAt so the Repos grid orders correctly.
  await prisma.activeRepo.update({
    where: { id: repo.id },
    data: { lastUsedAt: new Date() },
  })

  const recentParties = await prisma.party.findMany({
    where: {
      userId: session.user.id,
      repoOwner: owner,
      repoName: name,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return (
    <AppShell active="repos">
      <section className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/app/repos"
          className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.16em] text-slate-400 hover:text-slate-100 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All repos
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {repo.isPrivate ? (
                <Lock className="w-4 h-4 text-slate-400" />
              ) : (
                <Unlock className="w-4 h-4 text-slate-500" />
              )}
              <span className="font-mono text-slate-400 text-[14px]">{repo.owner}/</span>
              <h1 className="font-mono text-2xl md:text-3xl font-semibold tracking-tight">
                {repo.name}
              </h1>
            </div>
            {repo.description && (
              <p className="text-slate-400 max-w-2xl text-[14px] leading-relaxed">
                {repo.description}
              </p>
            )}
          </div>
          <a
            href={`https://github.com/${repo.owner}/${repo.name}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.14em] text-slate-400 hover:text-slate-100 whitespace-nowrap"
          >
            On GitHub
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <RepoBacklog owner={owner} name={name} />

        {recentParties.length > 0 && (
          <section className="mt-16">
            <h2 className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300 mb-4">
              Recent parties in this repo
            </h2>
            <div className="divide-y divide-slate-800/60 rounded-[10px] border border-slate-800 bg-slate-900/40 overflow-hidden">
              {recentParties.map((p) => (
                <Link
                  key={p.id}
                  href={`/party/${p.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-900/70 transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded border ${
                        p.status === 'DONE'
                          ? 'border-[#14B8A6]/50 text-[#14B8A6] bg-[#14B8A6]/10'
                          : p.status === 'FAILED'
                            ? 'border-rose-500/50 text-rose-300 bg-rose-500/10'
                            : 'border-[#A78BFA]/50 text-[#A78BFA] bg-[#A78BFA]/10'
                      }`}
                    >
                      {p.status.toLowerCase()}
                    </span>
                    <span className="font-mono text-[12px] text-slate-500">#{p.issueNumber}</span>
                    <span className="text-[13px] text-slate-100 truncate">{p.issueTitle}</span>
                  </div>
                  {p.prUrl && (
                    <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#14B8A6] whitespace-nowrap">
                      PR opened
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </AppShell>
  )
}
