import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Github, Shield, GitBranch, Zap } from 'lucide-react'
import { auth, signIn } from '@/auth'
import { BrandMark } from '@/components/ui/brand-mark'

export const metadata = {
  title: 'Sign in — PatchParty',
  description: 'Connect your GitHub account to start a party.',
}

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>

const SCOPES = [
  {
    icon: GitBranch,
    title: 'Read your repos & issues',
    body: 'To list the repos you own or collaborate on, and surface issues you can import into a party.',
  },
  {
    icon: Zap,
    title: 'Push a dedicated branch',
    body: 'When you pick a winning patch, we push a branch like patchparty/craftsman/… and open a pull request you can review and revert.',
  },
  {
    icon: Shield,
    title: 'Never touch main',
    body: 'We only write on the branch we just created. We never force-push and never modify your default branch.',
  },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await auth()
  const { callbackUrl, error } = await searchParams

  if (session?.user) {
    redirect(callbackUrl ?? '/app')
  }

  async function signInWithGithub() {
    'use server'
    await signIn('github', { redirectTo: callbackUrl ?? '/app' })
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans relative">
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-semibold tracking-tight text-[15px]">PatchParty</span>
          </Link>
          <span className="text-[12px] font-mono uppercase tracking-[0.18em] text-slate-400">
            Sign in
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-5 gap-10">
          {/* Left: pitch */}
          <div className="md:col-span-3">
            <div className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300 mb-6">
              Connect GitHub to start
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[0.98] text-glow">
              One sign-in.
              <br />
              <span className="bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] bg-clip-text text-transparent">
                Every repo you own.
              </span>
            </h1>
            <p className="mt-8 text-[17px] text-slate-300 max-w-xl leading-relaxed">
              PatchParty needs access to the issues you want fixed and to open pull requests on
              the repo you pick. Nothing else, nothing sneaky — below is every scope we ask for
              and why.
            </p>

            <div className="mt-12 space-y-5 max-w-xl">
              {SCOPES.map((s) => (
                <div key={s.title} className="flex gap-4 border-l border-slate-800/70 pl-5 py-1">
                  <div className="mt-0.5">
                    <s.icon className="w-4 h-4 text-[#A78BFA]" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-slate-100">{s.title}</div>
                    <p className="text-[13.5px] text-slate-400 leading-relaxed mt-1">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: CTA card */}
          <div className="md:col-span-2">
            <div className="relative rounded-[10px] border border-slate-800 bg-slate-900/60 backdrop-blur p-7 shadow-[0_20px_80px_-20px_rgba(167,139,250,0.2)]">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, #A78BFA, transparent)',
                }}
              />
              <div className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-400 mb-1">
                Continue with
              </div>
              <h2 className="text-xl font-semibold tracking-tight">GitHub</h2>

              <Suspense>
                <form action={signInWithGithub} className="mt-6">
                  <button
                    type="submit"
                    className="group w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] hover:brightness-110 rounded-[7px] font-semibold text-black text-sm transition-all ease-linear duration-200 shadow-[0_8px_32px_-8px_rgba(167,139,250,0.6)] hover:shadow-[0_12px_40px_-8px_rgba(167,139,250,0.8)]"
                  >
                    <Github className="w-4 h-4" />
                    Sign in with GitHub
                  </button>
                </form>
              </Suspense>

              {error && (
                <div className="mt-4 flex items-center gap-2 text-red-300 text-[12.5px] font-mono">
                  <span className="w-1 h-1 rounded-full bg-red-400" />
                  {error === 'OAuthAccountNotLinked'
                    ? 'That GitHub account is linked to another identity.'
                    : 'Sign-in failed. Try again.'}
                </div>
              )}

              <p className="mt-6 text-[12px] text-slate-500 leading-relaxed">
                By continuing you agree to our{' '}
                <Link href="/legal/terms" className="underline hover:text-slate-300">terms</Link>
                {' '}and{' '}
                <Link href="/legal/privacy" className="underline hover:text-slate-300">privacy notice</Link>.
              </p>
            </div>

            <div className="mt-6 text-[12px] font-mono uppercase tracking-[0.18em] text-slate-500">
              Scopes requested: read:user · public_repo · repo
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
