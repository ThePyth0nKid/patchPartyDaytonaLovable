import { redirect } from 'next/navigation'
import { Github, Link2 } from 'lucide-react'
import { auth, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/app-shell'
import { Hairline } from '@/components/ui/hairline'
import { DAILY_PARTY_LIMIT, loadUsage } from '@/lib/usage'

export const metadata = { title: 'Settings — PatchParty' }

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/app/settings')

  const [account, usage] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: session.user.id, provider: 'github' },
      select: { scope: true, providerAccountId: true },
    }),
    loadUsage(session.user.id),
  ])

  async function signOutAction() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  return (
    <AppShell active="settings">
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300 mb-4">
          Settings
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.02em]">Account</h1>

        <div className="mt-10 relative rounded-[10px] border border-slate-800 bg-slate-900/60 p-7 overflow-hidden">
          <Hairline className="absolute inset-x-0 top-0" />
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> GitHub connection
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Github className="w-5 h-5" />
                <div>
                  <div className="font-semibold tracking-tight">
                    {session.user.githubLogin ?? session.user.name ?? 'connected'}
                  </div>
                  <div className="text-[12px] font-mono text-slate-500">
                    {account?.scope ?? 'scope unknown'}
                  </div>
                </div>
              </div>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="px-3.5 py-2 rounded-[7px] border border-slate-700 hover:border-slate-500 text-[13px]"
              >
                Sign out &amp; disconnect
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 rounded-[10px] border border-slate-800 bg-slate-900/60 p-7">
          <div className="text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-slate-400">
            Usage · today
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight">{usage.partiesToday}</span>
            <span className="text-slate-500">/ {DAILY_PARTY_LIMIT} parties</span>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#14B8A6] to-[#60A5FA]"
              style={{
                width: `${Math.min(100, (usage.partiesToday / DAILY_PARTY_LIMIT) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-4 text-[12.5px] text-slate-400 max-w-md">
            Free tier cap. Resets every midnight UTC. A paid tier with higher limits is on the
            roadmap — we&apos;ll email you when it&apos;s live.
          </p>
        </div>

        <p className="mt-10 text-[12px] text-slate-500">
          {usage.partiesTotal} parties all-time.
        </p>
      </section>
    </AppShell>
  )
}
