import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/auth'
import { AppShell } from '@/components/app-shell'
import { AddRepoPicker } from './picker'

export const metadata = { title: 'Add repository — PatchParty' }

export default async function AddRepoPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/app/repos/add')

  return (
    <AppShell active="repos">
      <section className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/app/repos"
          className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.16em] text-slate-400 hover:text-slate-100 mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to repos
        </Link>

        <div className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300 mb-3">
          Connect a repository
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em]">
          Pick a repo to activate
        </h1>
        <p className="mt-3 text-slate-400 max-w-xl text-[14px]">
          We&apos;ll only touch branches we create — your main stays clean.
        </p>

        <div className="mt-10">
          <AddRepoPicker />
        </div>
      </section>
    </AppShell>
  )
}
