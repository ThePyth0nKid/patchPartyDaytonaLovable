# Contributing to PatchParty

Thanks for the interest. PatchParty is MIT-licensed and welcomes contributions — especially new personas, new squads, and preview-proxy adapters for other dev servers.

## Local setup

See the [Local setup](./README.md#local-setup) section of the README. Short version:

```bash
git clone https://github.com/ThePyth0nKid/patchPartyDaytonaLovable
cd patchPartyDaytonaLovable
cp .env.example .env.local   # fill in ANTHROPIC + DAYTONA + GitHub OAuth keys
npm install --legacy-peer-deps
npm run db:migrate
npm run dev                   # http://localhost:3000
```

You need a Postgres instance (local docker is fine), an Anthropic API key, a Daytona API key, and a GitHub OAuth App. Parties will fail without all four — the rest is styling.

## Before you open a PR

1. **Run type check and lint.** `npx tsc --noEmit` and `npm run lint`. TS errors in experimental WIP areas (BYOK, chat) are pre-existing and fine; don't add new ones in stable paths.
2. **Don't commit secrets.** `.env.local` is gitignored — keep it that way. Never paste keys into code or PR descriptions.
3. **Test one party end-to-end.** Sign in, pick an issue, watch the five agents run, click Pick, verify the PR opens on the target repo. If your change touches the agent loop, preview proxy, or Daytona sandbox code, this is non-negotiable.
4. **Small PRs.** One concern per PR. The maintainer reviews faster than you can write the next one.

## Adding a new persona

Personas live in [`src/lib/personas/index.ts`](./src/lib/personas/index.ts). To add one:

1. Pick a squad (Frontend, Backend, Security, Fullstack, Bug-Fix, Infrastructure, Philosophy) or propose a new squad first.
2. Copy the shape of an existing persona in that squad — `id`, `name`, `tagline`, `color`, `icon` (Lucide icon), `systemPrompt`.
3. The `systemPrompt` is the whole product. Make it a real philosophy, not a prompt tweak. If the diff looks like a reworded version of an existing persona, it is not ready.
4. Add a short entry to the README persona table if it is a Philosophy persona.

## Adding a new squad

Squads live alongside personas. You need:
- Five persona entries with the new `squadId`
- An orchestrator rule so Haiku knows when to pick this squad (see `src/lib/orchestrator.ts`)
- A squad badge in the landing page `SQUADS_DISPLAY` constant

Open an issue first — squad additions are a product decision, not just a code decision.

## Commit style

Conventional commits. `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`. Keep the subject under 72 chars. Body is optional but appreciated for non-obvious changes.

## Code of conduct

Be decent. Disagreements are welcome; contempt is not. The maintainer has sole discretion on what crosses the line.

## Questions

Open a GitHub Discussion, or email `nelson@ultranova.io`.
