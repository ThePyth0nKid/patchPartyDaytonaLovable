import Link from 'next/link'

export const metadata = { title: 'Terms — PatchParty' }

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-4 text-[12px] font-mono text-slate-500">
          Last updated 2026-04-18
        </p>

        <div className="mt-10 space-y-6 text-[14px] text-slate-300 leading-relaxed">
          <Section title="1. What PatchParty is">
            PatchParty is a research tool that generates multiple candidate code
            patches for a GitHub issue using Claude agents and sandboxed build
            environments. You review and choose which patch (if any) becomes a
            pull request in your repository.
          </Section>

          <Section title="2. Your account & GitHub access">
            You authenticate with GitHub OAuth. We request only the scopes
            needed to read your issues and push branches you authorize. You can
            disconnect at any time from Settings; we retain party history
            unless you explicitly delete your account.
          </Section>

          <Section title="3. What we do with your code">
            Agents run in ephemeral Daytona sandboxes scoped to a shallow clone
            of the repo you pick. Generated output is sent to Anthropic
            (Claude) and stored in our database so you can review it. We never
            merge, force-push, or modify branches you didn&apos;t ask for.
          </Section>

          <Section title="4. Free tier & limits">
            The free tier is capped at a small number of parties per day.
            Limits exist to keep the service usable and costs predictable. We
            may adjust them with notice in-app.
          </Section>

          <Section title="5. No warranty">
            Patches are AI-generated drafts. You are responsible for reviewing
            and testing them before merging. Nothing here is a warranty of
            fitness for any purpose.
          </Section>

          <Section title="6. Changes">
            We&apos;ll update these terms as the product matures. Material
            changes will be announced in-app.
          </Section>

          <Section title="7. Contact">
            Questions:{' '}
            <a
              href="mailto:hello@patchparty.dev"
              className="underline hover:text-slate-100"
            >
              hello@patchparty.dev
            </a>
            .
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
