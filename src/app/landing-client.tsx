'use client'

import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  ArrowUpRight,
  Github,
  Terminal,
  Sparkles,
  Shield,
  Palette,
  Database,
  Link2,
  Search,
  Cloud,
  GitPullRequest,
  FileText,
  Brain,
  Layers,
  MousePointerClick,
  Server,
  Trophy,
} from 'lucide-react'
import { PHILOSOPHY_PERSONAS as PERSONAS } from '@/lib/personas'

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

const STATS = [
  { value: '46%', label: 'of code is AI-written in 2026' },
  { value: '1.7×', label: 'more bugs in AI-generated PRs' },
  { value: '30', label: 'specialists across 6 squads' },
  { value: '~50¢', label: 'per party, Opus + sandbox' },
]

const FAQS = [
  {
    q: 'How is this different from CodeRabbit?',
    a: 'CodeRabbit grades a PR that already exists — one option, thumbs up or thumbs down. PatchParty gives you five options before anything is committed. Different category entirely: one is a gate, the other is a menu.',
  },
  {
    q: 'Does this actually scale cost-wise?',
    a: 'Five Opus calls plus five sandbox-seconds lands around fifty cents per party. That is an order of magnitude cheaper than a senior engineer review — and the senior still picks.',
  },
  {
    q: 'What if all five agents write similar code?',
    a: 'Every squad is built adversarially. Frontend pits a Minimalist against a Motion designer. Security pits OWASP against Zero-Trust. Philosophy — our fallback — runs Hackfix against Defender. You would never hire all five; that is exactly why the diffs diverge.',
  },
  {
    q: 'Wait — five agents, but thirty specialists?',
    a: 'Five agents per party, always. Which five depends on the issue. A CSS regression pulls Frontend — Minimalist, Motion, A11y, System, Platform CSS. A webhook bug pulls Backend. Six squads × five specialists = thirty personas in the roster. Five on the field each run.',
  },
  {
    q: 'Do I need to trust an AI with my repo?',
    a: 'Each agent runs in an ephemeral Daytona sandbox against a shallow clone. Nothing touches your repo until you pick a winner and click PR — at which point it is a normal GitHub pull request against a branch you can revert, review, or ignore.',
  },
  {
    q: 'Can I self-host this?',
    a: 'Yes. The whole thing is MIT. Clone the repo, bring your own Anthropic and Daytona keys, deploy anywhere Next.js runs. Or skip the ops and use the hosted version — same code path, none of the wiring.',
  },
]

type SquadDisplay = {
  id: string
  name: string
  tagline: string
  accent: string
  icon: LucideIcon
  members: readonly string[]
  when: string
}

const SQUADS_DISPLAY: readonly SquadDisplay[] = [
  {
    id: 'frontend',
    name: 'Frontend',
    tagline: 'Five takes on the UI.',
    accent: '#E879F9',
    icon: Palette,
    members: ['Minimalist', 'Motion', 'A11y', 'System', 'Platform CSS'],
    when: 'UI bugs, components, styling, accessibility',
  },
  {
    id: 'backend',
    name: 'Backend',
    tagline: 'Five architectures.',
    accent: '#14B8A6',
    icon: Database,
    members: ['Relational', 'EventBus', 'PureCore', 'Hotpath', 'Contract'],
    when: 'APIs, databases, services, data modeling',
  },
  {
    id: 'security',
    name: 'Security',
    tagline: 'Five threat models.',
    accent: '#60A5FA',
    icon: Shield,
    members: ['OWASP', 'Zero-Trust', 'Compliance', 'Threat-Model', 'Cryptographic'],
    when: 'Auth, input validation, crypto, PII handling',
  },
  {
    id: 'fullstack',
    name: 'Fullstack',
    tagline: 'Five end-to-ends.',
    accent: '#A78BFA',
    icon: Link2,
    members: ['Typed E2E', 'Server First', 'Optimistic UX', 'Realtime Sync', 'Offline First'],
    when: 'Features spanning client and server',
  },
  {
    id: 'bugfix',
    name: 'Bug-Fix',
    tagline: 'Five ways to debug.',
    accent: '#FF6B35',
    icon: Search,
    members: ['Root Cause', 'Regression Guard', 'Minimal Patch', 'Refactor Adjacent', 'Defensive'],
    when: 'Known-broken behaviour with a reproducer',
  },
  {
    id: 'infra',
    name: 'Infrastructure',
    tagline: 'Five deployment styles.',
    accent: '#14B8A6',
    icon: Cloud,
    members: ['Platform', 'Container', 'Serverless', 'Observability', 'DevEx'],
    when: 'CI, deploys, containers, observability',
  },
]

export default function LandingClient() {
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
            <a href="#squads" className="hidden sm:inline hover:text-slate-50 transition-colors">Squads</a>
            <a href="#run-it" className="hidden sm:inline hover:text-slate-50 transition-colors">Self-host</a>
            <a href="#faq" className="hidden sm:inline hover:text-slate-50 transition-colors">FAQ</a>
            <a
              href="https://github.com/ThePyth0nKid/patchPartyDaytonaLovable"
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
          {/* Eyebrow — Hackathon winner badge */}
          <div className="mb-10 flex flex-wrap items-center gap-3">
            <a
              href="https://ai-builders-berlin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#A78BFA]/50 bg-gradient-to-r from-[#E879F9]/10 via-[#A78BFA]/15 to-[#60A5FA]/10 backdrop-blur hover:border-[#A78BFA] transition-colors"
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full opacity-40 group-hover:opacity-70 transition-opacity"
                style={{ background: 'radial-gradient(circle at 30% 50%, rgba(232,121,249,0.35), transparent 60%)' }}
              />
              <Trophy
                className="relative w-3.5 h-3.5 text-[#E879F9] drop-shadow-[0_0_8px_#E879F9]"
                strokeWidth={2}
              />
              <span className="relative text-[11px] font-mono font-semibold uppercase tracking-[0.18em] bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] bg-clip-text text-transparent">
                Winner · AI Builders Hackday Berlin · Apr 2026
              </span>
            </a>
            <span className="hidden sm:inline text-[11px] font-mono font-medium uppercase tracking-[0.18em] text-slate-400">
              Daytona × Lovable · Factory Berlin · 17.04.2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[44px] md:text-[84px] leading-[0.95] font-semibold tracking-[-0.03em] max-w-4xl text-glow">
            Five patches.
            <br />
            One click.
            <br />
            <span className="bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(167,139,250,0.35)]">
              Zero AI slop.
            </span>
          </h1>

          {/* Subhead */}
          <p className="mt-8 text-[17px] md:text-xl text-slate-100 max-w-2xl leading-relaxed">
            Almost half of all code shipped in 2026 is AI-written — and those PRs carry{' '}
            <span className="text-white font-semibold">1.7×</span> more bugs than human ones. The
            bottleneck moved. Writing code is not the hard part anymore; picking which AI-written
            version is actually right is.
          </p>
          <p className="mt-4 text-[17px] md:text-xl text-slate-300 max-w-2xl leading-relaxed">
            PatchParty gives you five at once. Not five generalists riffing on the same prompt —
            five specialists matched to your issue, each in their own sandbox, each with a live
            preview you can click. Three minutes from issue to pick.
          </p>

          {/* CTA */}
          <div className="mt-12 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-3.5 h-3.5 text-slate-300" />
              <label className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300">
                Sign in, pick any open issue, watch five fixes race
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <a
                href="/login"
                className="group relative inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] hover:brightness-110 rounded-[7px] font-semibold text-black text-sm transition-all ease-linear duration-200 whitespace-nowrap shadow-[0_8px_32px_-8px_rgba(167,139,250,0.6)] hover:shadow-[0_12px_40px_-8px_rgba(167,139,250,0.8)]"
              >
                <Github className="w-4 h-4" />
                Sign in with GitHub
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how"
                className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-[7px] border border-slate-700 hover:border-slate-500 text-slate-200 text-sm transition-colors"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-[12.5px] text-slate-400 max-w-md">
              Read-only on your repos. The only thing we ever push is a branch named
              <code className="mx-1 px-1 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px]">patchparty/&lt;issue&gt;</code>
              — and even that does not merge until you click.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-slate-300">
              <TrustMark>1st place · Berlin 04/2026</TrustMark>
              <TrustMark>Claude Opus 4.7</TrustMark>
              <TrustMark>Daytona Sandboxes</TrustMark>
              <TrustMark>~50¢ / party</TrustMark>
              <TrustMark>Open source · MIT</TrustMark>
            </div>
          </div>

          {/* Persona row (characters, not emoji soup) */}
          <div className="mt-20 pt-10 border-t border-slate-800/60">
            <div className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-300 mb-5">
              The fallback — when the issue does not fit a specialist squad
            </div>
            <div className="flex flex-wrap gap-3">
              {PERSONAS.map((p) => {
                const Icon = p.icon
                const accent = PERSONA_ACCENTS[p.color]
                return (
                  <div
                    key={p.id}
                    className="group inline-flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/70 backdrop-blur border border-slate-700 rounded-full hover:border-slate-500 transition-all ease-linear duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_-4px_var(--glow)]"
                    style={{ ['--glow' as string]: accent }}
                  >
                    <Icon
                      className="w-5 h-5 transition-[filter] duration-200 drop-shadow-[0_0_6px_var(--glow)] group-hover:drop-shadow-[0_0_14px_var(--glow)]"
                      strokeWidth={1.75}
                      style={{ color: accent }}
                    />
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: accent, textShadow: `0 0 20px ${accent}40` }}
                    >
                      {p.name}
                    </span>
                    <span className="text-[12px] text-slate-300">— {p.tagline}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="01" label="The flow" />
          <h2 className="mt-6 text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl">
            Watch the party form.
            <span className="text-slate-500"> No vibes required.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] md:text-[16px] text-slate-300 leading-relaxed">
            A lightweight Haiku pass reads the issue and picks the right squad — Frontend, Backend,
            Security, Fullstack, Bug-Fix, Infrastructure, or Philosophy when nothing else fits. Five
            Opus agents fan out into five Daytona sandboxes. You get live previews, side-by-side
            diffs, and a Pick button. Everything else is ceremony.
          </p>

          <WorkflowDiagram />

          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-300">
            <LegendDot label="Classify" hint="~2s · Haiku" />
            <LegendDot label="Fan-out" hint="5 parallel" />
            <LegendDot label="Sandbox boot" hint="~30s · Daytona" />
            <LegendDot label="Preview" hint="live iframe" />
            <LegendDot label="Pick" hint="you choose" />
            <LegendDot label="PR" hint="auto-open" />
          </div>
        </div>
      </section>

      {/* PERSONAS */}
      <section id="personas" className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="02" label="The fallback" />
          <div className="mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-2xl">
              Philosophy
              <span className="text-slate-500"> — when nothing else fits.</span>
            </h2>
            <p className="text-slate-400 max-w-md text-[15px] leading-relaxed">
              When an issue is too abstract or too cross-cutting to route to a specialist squad,
              Philosophy runs. These five contradict each other on purpose. You would never hire
              all of them — which is exactly why seeing their diffs side-by-side makes the call
              obvious.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {PERSONAS.map((p) => {
              const accent = PERSONA_ACCENTS[p.color]
              const Icon = p.icon
              return (
                <div
                  key={p.id}
                  className="group relative bg-slate-900/70 backdrop-blur border border-slate-700/80 rounded-[7px] p-5 hover:border-slate-600 transition-all ease-linear duration-200 hover:-translate-y-1 overflow-hidden"
                  style={{ ['--glow' as string]: accent }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${accent}22, transparent 60%)` }}
                  />
                  <Icon
                    className="w-7 h-7 mb-4 relative transition-[filter] duration-200 drop-shadow-[0_0_8px_var(--glow)] group-hover:drop-shadow-[0_0_18px_var(--glow)]"
                    strokeWidth={1.75}
                    style={{ color: accent }}
                  />
                  <div className="flex items-baseline gap-2 mb-1 relative">
                    <h3
                      className="text-[17px] font-semibold tracking-[-0.01em]"
                      style={{ color: accent, textShadow: `0 0 24px ${accent}40` }}
                    >
                      {p.name}
                    </h3>
                  </div>
                  <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.16em] text-slate-300 mb-3 relative">
                    {p.tagline}
                  </p>
                  <p className="text-[13px] text-slate-200 leading-relaxed relative">
                    {PERSONA_DESCRIPTIONS[p.id]}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* SQUADS */}
      <section id="squads" className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="03" label="The squads" />
          <div className="mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl">
              Not five generalists.
              <span className="text-slate-500"> Five specialists.</span>
            </h2>
            <p className="text-slate-400 max-w-md text-[15px] leading-relaxed">
              The orchestrator reads the issue, then picks the whole squad — not a mix. A CSS
              regression gets five frontend engineers. An auth bug gets five threat models. One
              squad, five takes from inside the same discipline, so the comparison is actually fair.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SQUADS_DISPLAY.map((sq) => {
              const SquadIcon = sq.icon
              return (
              <div
                key={sq.id}
                className="group relative bg-slate-900/70 backdrop-blur border border-slate-700/80 rounded-[7px] p-6 hover:border-slate-600 transition-all ease-linear duration-200 hover:-translate-y-1 overflow-hidden"
                style={{ ['--glow' as string]: sq.accent }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${sq.accent}, transparent)` }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${sq.accent}22, transparent 60%)` }}
                />
                <div className="flex items-start justify-between mb-4 relative">
                  <SquadIcon
                    className="w-7 h-7 transition-[filter] duration-200 drop-shadow-[0_0_8px_var(--glow)] group-hover:drop-shadow-[0_0_18px_var(--glow)]"
                    strokeWidth={1.75}
                    style={{ color: sq.accent }}
                  />
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-500">
                    5 specialists
                  </span>
                </div>
                <h3
                  className="text-[20px] font-semibold tracking-[-0.01em] mb-1 relative"
                  style={{ color: sq.accent, textShadow: `0 0 24px ${sq.accent}40` }}
                >
                  {sq.name}
                </h3>
                <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.16em] text-slate-300 mb-4 relative">
                  {sq.tagline}
                </p>
                <p className="text-[13px] text-slate-400 leading-relaxed mb-4 relative">
                  <span className="font-mono font-semibold uppercase tracking-[0.14em] text-slate-500 text-[10px] mr-2">
                    When
                  </span>
                  {sq.when}
                </p>
                <div className="flex flex-wrap gap-1.5 relative">
                  {sq.members.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono border"
                      style={{
                        color: sq.accent,
                        borderColor: `${sq.accent}55`,
                        background: `${sq.accent}10`,
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              )
            })}
          </div>

          <div className="mt-10 flex items-start gap-3 max-w-2xl">
            <Sparkles className="w-4 h-4 text-[#A78BFA] shrink-0 mt-1 drop-shadow-[0_0_8px_#A78BFA]" />
            <p className="text-[14px] text-slate-400 leading-relaxed">
              Issue too vague for any of the six? Philosophy takes it — five generalists hand-picked
              to disagree with each other.
            </p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="04" label="Why now" />
          <h2 className="mt-6 text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl">
            Generation is cheap.
            <br />
            <span className="text-slate-500">Selection is the new job.</span>
          </h2>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800/60 border border-slate-800/60 rounded-[7px] overflow-hidden">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="group relative bg-slate-950/80 backdrop-blur p-6 md:p-10 transition-colors hover:bg-slate-900/80 overflow-hidden"
              >
                <div
                  aria-hidden
                  className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle, rgba(232,121,249,0.18), transparent 70%)' }}
                />
                <div
                  className="text-[44px] md:text-[72px] font-semibold tracking-[-0.04em] leading-none bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent relative"
                  style={{ textShadow: '0 0 80px rgba(167,139,250,0.12)' }}
                >
                  {s.value}
                </div>
                <div className="mt-4 text-[12px] font-medium text-slate-300 leading-snug max-w-[16ch] relative">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-start gap-3 max-w-2xl">
            <Sparkles className="w-4 h-4 text-[#A78BFA] shrink-0 mt-1 drop-shadow-[0_0_8px_#A78BFA]" />
            <p className="text-[14px] text-slate-300 leading-relaxed">
              Anthropic shipped their own code-review product in March. The reason, per the launch
              post, was that Claude Code PRs were outpacing any team&apos;s ability to review them.
              More review was never going to fix that. More <em>choice</em>, earlier, might.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="05" label="Reasonable questions" />
          <h2 className="mt-6 text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl">
            The pitch-room
            <span className="text-slate-500"> Q&amp;A.</span>
          </h2>

          <div className="mt-16 grid md:grid-cols-2 gap-x-10 gap-y-10">
            {FAQS.map((f) => (
              <div key={f.q} className="border-t border-slate-800/60 pt-6">
                <div className="flex items-start gap-3">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#A78BFA] mt-1.5 drop-shadow-[0_0_8px_#A78BFA80]">
                    Q
                  </span>
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-50">{f.q}</h3>
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400 mt-1.5">
                    A
                  </span>
                  <p className="text-[15px] text-slate-200 leading-relaxed">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DUAL PATH: Self-host vs Hosted */}
      <section id="run-it" className="border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <SectionEyebrow num="06" label="Two ways to run it" />
          <h2 className="mt-6 text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl">
            Open source.
            <span className="text-slate-500"> Self-host, or let us run it.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] md:text-[16px] text-slate-300 leading-relaxed">
            MIT, every line. Clone it, bring your own Anthropic and Daytona keys, deploy anywhere
            Next.js runs. Or let Ultranova host it for you — same agents, same squads, none of the
            Railway + Postgres + OAuth wiring.
          </p>

          <div className="mt-16 grid md:grid-cols-2 gap-5">
            {/* Self-host card */}
            <div className="group relative p-8 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl hover:border-slate-600 transition-all">
              <div className="flex items-center gap-2.5 mb-5">
                <Terminal className="w-5 h-5 text-slate-300" strokeWidth={1.75} />
                <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Self-host
                </div>
              </div>
              <div className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] mb-4">
                Free
                <span className="text-slate-500 text-xl"> — bring your keys</span>
              </div>
              <ul className="space-y-3 text-[14px] text-slate-300">
                <li className="flex items-start gap-2"><span className="text-slate-500">·</span> MIT license, no attribution required</li>
                <li className="flex items-start gap-2"><span className="text-slate-500">·</span> Your Anthropic + Daytona keys, your bill</li>
                <li className="flex items-start gap-2"><span className="text-slate-500">·</span> Runs on Railway, Vercel, Docker, your box</li>
                <li className="flex items-start gap-2"><span className="text-slate-500">·</span> Every persona and squad, nothing gated</li>
              </ul>
              <a
                href="https://github.com/ThePyth0nKid/patchPartyDaytonaLovable"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 text-[14px] font-semibold text-slate-50 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4" />
                Clone the repo
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            {/* Hosted card */}
            <div className="group relative p-8 bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur border border-slate-700 rounded-xl hover:border-[#A78BFA]/60 transition-all overflow-hidden">
              <div
                aria-hidden
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-40 group-hover:opacity-70 transition-opacity"
                style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.25), transparent 70%)' }}
              />
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-5">
                  <Cloud className="w-5 h-5 text-[#A78BFA] drop-shadow-[0_0_8px_#A78BFA]" strokeWidth={1.75} />
                  <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#A78BFA]">
                    Hosted · Managed by Ultranova
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] mb-4">
                  ~50¢
                  <span className="text-slate-500 text-xl"> / party</span>
                </div>
                <ul className="space-y-3 text-[14px] text-slate-200">
                  <li className="flex items-start gap-2"><span className="text-slate-500">·</span> We run the agents, you click Party</li>
                  <li className="flex items-start gap-2"><span className="text-slate-500">·</span> Zero setup — sign in with GitHub, pick an issue</li>
                  <li className="flex items-start gap-2"><span className="text-slate-500">·</span> Usage-based — pay only for parties you run</li>
                  <li className="flex items-start gap-2"><span className="text-slate-500">·</span> Priority support, team features coming</li>
                </ul>
                <a
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] hover:brightness-110 rounded-[7px] font-semibold text-black text-[13px] transition-all ease-linear duration-200 shadow-[0_8px_24px_-8px_rgba(167,139,250,0.6)]"
                >
                  Throw a party now
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <p className="mt-10 text-[13px] text-slate-400 max-w-2xl">
            Same code path on both. Open source funds the hosted tier; the hosted tier funds the
            open source. That is the deal.
          </p>
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
              {PERSONAS.map((p, i) => {
                const Icon = p.icon
                const accent = PERSONA_ACCENTS[p.color]
                return (
                  <Icon
                    key={p.id}
                    className="w-7 h-7 animate-pulse-slow"
                    strokeWidth={1.75}
                    style={{
                      color: accent,
                      animationDelay: `${i * 0.3}s`,
                      filter: `drop-shadow(0 0 12px ${accent})`,
                    }}
                  />
                )
              })}
            </div>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] max-w-3xl mx-auto text-glow">
              Stop trusting one AI.
              <br />
              <span className="bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(167,139,250,0.4)]">
                Start choosing between five.
              </span>
            </h2>
            <p className="mt-6 text-slate-200 max-w-lg mx-auto text-[15px] leading-relaxed">
              GitHub sign-in, one issue from your backlog, three minutes. Five working previews
              side-by-side, and a button to ship the one you would have written yourself.
            </p>
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="mt-10 inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#E879F9] via-[#A78BFA] to-[#60A5FA] hover:brightness-110 rounded-[7px] font-semibold text-black text-sm transition-all ease-linear duration-200 shadow-[0_12px_40px_-8px_rgba(167,139,250,0.7)] hover:shadow-[0_16px_50px_-8px_rgba(167,139,250,0.9)] hover:-translate-y-0.5"
            >
              Throw a party
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-slate-300">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <BrandMark />
              <span className="font-semibold tracking-tight text-[15px] text-slate-50">
                PatchParty
              </span>
            </div>
            <p className="text-[13px] text-slate-300 leading-relaxed max-w-sm">
              A decision interface for the agent era. Built in one day at Factory Berlin for the{' '}
              <span className="text-slate-50 font-medium">AI Builders Hackday 2026</span>
              {' '}— and it won. Daytona × Lovable track, 17.04.2026. Kept alive because the idea
              would not shut up. Open source under MIT — maintained by{' '}
              <a
                href="https://ultranova.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-slate-600 underline-offset-4 hover:text-slate-50 hover:decoration-slate-400 transition-colors"
              >
                Ultranova.io
              </a>
              .
            </p>
          </div>

          <div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-200 mb-4">
              Product
            </div>
            <ul className="space-y-2.5 text-[13px]">
              <li><a href="#how" className="hover:text-slate-50 transition-colors">How it works</a></li>
              <li><a href="#personas" className="hover:text-slate-50 transition-colors">Personas</a></li>
              <li><a href="#squads" className="hover:text-slate-50 transition-colors">Squads</a></li>
              <li><a href="#faq" className="hover:text-slate-50 transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-slate-200 mb-4">
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
                <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-slate-50 transition-colors">
                  Lovable <ArrowUpRight className="w-3 h-3" />
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
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] font-mono text-slate-300">
            <div className="flex items-center gap-3">
              <Shield className="w-3.5 h-3.5" />
              <span>MIT License · {new Date().getFullYear()} Ultranova.io</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://github.com/ThePyth0nKid/patchPartyDaytonaLovable" target="_blank" rel="noopener noreferrer" className="hover:text-slate-50 transition-colors inline-flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5" />
                github
              </a>
              <span>·</span>
              <a href="/legal/terms" className="hover:text-slate-50 transition-colors">Terms</a>
              <span>·</span>
              <a href="/legal/privacy" className="hover:text-slate-50 transition-colors">Privacy</a>
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
      <span className="text-[11px] font-mono font-semibold text-[#A78BFA] drop-shadow-[0_0_6px_#A78BFA80]">
        {num}
      </span>
      <span className="h-px w-10 bg-gradient-to-r from-[#A78BFA] via-slate-700 to-transparent" />
      <span className="text-[12px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-200">
        {label}
      </span>
    </div>
  )
}

function TrustMark({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 before:content-[''] before:w-1 before:h-1 before:rounded-full before:bg-[#A78BFA] before:shadow-[0_0_6px_#A78BFA]">
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

function LegendDot({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] shadow-[0_0_6px_#A78BFA]" />
      <span className="text-slate-200">{label}</span>
      <span className="text-slate-500 normal-case tracking-normal font-sans text-[11px]">· {hint}</span>
    </span>
  )
}

type WorkflowNodeProps = {
  label: string
  title: string
  icon: LucideIcon
  accent: string
  className?: string
  compact?: boolean
}

function WorkflowNode({ label, title, icon: Icon, accent, className = '', compact = false }: WorkflowNodeProps) {
  return (
    <div
      className={`relative bg-slate-900/80 backdrop-blur border border-slate-800/60 rounded-[7px] ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      } ${className}`}
      style={{ ['--glow' as string]: accent }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-center gap-2 relative">
        <Icon
          className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`}
          strokeWidth={1.75}
          style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent})` }}
        />
        <div className="min-w-0">
          <div
            className={`font-mono font-semibold uppercase tracking-[0.18em] ${
              compact ? 'text-[9px]' : 'text-[10px]'
            }`}
            style={{ color: accent }}
          >
            {label}
          </div>
          <div className={`${compact ? 'text-[11px]' : 'text-[12px]'} text-slate-100 font-medium truncate`}>
            {title}
          </div>
        </div>
      </div>
    </div>
  )
}

const WORKFLOW_SQUAD_BADGES: readonly { id: string; icon: LucideIcon; accent: string }[] = [
  { id: 'frontend', icon: Palette, accent: '#E879F9' },
  { id: 'backend', icon: Database, accent: '#14B8A6' },
  { id: 'security', icon: Shield, accent: '#60A5FA' },
  { id: 'fullstack', icon: Link2, accent: '#A78BFA' },
  { id: 'bugfix', icon: Search, accent: '#FF6B35' },
  { id: 'infra', icon: Cloud, accent: '#14B8A6' },
]

const WORKFLOW_AGENTS: readonly { name: string; accent: string }[] = [
  { name: 'Minimalist', accent: '#FF6B35' },
  { name: 'Motion', accent: '#14B8A6' },
  { name: 'A11y', accent: '#E879F9' },
  { name: 'System', accent: '#60A5FA' },
  { name: 'Platform CSS', accent: '#A78BFA' },
]

function WorkflowDiagram() {
  return (
    <div
      className="mt-16 relative bg-slate-950/60 backdrop-blur border border-slate-800/60 rounded-[7px] overflow-hidden"
      aria-label="PatchParty orchestration workflow"
      role="img"
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.25]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(167,139,250,0.10), transparent 70%)',
        }}
      />

      <div className="relative px-5 py-10 md:px-12 md:py-14 flex flex-col items-center gap-6 md:gap-7">
        {/* 1. Pick issue from active repo */}
        <WorkflowNode
          label="01 · Pick"
          title="Issue from your active repo"
          icon={FileText}
          accent="#A78BFA"
        />
        <FlowEdge />

        {/* 2. Orchestrator */}
        <WorkflowNode
          label="02 · Classify"
          title="Claude Haiku reads the issue"
          icon={Brain}
          accent="#E879F9"
        />
        <FlowEdge />

        {/* 3. Squad router with orbiting badges */}
        <div className="relative flex flex-col items-center">
          <WorkflowNode
            label="03 · Route"
            title="Squad router"
            icon={Layers}
            accent="#60A5FA"
          />
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {WORKFLOW_SQUAD_BADGES.map((sq, i) => {
              const Icon = sq.icon
              return (
                <span
                  key={sq.id}
                  className="squad-cycle inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-slate-900/80 font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    color: sq.accent,
                    borderColor: `${sq.accent}55`,
                    background: `${sq.accent}14`,
                    animationDelay: `${i}s`,
                  }}
                >
                  <Icon className="w-3 h-3" strokeWidth={1.75} style={{ color: sq.accent }} />
                  {sq.id}
                </span>
              )
            })}
          </div>
        </div>

        <FlowEdge funnel />

        {/* 4. Fan-out: 5 agents */}
        <div className="w-full max-w-5xl">
          <div className="mb-3 text-center text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-slate-400">
            Five agents · parallel · Claude Opus
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
            {WORKFLOW_AGENTS.map((a, i) => (
              <div
                key={a.name}
                className={`relative ${i >= 3 ? 'hidden md:block' : ''}`}
                style={{ ['--glow-alpha' as string]: `${a.accent}66` }}
              >
                <div
                  className="node-pulse rounded-[7px] bg-slate-900/80 border border-slate-800/60 px-3 py-2.5"
                  style={{ animationDelay: `${i * 0.35}s` }}
                >
                  <div
                    className="text-[9px] font-mono font-semibold uppercase tracking-[0.18em]"
                    style={{ color: a.accent }}
                  >
                    Agent 0{i + 1}
                  </div>
                  <div className="text-[11px] text-slate-100 font-medium truncate">{a.name}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Fan-out to sandboxes */}
          <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
            {WORKFLOW_AGENTS.map((a, i) => (
              <div
                key={a.name}
                className={`relative ${i >= 3 ? 'hidden md:block' : ''}`}
              >
                <div className="relative rounded-[7px] border border-slate-800/60 bg-slate-950/80 overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${a.accent}, transparent)` }}
                  />
                  <div className="px-3 py-2 flex items-center gap-2">
                    <Server
                      className="w-3.5 h-3.5 shrink-0"
                      strokeWidth={1.75}
                      style={{ color: a.accent }}
                    />
                    <span
                      className="text-[9px] font-mono font-semibold uppercase tracking-[0.16em]"
                      style={{ color: a.accent }}
                    >
                      Sandbox
                    </span>
                  </div>
                  <div className="relative h-10 overflow-hidden">
                    <div className="absolute inset-0 preview-shimmer" />
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono uppercase tracking-[0.16em] text-slate-500">
                      preview · live
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="md:hidden mt-2 text-center text-[10px] font-mono text-slate-500">
            · · · and two more
          </div>
        </div>

        <FlowEdge funnel reverse />

        {/* 5. Pick */}
        <WorkflowNode
          label="05 · Pick"
          title="Compare diffs · choose the winner"
          icon={MousePointerClick}
          accent="#A78BFA"
        />
        <FlowEdge />

        {/* 6. PR */}
        <WorkflowNode
          label="06 · Ship"
          title="Pull request opened on GitHub"
          icon={GitPullRequest}
          accent="#14B8A6"
        />
      </div>
    </div>
  )
}

function FlowEdge({ funnel = false, reverse = false }: { funnel?: boolean; reverse?: boolean }) {
  if (funnel) {
    const height = 56
    const width = 360
    const y1 = reverse ? height : 0
    const y2 = reverse ? 0 : height
    return (
      <svg
        aria-hidden
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="max-w-md -my-1"
      >
        <defs>
          <linearGradient id={`edge-grad-${reverse ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => {
          const x2 = (width / 4) * i
          return (
            <line
              key={i}
              x1={width / 2}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={`url(#edge-grad-${reverse ? 'up' : 'down'})`}
              strokeWidth="1.25"
              className="flow-path"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          )
        })}
      </svg>
    )
  }
  return (
    <svg
      aria-hidden
      width="2"
      height="42"
      viewBox="0 0 2 42"
      className="-my-1"
    >
      <defs>
        <linearGradient id="edge-grad-straight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <line
        x1="1"
        y1="0"
        x2="1"
        y2="42"
        stroke="url(#edge-grad-straight)"
        strokeWidth="1.5"
        className="flow-path"
      />
    </svg>
  )
}
