import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AppShell } from '@/components/app-shell'
import { DAILY_PARTY_LIMIT, loadUsage } from '@/lib/usage'
import { NewPartyWizard } from './wizard'

export const metadata = { title: 'New party — PatchParty' }

export default async function NewPartyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/app/new')

  const usage = await loadUsage(session.user.id)

  return (
    <AppShell active="new">
      <section className="max-w-5xl mx-auto px-6 py-14">
        <div className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300 mb-3">
          New party
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.02em]">
          Pick a repo, pick an issue, press go.
        </h1>
        <p className="mt-3 text-slate-400 max-w-xl">
          We only touch branches we create. Nothing merges until you pick a
          patch and open the PR yourself.
        </p>

        <NewPartyWizard
          remaining={usage.remaining}
          dailyLimit={DAILY_PARTY_LIMIT}
        />
      </section>
    </AppShell>
  )
}
