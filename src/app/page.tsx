'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowUpRight, Github, Terminal, Sparkles, Shield } from 'lucide-react'
import { PERSONAS } from '@/lib/personas'

const PERSONA_ACCENTS: Record<string, string> = {
  hackfix: '#FF6B35',
  craftsman: '#14B8A6',
  'ux-king': '#E879F9',
  defender: '#60A5FA',
  innovator: '#A78BFA',
}

const PERSONA_DESCRIPTIONS: Record<string, string> = {
  hackfix:
    'Smallest diff, zero ceremony. Skips tests unless the issue demands them. You ship before lunch.',
  craftsman:
    'Full types, full coverage, docstrings, named constants. The PR your lead would merge without asking.',
  'ux-king':
    'Loading states, keyboard nav, WCAG 2.2 AA. Considers the first-time user more than the second call.',
  defender:
    'Assumes hostile input. Parameterized, rate-limited, audit-logged. Adds a "Security Considerations" section.',
  innovator:
    'Implements the ask — and hands you 1–2 cherry-pickable bonus commits. Opt-in, non-breaking.',
}

const STEPS = [
  {
    n: '01',
    label: 'PASTE',
    title: 'Drop a GitHub issue URL.',
    body:
      'Public repo, any size. We read the issue, clone the repo into five isolated Daytona sandboxes.',
  },
  {
    n: '02',
    label: 'RACE',
    title: 'Five agents, one problem.',
    body:
      'Claude Opus runs each persona with a different philosophy — in parallel, live-streamed to your screen.',
  },
  {
    n: '03',
    label: 'PICK',
    title: 'Compare. Choose. PR.',
    body:
      'Diff view, live preview, per-file. Click the patch you trust — we open the PR against the source repo.',
  },
]

const STATS = [
  { value: '46%', label: 'of code is AI-written in 2026' },
  { value: '1.7×', label: 'more bugs in AI-generated PRs' },
  { value: '5', label: 'parallel agents per party' },
  { value: '~50¢', label: 'per party, Opus + sandbox' },
]

const FAQS = [
  {
    q: 'How is this different from CodeRabbit?',
    a: 'CodeRabbit reviews one PR that already exists. PatchParty generates five alternatives for you to choose from — different category. One is a gate, the other is a menu.',
  },
  {
    q: 'Does this actually scale cost-wise?',
    a: 'Five Opus calls plus five sandbox-seconds lands around fifty cents per party. An order of magnitude cheaper than a senior engineer review — and the senior still picks.',
  },
  {
    q: 'What if all five agents write similar code?',
    a: 'The personas are adversarial by design. Hackfix would never add auth checks; Defender would never skip validation. In our runs the diffs diverge hard — that is the product.',
  },
  {
    q: 'Do I need to trust an AI with my repo?',
    a: 'Each agent runs in an ephemeral Daytona sandbox, scoped to a shallow clone. Nothing leaves until you pick a winner and click PR — then it is a normal GitHub pull request against a branch you can revert.',
  },
]

export default function HomePage() {
  const router = useRouter()
  const [issueUrl, setIssueUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function startParty() {
    if (!issueUrl.trim()) {
      setError('Paste a GitHub issue URL.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/party/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueUrl }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to start party')
      }
      const { partyId } = await res.json()
      router.push(`/party/${partyId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something broke')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <BrandMark />
            <span className="font-semibold tracking-tight text-[15px]">PatchParty</span>
            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 border border-slate-800 rounded px-1.5 py-0.5 ml-1">
              v0.1 · beta
            </span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-5 text-[13px] text-slate-400">
            <a href="#how" className="hidden sm:inline hover:text-slate-50 transition-colors">How it works</a>
            <a href="#personas" className="hidden sm:inline hover:text-slate-50 transition-colors">Personas</a>
            <a href="#faq" className="hidden sm:inline hover:text-slate-50 transition-colors">FAQ</a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-colors ease-linear"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="text-[12px]">GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-800/60">
        <GridBackground />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 relative">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E879F9] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E879F9]" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-400">
              Live at Factory Berlin · AI Hackday 2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[44px] md:text-[84px] leading-[0.95] font-semibold tracking-[-0.03em] max-w-4xl">
            Five patches.
            <br />
            One click.
            <br />
            <span className="bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] bg-clip-text text-transparent">
              Zero AI slop.
            </span>
          </h1>

          {/* Subhead */}
          <p className="mt-8 text-[17px] md:text-xl text-slate-300 max-w-2xl leading-relaxed">
            In 2026, <span className="text-slate-50">46%</span> of code is AI-written — and those PRs
            carry <span className="text-slate-50">1.7×</span> more bugs. The bottleneck isn&apos;t
            generation anymore. It&apos;s selection.
          </p>
          <p className="mt-4 text-[17px] md:text-xl text-slate-400 max-w-2xl leading-relaxed">
            PatchParty gives you five. Five Claude agents, five philosophies, five pull requests —
            in parallel, in sandboxes, in under three minutes. You pick the winner.
          </p>

          {/* Form */}
          <div className="mt-12 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">
                Paste a GitHub issue URL to start
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://github.com/user/repo/issues/123"
                value={issueUrl}
                onChange={(e) => setIssueUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startParty()}
                disabled={loading}
                className="flex-1 px-4 py-3.5 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-[7px] text-slate-50 placeholder-slate-600 font-mono text-[13px] focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA]/40 transition-all ease-linear duration-200"
              />
              <button
                onClick={startParty}
                disabled={loading}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] hover:brightness-110 rounded-[7px] font-semibold text-black text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all ease-linear duration-200 whitespace-nowrap"
              >
                {loading ? 'Starting party…' : "Let's Party"}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
            {error && (
              <div className="mt-3 text-red-400 text-[13px] font-mono">{error}</div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500">
              <TrustMark>Claude Opus 4.7</TrustMark>
              <TrustMark>Daytona Sandboxes</TrustMark>
              <TrustMark>~50¢ / party</TrustMark>
              <TrustMark>Public repos only</TrustMark>
            </div>
          </div>

          {/* Persona row (characters, not emoji soup) */}
          <div className="mt-20 pt-10 border-t border-slate-800/60">
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-5">
              The five who show up
            </div>
            <div className="flex flex-wrap gap-3">
              {PERSONAS.map((p) => (
                <div
                  key={p.id}
                  className="group inline-flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-full hover:border-slate-700 transition-all ease-linear duration-200 hover:-translate-y-0.5"
                  style={{ ['--glow' as string]: PERSONA_ACCENTS[p.color] }}
                >
                  <span className="text-lg leading-none transition-[filter] duration-200 group-hover:drop-shadow-[0_0_10px_var(--glow)]">
                    {p.icon}
                  </span>
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: PERSONA_ACCENTS[p.color] }}
                  >
                    {p.name}
                  </span>
                  <span className="text-[12px] text-slate-500">— {p.tagline}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="01" label="How it works" />
          <h2 className="mt-6 text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl">
            Three steps. Three minutes.
            <span className="text-slate-500"> No vibes required.</span>
          </h2>

          <div className="mt-16 grid md:grid-cols-3 gap-px bg-slate-800/60 border border-slate-800/60 rounded-[7px] overflow-hidden">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-slate-950 p-8 md:p-10 min-h-[240px] flex flex-col">
                <div className="flex items-baseline justify-between mb-6">
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500">
                    {s.label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-700">{s.n}</span>
                </div>
                <h3 className="text-2xl font-semibold tracking-[-0.01em] mb-3">{s.title}</h3>
                <p className="text-[15px] text-slate-400 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PERSONAS */}
      <section id="personas" className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="02" label="The cast" />
          <div className="mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-2xl">
              Adversarial
              <span className="text-slate-500"> by design.</span>
            </h2>
            <p className="text-slate-400 max-w-md text-[15px] leading-relaxed">
              Five system prompts, five contradicting philosophies. The code diverges hard — that
              is the feature.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {PERSONAS.map((p) => {
              const accent = PERSONA_ACCENTS[p.color]
              return (
                <div
                  key={p.id}
                  className="group relative bg-slate-900/60 backdrop-blur border border-slate-800 rounded-[7px] p-5 hover:border-slate-700 transition-all ease-linear duration-200 hover:-translate-y-0.5 overflow-hidden"
                  style={{ ['--glow' as string]: accent }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-px opacity-60"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                  />
                  <div className="text-3xl mb-4 transition-[filter] duration-200 group-hover:drop-shadow-[0_0_14px_var(--glow)]">
                    {p.icon}
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-[17px] font-semibold tracking-[-0.01em]" style={{ color: accent }}>
                      {p.name}
                    </h3>
                  </div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-500 mb-3">
                    {p.tagline}
                  </p>
                  <p className="text-[13px] text-slate-400 leading-relaxed">
                    {PERSONA_DESCRIPTIONS[p.id]}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="03" label="Why now" />
          <h2 className="mt-6 text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl">
            Generation is cheap.
            <br />
            <span className="text-slate-500">Selection is the new job.</span>
          </h2>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800/60 border border-slate-800/60 rounded-[7px] overflow-hidden">
            {STATS.map((s) => (
              <div key={s.label} className="bg-slate-950 p-6 md:p-10">
                <div className="text-[44px] md:text-[64px] font-semibold tracking-[-0.04em] leading-none bg-gradient-to-b from-slate-50 to-slate-500 bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="mt-4 text-[12px] text-slate-500 leading-snug max-w-[14ch]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-start gap-3 max-w-2xl">
            <Sparkles className="w-4 h-4 text-[#A78BFA] shrink-0 mt-1" />
            <p className="text-[14px] text-slate-400 leading-relaxed">
              Anthropic shipped their own code-review tool in March because Claude Code produced so
              many PRs that enterprise teams were drowning. The fix isn&apos;t more review — it&apos;s
              more choice, earlier.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="04" label="Reasonable questions" />
          <h2 className="mt-6 text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl">
            The pitch-room
            <span className="text-slate-500"> Q&amp;A.</span>
          </h2>

          <div className="mt-16 grid md:grid-cols-2 gap-x-10 gap-y-10">
            {FAQS.map((f) => (
              <div key={f.q} className="border-t border-slate-800/60 pt-6">
                <div className="flex items-start gap-3">
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#A78BFA] mt-1.5">
                    Q
                  </span>
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{f.q}</h3>
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-600 mt-1.5">
                    A
                  </span>
                  <p className="text-[15px] text-slate-400 leading-relaxed">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-28 md:py-40 text-center relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 60%, rgba(167,139,250,0.18), transparent 60%), radial-gradient(circle at 20% 80%, rgba(232,121,249,0.10), transparent 50%), radial-gradient(circle at 80% 30%, rgba(96,165,250,0.10), transparent 50%)',
            }}
          />
          <div className="relative">
            <div className="flex justify-center gap-3 mb-8">
              {PERSONAS.map((p, i) => (
                <span
                  key={p.id}
                  className="text-3xl animate-pulse-slow"
                  style={{
                    animationDelay: `${i * 0.3}s`,
                    filter: `drop-shadow(0 0 12px ${PERSONA_ACCENTS[p.color]})`,
                  }}
                >
                  {p.icon}
                </span>
              ))}
            </div>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl mx-auto">
              Stop trusting one AI.
              <br />
              <span className="bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] bg-clip-text text-transparent">
                Start choosing between five.
              </span>
            </h2>
            <p className="mt-6 text-slate-400 max-w-lg mx-auto text-[15px]">
              Open an issue URL. Watch five versions of your future compile live. Pick the one you
              would ship.
            </p>
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="mt-10 inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] hover:brightness-110 rounded-[7px] font-semibold text-black text-sm transition-all ease-linear duration-200"
            >
              Throw a party
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-slate-400">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <BrandMark />
              <span className="font-semibold tracking-tight text-[15px] text-slate-50">
                PatchParty
              </span>
            </div>
            <p className="text-[13px] text-slate-500 leading-relaxed max-w-sm">
              A decision interface for the agent era. Built in one day at Factory Berlin for
              AI Builders Berlin Hackday 2026.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-4">
              Product
            </div>
            <ul className="space-y-2.5 text-[13px]">
              <li><a href="#how" className="hover:text-slate-50 transition-colors">How it works</a></li>
              <li><a href="#personas" className="hover:text-slate-50 transition-colors">Personas</a></li>
              <li><a href="#faq" className="hover:text-slate-50 transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-4">
              Built with
            </div>
            <ul className="space-y-2.5 text-[13px]">
              <li>
                <a href="https://anthropic.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-slate-50 transition-colors">
                  Claude Opus <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://daytona.io" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-slate-50 transition-colors">
                  Daytona <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-slate-50 transition-colors">
                  Railway <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/60">
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <Shield className="w-3.5 h-3.5" />
              <span>MIT License · Public repos only · {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-50 transition-colors inline-flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5" />
                github
              </a>
              <span>·</span>
              <span>Choose your patch. Skip the vibe.</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

/* ------------ local helpers ------------ */

function BrandMark() {
  return (
    <span
      aria-hidden
      className="relative inline-flex w-7 h-7 items-center justify-center rounded-[7px] border border-slate-800 bg-slate-900/60 backdrop-blur overflow-hidden"
    >
      <span
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'conic-gradient(from 210deg at 50% 50%, #FF6B35, #E879F9, #A78BFA, #60A5FA, #14B8A6, #FF6B35)',
          filter: 'blur(6px)',
        }}
      />
      <span className="relative text-[11px] font-bold tracking-tighter text-slate-50">
        PP
      </span>
    </span>
  )
}

function SectionEyebrow({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-mono text-slate-600">{num}</span>
      <span className="h-px w-8 bg-slate-800" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
    </div>
  )
}

function TrustMark({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 before:content-[''] before:w-1 before:h-1 before:rounded-full before:bg-slate-700">
      {children}
    </span>
  )
}

function GridBackground() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none opacity-[0.35]"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        maskImage:
          'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
      }}
    />
  )
}
