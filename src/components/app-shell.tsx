import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandMark } from '@/components/ui/brand-mark'
import { auth, signOut } from '@/auth'

interface AppShellProps {
  active?: 'dashboard' | 'repos' | 'new' | 'parties' | 'settings'
  children: ReactNode
}

export async function AppShell({ active, children }: AppShellProps) {
  const session = await auth()
  const login = session?.user?.githubLogin ?? session?.user?.name ?? 'guest'
  const avatar = session?.user?.image

  async function signOutAction() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  const linkCls = (key: AppShellProps['active']) =>
    `text-[13px] transition-colors ${
      active === key ? 'text-slate-50' : 'text-slate-400 hover:text-slate-50'
    }`

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-semibold tracking-tight text-[15px]">PatchParty</span>
          </Link>

          <nav className="flex items-center gap-5">
            <Link href="/app" className={linkCls('dashboard')}>Dashboard</Link>
            <Link href="/app/repos" className={linkCls('repos')}>Repos</Link>
            <Link href="/app/new" className={linkCls('new')}>New party</Link>
            <Link href="/app/parties" className={linkCls('parties')}>Parties</Link>
            <Link href="/app/settings" className={linkCls('settings')}>Settings</Link>

            <span className="h-5 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              {avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  className="w-6 h-6 rounded-full border border-slate-700"
                />
              )}
              <span className="hidden sm:inline text-[12px] font-mono text-slate-400">
                {login}
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-[5px] border border-slate-800 hover:border-slate-700 text-[11px] font-mono uppercase tracking-[0.14em]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      </header>

      {children}
    </div>
  )
}
