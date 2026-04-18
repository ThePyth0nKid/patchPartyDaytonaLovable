import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/app-shell'
import { StatusPill } from '@/components/ui/status-pill'

export const metadata = { title: 'Parties — PatchParty' }

function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function PartiesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/app/parties')

  const parties = await prisma.party.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <AppShell active="parties">
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300 mb-4">
          History
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.02em]">Your parties</h1>
        <p className="mt-3 text-slate-400 max-w-xl">
          Every issue you&apos;ve sent through PatchParty. Picked patches link to the PR on GitHub.
        </p>

        {parties.length === 0 ? (
          <div className="mt-14 rounded-[10px] border border-dashed border-slate-800 p-10 text-center">
            <div className="text-slate-400">Nothing yet.</div>
            <Link
              href="/app/new"
              className="inline-flex mt-4 items-center gap-1.5 px-4 py-2 rounded-[7px] bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] text-black font-semibold text-sm"
            >
              Start your first party
            </Link>
          </div>
        ) : (
          <div className="mt-10 divide-y divide-slate-800/60 rounded-[10px] border border-slate-800 bg-slate-900/40 overflow-hidden">
            {parties.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-900/70 transition-colors"
              >
                <Link href={`/party/${p.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusPill status={p.status} />
                    <span className="text-[12px] font-mono text-slate-500">
                      {p.repoOwner}/{p.repoName}#{p.issueNumber}
                    </span>
                    {p.pickedPersona && (
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-[0.14em]">
                        · picked {p.pickedPersona}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[14px] text-slate-100 truncate">
                    {p.issueTitle}
                  </div>
                </Link>

                <div className="flex items-center gap-4">
                  <span className="text-[12px] font-mono text-slate-500 whitespace-nowrap">
                    {formatDate(p.createdAt)}
                  </span>
                  {p.prUrl && (
                    <a
                      href={p.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[5px] border border-slate-700 text-[11px] hover:border-slate-500"
                    >
                      PR
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
