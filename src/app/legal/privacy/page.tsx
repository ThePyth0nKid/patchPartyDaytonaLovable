import Link from 'next/link'

export const metadata = { title: 'Privacy — PatchParty' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="text-[12px] font-mono uppercase tracking-[0.18em] text-slate-400 hover:text-slate-100"
        >
          ← PatchParty
        </Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.02em]">
          Privacy
        </h1>
        <p className="mt-4 text-[12px] font-mono text-slate-500">
          Last updated 2026-04-18
        </p>

        <div className="mt-10 space-y-6 text-[14px] text-slate-300 leading-relaxed">
          <Section title="Data we store">
            Your GitHub identifier and avatar, the OAuth access token
            (encrypted at rest), the issue title/body/URL for each party you
            launch, the files and summaries each agent produces, and an
            aggregate usage counter. Nothing more.
          </Section>

          <Section title="Third parties">
            <ul className="list-disc list-inside space-y-1">
              <li>GitHub — for authentication and repo/issue access.</li>
              <li>Anthropic — Claude runs on their API; prompts include issue text and per-persona system prompts.</li>
              <li>Daytona — hosts the ephemeral build sandboxes.</li>
              <li>Railway — hosts this application and its Postgres database.</li>
            </ul>
          </Section>

          <Section title="Cookies">
            One first-party session cookie set by Auth.js. No trackers, no ads,
            no analytics SDKs.
          </Section>

          <Section title="Retention & deletion">
            Party history is retained so you can find your old PRs. Request
            deletion any time at{' '}
            <a
              href="mailto:hello@patchparty.dev?subject=Delete my PatchParty data"
              className="underline hover:text-slate-100"
            >
              hello@patchparty.dev
            </a>
            .
          </Section>

          <Section title="Contact">
            <a
              href="mailto:hello@patchparty.dev"
              className="underline hover:text-slate-100"
            >
              hello@patchparty.dev
            </a>
          </Section>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[12px] font-mono font-medium uppercase tracking-[0.18em] text-slate-100">
        {title}
      </h2>
      <div className="mt-2 text-slate-400">{children}</div>
    </section>
  )
}
