# PatchParty

**Choose your patch. Skip the vibe.**

[![MIT License](https://img.shields.io/badge/license-MIT-slategray)](./LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](./CONTRIBUTING.md)

Paste a GitHub issue. Five AI agents with different personalities each build a fix, in parallel, in isolated sandboxes. You watch them race, compare the live previews, and pick the one you'd actually ship. One click turns it into a PR.

That's the whole product.

It came out of a one-day hackathon at AI Builders Berlin 2026. Somewhere around the fourth hour I realized the interesting problem in 2026 isn't generating code — Claude does that just fine, 46% of production code is already AI-written — the interesting problem is that every AI gives the same answer. Bugs are up 1.7×. Monoculture. You don't need more generation. You need a menu.

So: a menu. Five opinionated personas, five different solutions, five live previews, one human picking. The AI writes. The human chooses. Both are good at exactly that.

- Try it: **[patchparty.dev](https://patchparty.dev)**
- Pitch flow and day-of notes: [HACKDAY.md](./HACKDAY.md)
- A few demo issues to throw at it: [demo-issues.md](./demo-issues.md)

---

## Run it

**Hosted.** Sign in at [patchparty.dev](https://patchparty.dev), pick an issue from your backlog, ~50¢ a party (Claude + sandbox cost pass-through). This is how most people will use it.

**Self-host.** The whole thing is MIT. You need four things: an Anthropic key, a Daytona key, a Postgres instance, and a GitHub OAuth App. Everything else — where it runs, what domain, which personas ship — is yours.

```bash
git clone https://github.com/ThePyth0nKid/patchPartyDaytonaLovable
cd patchPartyDaytonaLovable
cp .env.example .env.local      # comments say where each key comes from
npm install --legacy-peer-deps
npm run db:migrate
npm run dev                     # → http://localhost:3000
```

Hosted tier funds the open source; open source funds the hosted tier. That's the deal.

---

## How a party actually runs

```
paste issue URL
      │
      ▼
┌────────────────┐      Haiku classifies         ┌───────────────────────┐
│ /api/party/    │ ─────────────────────────────▶│  Pick a squad:        │
│     start      │                               │  frontend · backend · │
└────────┬───────┘                               │  security · fullstack │
         │                                       │  · bugfix · infra ·   │
         │  five runAgent() in parallel          │  philosophy (fallback)│
         ▼                                       └───────────────────────┘
┌──────────────────────────────────┐
│  Per persona (x5):               │
│  ├─ Daytona sandbox (new)        │
│  ├─ git clone --depth 1          │
│  ├─ read code for context        │
│  ├─ Opus 4.7 + persona prompt    │
│  ├─ write files                  │
│  ├─ npm install + npm run dev    │
│  ├─ getPreviewLink(3000)         │
│  └─ git push branch              │
└──────────────────────────────────┘
         │
         │  SSE updates stream to the browser the whole time
         ▼
┌───────────────────────────────────────────────┐
│  Five cards turn green. You click two         │
│  side-by-side, poke at the previews, pick.    │
└───────────────────────────────────────────────┘
         │
         │  "Pick this one"
         ▼
    octokit.pulls.create({ head: branch }) ─▶ PR opens on your repo
```

Under three minutes, start to PR. No queues, no webhooks, no Redis. One Next.js app, one Postgres, one Railway container.

---

## The personas are the product

Seven squads. Six of them are specialists tuned for what your issue actually is: Frontend, Backend, Security, Fullstack, Bug-Fix, Infrastructure. Each has five personas with system prompts that genuinely disagree with each other. The Frontend squad pits a Minimalist against a Motion designer against an A11y advocate against a Design-System purist against a Platform-CSS zealot. The code they write looks nothing alike. Good.

The seventh squad is **Philosophy** — the fallback, five generalists that show up when Haiku can't classify cleanly:

| Persona | Philosophy | What they actually write |
|---|---|---|
| **Hackfix** | Ship it. | Minimal diff. No tests. No comments. |
| **Craftsman** | Make it proud. | Types, tests, edge cases, a docstring |
| **UX-King** | Users first. | Loading states, a11y, micro-motion |
| **Defender** | Assume attack. | Input validation, rate limits, audit log |
| **Innovator** | What if we went further? | Base impl + two bonus features nobody asked for |

All of them live in [`src/lib/personas/index.ts`](./src/lib/personas/index.ts). That file, not the framework, is the product. If you fork this, start there.

If all five diffs look the same when you run it, something's wrong. They're supposed to diverge hard.

---

## Stack, short version

Next.js 15 App Router with React 19 RC. Postgres + Prisma for parties and per-user GitHub tokens. Auth.js v5 for OAuth. Anthropic SDK (Opus 4.7 for code, Haiku 4.5 for classification). Daytona SDK for the sandboxes. Octokit for PRs. Tailwind. Railway + Nixpacks. That's it.

No queue. No Redis. No microservices. The "party store" is in-memory pub/sub for live SSE subscribers plus synchronous Postgres writes on every update — so cold-start doesn't lose state, because there's not much state to lose. The iframe preview URL is a base64url-encoded `{sandboxUrl, token}` so the proxy is stateless: it survives container restarts, load balancers, anything.

SSE, not WebSocket. Single Next.js app, not a mesh. Opinions you'll either agree with in five minutes or fight me about on GitHub. Both are fine.

---

## The preview proxy, the best part

This is the part you want to read.

Daytona hands every sandbox a URL like `https://3000-<sandboxId>.daytonaproxy01.net`. Drop that into an iframe on your own domain and it breaks in five distinct ways at once. The fix is one route file — `src/app/api/preview/[target]/[[...path]]/route.ts` — and if you ever embed a Daytona preview in your own UI, start there.

**1. The interstitial.** Daytona shows a "you're about to visit" warning page by default. Send header `x-daytona-skip-preview-warning: true`. Gone.

**2. Iframes can't set custom headers.** Daytona's preview token goes in `x-daytona-preview-token`. The browser won't attach it from an iframe. Workaround: encode it into the proxy path on the client, pull it off and attach it server-side.

**3. Absolute paths resolve wrong.** Vite's dev HTML contains `<script src="/@vite/client">`. Inside an iframe at `patchparty.dev/api/preview/...`, that `/…` resolves to our domain, not the sandbox. Every response body — HTML, JS, CSS — gets a regex rewrite: `"/foo"`, `'/foo'`, `` `/foo` `` all become `"/api/preview/<target>/foo"`.

**4. Content-types lie.** Daytona's edge returns `text/html` for `.svg`, for `/@vite/client`, for half the CSS. Browser refuses to execute JS served as HTML, stylesheet ignored. Fix: set content-type by path extension, *and* body-sniff — if the body starts with `import …`, it's a JS module. Vite serves CSS as JS modules, so that matters.

**5. The HMR reload loop.** Vite's client opens a WebSocket to the page origin. Railway has no WS endpoint at `/api/preview/...`. The client gives up, starts polling, decides the server restarted, calls `location.reload()`. Iframe flickers forever. Fix: short-circuit `/@vite/client` with a stub module that exports every name react-refresh and CSS-modules import (and a bunch more just in case) — all of them no-ops.

Took about thirty minutes. Best thirty minutes of the build.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                          # landing
│   ├── party/[id]/page.tsx               # live party view + compare modal
│   └── api/
│       ├── party/
│       │   ├── start/route.ts            # classify, spawn 5 agents
│       │   ├── [id]/stream/route.ts      # SSE status
│       │   └── [id]/pr/route.ts          # create PR via Octokit
│       ├── preview/[target]/[[...path]]/ # the proxy described above
│       └── sandbox/cleanup/route.ts      # kill sandboxes on tab close
└── lib/
    ├── personas/index.ts                 # 35 personas, 7 squads — the product
    ├── orchestrator.ts                   # Haiku classifier → squad pick
    ├── agent.ts                          # Daytona + Opus runtime
    ├── store.ts                          # in-memory pub/sub + DB writes
    ├── github/index.ts                   # Octokit wrappers
    └── types.ts
```

---

## Local setup, properly

The six-key README above is the short version. Full walkthrough:

```bash
git clone https://github.com/ThePyth0nKid/patchPartyDaytonaLovable
cd patchPartyDaytonaLovable
cp .env.example .env.local
```

Fill in `.env.local`:

| Key | Get it from | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Opus + Haiku usage |
| `DAYTONA_API_KEY` | [app.daytona.io](https://app.daytona.io) → API Keys | Free tier ships with credits |
| `DAYTONA_TARGET` | `eu` / `us` / `asia` | Match your Daytona org region |
| `DATABASE_URL` | Railway Postgres plugin, or local `docker run postgres:16` | Full `postgresql://…` URL |
| `AUTH_SECRET` | `openssl rand -base64 32` | Signs session JWTs |
| `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps | Callback: `http://localhost:3000/api/auth/callback/github` |
| `AUTH_URL` | Your base URL | `http://localhost:3000` locally; set to prod domain in Railway |
| `AUTH_TRUST_HOST` | `true` behind a reverse proxy | Railway, Vercel, anything fronted — Auth.js rejects otherwise |
| `CRON_SECRET` | `openssl rand -hex 32` | Shared secret for `/api/cron/*` |
| `NEXT_PUBLIC_APP_URL` | Public base URL, client-side | Only public env var; defaults to localhost in dev |
| `GITHUB_TOKEN` | *(dev-only fallback)* | Leave empty in production |

Then:

```bash
npm install --legacy-peer-deps   # React 19 RC needs this
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`, sign in with GitHub, throw a party.

### Deploy to Railway

```bash
npm i -g @railway/cli
railway login
railway init --name patchparty
railway link
# set env vars in the Railway dashboard, or:
railway variables --set "ANTHROPIC_API_KEY=..." --skip-deploys
railway up --detach
railway domain                   # → *.up.railway.app
```

For auto-deploy on push, wire it in the Railway dashboard: Service → Settings → Source → Connect Repo. There's no CLI command for that yet.

Other targets work in principle (Vercel, Fly, a Docker container, your own VPS). All you need is Node 20+, a Postgres reachable by `DATABASE_URL`, and a publicly-accessible HTTPS URL for the OAuth callback. No Dockerfile is shipped; a good first contribution.

---

## Known gaps, owned not hidden

There's a version of this README that lists only the wins. This isn't it.

- **TypeScript checks are off in production build.** Daytona SDK drifted 147 minor versions since we pinned it. Types don't match; runtime does. Fix on the post-hackathon list.
- **Daytona SDK pinned to 0.20.2.** Upgrading unlocks signed preview URLs and would delete most of the proxy acrobatics above. It would also break the agent. Unpicked battle.
- **PRs get pushed from inside the sandbox.** `git push` with the user's token. Works for public repos and private repos where the token has push access. No conflict resolution.
- **Agents read the first N files, not the relevant ones.** The brutally simple version. Embeddings + RAG is the obvious upgrade.
- **Party state is in-memory (plus Postgres snapshots).** One Railway container, one process. Restart orphans running sandboxes — Daytona stops them after 15 minutes anyway, but it's untidy.
- **Preview proxy assumes Vite.** Rewrite rules are Vite-shaped. Next.js / Astro / SvelteKit dev servers will want tweaks. Genuinely a good first contribution.
- **next-auth is on v5 beta.** The codebase uses the v5 API. Downgrading to stable v4 would be a rewrite, not a fix. Tracking v5 GA.

---

## The 90-second pitch

If you ever have to explain this in a hackathon room:

> *0–12s.* "46% of production code is AI-generated. Bugs are up 1.7×. Every Claude gives the same answer. That's a monoculture."
>
> *12–25s.* "PatchParty runs five opinionated engineers in parallel. You watch them build, you pick."
>
> *25–70s.* Paste an issue. Five cards turn green. Open two side-by-side. "This one. Pick."
>
> *70–90s.* PR URL on screen. "Not replacing judgement. Restoring it. **patchparty.dev**."

Works. Shipped.

---

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md) has the real answer. Quick version: PRs welcome, small is better than big, and the three most wanted contributions right now are (1) Next.js / Astro / SvelteKit adapters for the preview proxy, (2) new personas — especially ones that genuinely disagree with existing ones, and (3) a Dockerfile so self-hosters don't have to trust Nixpacks.

## Security

Don't file public issues for vulnerabilities. Email `nelson@ultranova.io`. Full scope and SLA in [SECURITY.md](./SECURITY.md).

## License

MIT. See [LICENSE](./LICENSE). Built by [Nelson Mehlis](https://github.com/ThePyth0nKid) at [Ultranova.io](https://ultranova.io) in one day at AI Builders Berlin 2026, then kept going.
