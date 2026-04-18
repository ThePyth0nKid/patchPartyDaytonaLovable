# PatchParty 🎉

**Choose your patch. Skip the vibe.**

Paste a GitHub issue URL → 5 AI agents implement it **in parallel** inside isolated Daytona sandboxes, each with a distinct engineering philosophy. You inspect the live previews side-by-side and pick the one that matches your taste. One click turns it into a PR.

Built in one hackday at **AI Builders Berlin**.

- **Live app:** https://patchparty-production.up.railway.app
- **Source:** https://github.com/ThePyth0nKid/patchPartyDaytonaLovable
- **Demo issues:** see [`demo-issues.md`](./demo-issues.md)

---

## Why it exists

46 % of production code is AI-generated, bugs are up 1.7×, and *every* Claude gives the same answer to the same prompt. "Trust one AI" is a monoculture problem.

PatchParty turns that into a **choice**: five opinionated personas, five different solutions, one you. The AI writes, the human selects.

---

## The 5 personas

Each is a distinct philosophy, not just a prompt tweak. They live in [`src/lib/personas/index.ts`](./src/lib/personas/index.ts) — the soul of the product.

| | Persona | Philosophy | Typical output |
|---|---|---|---|
| 🔨 | **Hackfix** | Ship it. | Minimal diff, no tests, no comments |
| 🧱 | **Craftsman** | Make it proud. | Typed, tested, documented, edge cases |
| 🎨 | **UX-King** | Users first. | Loading/error states, a11y, micro-animations |
| 🛡 | **Defender** | What if attacked? | Input validation, rate-limits, audit-log |
| 💡 | **Innovator** | What if we went further? | Base impl + 2 bonus features |

---

## How one "party" works

```
┌─────────┐     paste issue     ┌────────────────┐
│  user   │ ──────────────────▶ │  /api/party/   │
└─────────┘                     │     start      │
      ▲                         └────────┬───────┘
      │ SSE (live status)                │
      │                                  │  fires 5 runAgent() in parallel
      │                                  ▼
┌─────┴─────┐  ┌───────────────────────────────────┐
│ /party/id │  │  Per persona:                     │
│  (React)  │  │  ┌──────────────────────────────┐ │
└───────────┘  │  │  Daytona sandbox (new)       │ │
      │        │  │  ├─ git clone repo           │ │
      │ click  │  │  ├─ read code for context    │ │
      │        │  │  ├─ Claude Opus 4.7 w/persona│ │
      │        │  │  ├─ write files              │ │
      │        │  │  ├─ npm install + `dev`      │ │
      │        │  │  ├─ getPreviewLink(3000)     │ │
      │        │  │  └─ git push branch          │ │
      │        │  └──────────────────────────────┘ │
      ▼        └───────────────────────────────────┘
┌───────────────────────────────────────────────────┐
│ Compare modal — iframe → /api/preview proxy       │
│   └─ strips Daytona warning, rewrites paths,      │
│      stubs Vite HMR → no-flicker live preview     │
└───────────────────────────────────────────────────┘
      │
      │ "Pick this one"
      ▼
┌────────────┐
│ /api/party/│   octokit.pulls.create({ head: branch })
│   /pr      │ ─────────────────────────────────────▶  PR on target repo
└────────────┘
```

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                          # Home (paste URL)
│   ├── party/[id]/page.tsx               # Live party view + compare modal
│   └── api/
│       ├── party/
│       │   ├── start/route.ts            # create party, spawn 5 agents
│       │   ├── [id]/stream/route.ts      # SSE status updates
│       │   └── [id]/pr/route.ts          # create PR via Octokit
│       ├── preview/
│       │   └── [target]/[[...path]]/     # stateless proxy to Daytona sandboxes
│       └── sandbox/cleanup/route.ts      # deletes sandboxes on tab close
└── lib/
    ├── personas/index.ts                 # THE CORE — 5 philosophies + prompts
    ├── agent.ts                          # Daytona + Claude orchestration
    ├── store.ts                          # in-memory party state + pub/sub
    ├── types.ts                          # shared types
    └── github/index.ts                   # Octokit helpers (fetch issue, create PR)
```

### Key design choices

- **Postgres + Prisma.** Parties survive container restarts; per-user history and usage counters.
- **Auth.js v5.** GitHub OAuth App, per-user tokens stored on `Account`. No shared PAT in production.
- **SSE, not WebSocket.** Simpler, proxy-friendly, works on Railway out of the box.
- **Hybrid party store.** In-memory pub/sub for live SSE subscribers + synchronous DB writes on every update, so state survives a cold start.
- **One Next.js app.** Single Railway deploy, no CORS hell, no service-mesh ceremony.
- **Stateless preview proxy.** The iframe URL encodes `{sandboxUrl, token}` in base64url — no server-side lookup, survives container restarts, load balancers, anything.

---

## The preview-proxy quirk (most interesting 30 minutes of this build)

Daytona gives each sandbox a URL like `https://3000-<sandboxId>.daytonaproxy01.net`. Embedding that directly in an iframe breaks in *five* ways. The route at `src/app/api/preview/[target]/[[...path]]/route.ts` fixes each:

1. **Interstitial warning page.** Daytona shows a "you are about to visit" splash by default. Proxy sets header `x-daytona-skip-preview-warning: true` — gone.
2. **Browser can't set custom headers on iframes.** So the token (`x-daytona-preview-token`) gets encoded into the proxy path by the client and attached server-side.
3. **Absolute path resolution.** Vite dev HTML contains `<script src="/@vite/client">`. In an iframe at `patchparty.railway.app/api/preview/...`, that `/…` resolves to our domain, not the sandbox. The proxy rewrites every `"/foo"` / `'/foo'` / `` `/foo` `` in HTML, JS, and CSS bodies to `"/api/preview/<target>/foo"`.
4. **Wrong content-types.** Daytona's edge returns `text/html` for `.svg`, `/@vite/client`, etc. The proxy fixes by path-extension, **and** body-sniffs (`import …` prefix → `application/javascript`) because Vite serves CSS as JS modules.
5. **HMR reload loop.** Vite's client opens a WebSocket to the page origin; Railway has no WS endpoint; the client gives up, polls, thinks the server came back, calls `location.reload()` → iframe flickers forever. The proxy short-circuits `/@vite/client` with a stub that exports every name react-refresh and CSS modules import, but none of them do anything.

If you're ever embedding Daytona sandboxes in an iframe on your own domain, start from that route file.

---

## Tech stack

- **Next.js 15** (App Router, Server Components, Route Handlers, SSE)
- **React 19 RC** (needs `legacy-peer-deps=true` for `@monaco-editor/react`)
- **Claude Opus 4.7** for code generation · **Claude Haiku 4.5** for summaries
- **Daytona SDK 0.20.2** for sandboxes
- **Octokit** for GitHub (issues + PRs)
- **Tailwind CSS** for styling
- **Railway** for hosting · **Cloudflare** for the custom domain (`patchparty.xyz`, optional)

---

## Local setup

```bash
# 1. Clone
git clone https://github.com/ThePyth0nKid/patchPartyDaytonaLovable
cd patchPartyDaytonaLovable

# 2. Env vars — copy .env.example and fill in
cp .env.example .env.local
# Model + sandbox:  ANTHROPIC_API_KEY  DAYTONA_API_KEY  DAYTONA_TARGET
# Database:         DATABASE_URL  (Postgres — Railway plugin or local docker)
# Auth:             AUTH_SECRET  AUTH_GITHUB_ID  AUTH_GITHUB_SECRET  AUTH_URL
# Cron:             CRON_SECRET

# 3. Install (postinstall auto-generates the Prisma client)
npm install --legacy-peer-deps

# 4. Migrate the database
npm run db:migrate            # creates tables in the DB pointed to by DATABASE_URL

# 5. Run
npm run dev                   # → http://localhost:3000
```

### GitHub OAuth App setup

1. Open <https://github.com/settings/developers> → **OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name:** PatchParty (local)
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Generate a client secret; put the ID + secret into `.env.local` as
   `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`.
4. For production, create a second OAuth App with your Railway domain as the
   homepage + callback (`https://<your-domain>/api/auth/callback/github`).

### Required env vars

| Var | Where to get | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Claude API key |
| `DAYTONA_API_KEY` | [app.daytona.io](https://app.daytona.io) → API Keys | Sandbox provisioning |
| `DAYTONA_TARGET` | `eu` / `us` / `asia` | Must match your Daytona org region |
| `DATABASE_URL` | Railway Postgres plugin | Full `postgresql://…` URL |
| `AUTH_SECRET` | `openssl rand -base64 32` | Used to sign session JWTs |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App | See section above |
| `AUTH_URL` | set per environment | e.g. `https://patchparty.xyz` in prod |
| `CRON_SECRET` | `openssl rand -hex 32` | Shared secret for `/api/cron/*` |
| `GITHUB_TOKEN` | *(optional fallback only)* | Leave empty in production |
| `NEXT_PUBLIC_APP_URL` | set after first deploy | Only public-facing env var |

---

## Deployment (Railway)

Currently deployed via CLI:

```bash
npm install -g @railway/cli
railway login
railway init --name patchparty --workspace "<your-workspace>"
railway link
# set env vars in dashboard or:
railway variables --set "ANTHROPIC_API_KEY=..." --skip-deploys
# ...etc for the other 4 vars...
railway up --detach
railway domain                  # generate *.up.railway.app
```

To wire auto-deploy-on-push: Railway dashboard → service → **Settings → Source → Connect Repo**. (No CLI command for this yet.)

---

## Known gaps (owned, not hidden)

- **TS checks disabled in production build** (`next.config.js`). Daytona SDK 0.20 → 0.167 is 147 minor versions of API drift; fixing every mismatch was out of scope for the hackday. `agent.ts` works at runtime; types don't match.
- **SDK is pinned to 0.20.2.** Upgrading unlocks signed preview URLs and would eliminate most of the proxy acrobatics — but breaks the agent in ways we didn't want to debug under a pitch deadline.
- **"Create PR" uses sandbox push.** `git push` from inside the Daytona sandbox using the GitHub PAT. Works for public target repos where the token owner has push access. No conflict resolution yet.
- **No codebase-semantic-context.** Agents see the first N files, not the ones most relevant to the issue. Post-hackathon: embeddings + RAG.
- **In-memory party store.** Survives within one Railway container. Container restart → orphaned sandboxes (they auto-stop after 15 min).
- **Only tested against Vite/React repos.** The proxy rewriting assumes Vite dev-server conventions. Next.js / Astro / SvelteKit dev servers will probably need tweaks.

---

## Pitch flow (90 seconds)

1. **0-12s · Hook** — "46 % of production code is AI-generated. Bugs are up 1.7×. Every Claude gives the same answer. That's a monoculture."
2. **12-25s · Solution** — "PatchParty runs five opinionated engineers in parallel. You see what they each build, live. You pick."
3. **25-70s · Live demo** — paste an issue, watch five cards go green, open two side-by-side, click "Pick UX-King".
4. **70-90s · Close** — PR URL on screen. "Not replacing judgement. Restoring it. [patchparty.xyz](https://patchparty.xyz)."

Full list of pre-prepared demo issues: [`demo-issues.md`](./demo-issues.md).

---

## License

MIT. Built fast at AI Builders Berlin.
