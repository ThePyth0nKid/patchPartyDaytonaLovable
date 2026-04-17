# PatchParty 🎉

**Choose your patch. Skip the vibe.**

Five parallel AI agents implement your GitHub issue — each with a different philosophy. You pick the winner.

Built in 5 hours at AI Builders Berlin AI Hackday.

---

## 🚀 Setup (15 minutes, at the event)

### 1. Paste this skeleton into your working directory

```bash
# This repo is your skeleton. Don't push anything until 10:30 at the event.
cd patchparty
```

### 2. Get the three API keys

**Anthropic** — https://console.anthropic.com → Settings → API Keys → new key
**Daytona** — https://app.daytona.io → sign up (GitHub login) → Dashboard → API Keys → new key
**GitHub Personal Access Token** — https://github.com/settings/tokens → Generate new token (classic) → scopes: `repo`, `workflow`

### 3. Fill in `.env.local`

```bash
cp .env.example .env.local
# edit .env.local with your keys
```

### 4. Install + run

```bash
npm install
npm run dev
# open http://localhost:3000
```

### 5. Test the happy path

- Pick a small issue from one of your public repos (or create one: "Add a hello endpoint")
- Paste URL
- Watch 5 agents work
- Pick winner → PR gets created

### 6. Deploy to Railway

```bash
# New Railway project → from GitHub repo (after you push at 10:30)
# Set env vars in Railway dashboard
# Deploy
```

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── page.tsx                  # Home (input URL)
│   ├── party/[id]/page.tsx       # Live party view + compare
│   └── api/
│       └── party/
│           ├── start/route.ts    # Creates party, spawns 5 agents
│           ├── [id]/stream/      # SSE live updates
│           └── [id]/pr/          # Create PR on GitHub
└── lib/
    ├── personas/index.ts         # The 5 personality definitions (THE CORE!)
    ├── agent.ts                  # Daytona + Claude per sandbox
    ├── store.ts                  # In-memory party state + pub/sub
    ├── types.ts                  # Party, AgentState, events
    └── github/index.ts           # Octokit helpers
```

### Key design choices

- **No database.** In-memory store. 5h hackathon reality.
- **SSE not WebSocket.** Simpler, reliable, works through any proxy.
- **One Next.js app.** Single Railway deploy, no CORS hell.
- **GitHub PAT not OAuth.** Saves ~45 minutes of auth-flow work. Swap post-hackathon.
- **In-memory is fine because parties are ephemeral.** Post-hackathon → Redis.

---

## 🎭 The 5 Personas

These are the heart. Each is a distinct **philosophy**, not just a prompt tweak.

| Persona | Philosophy | Output Character |
|---|---|---|
| 🔨 Hackfix | Ship it. | Minimal diff, no tests |
| 🧱 Craftsman | Make it proud. | Typed, tested, documented |
| 🎨 UX-King | Users first. | Polish, a11y, edge cases |
| 🛡 Defender | What if attacked? | Validated, logged, secured |
| 💡 Innovator | What if we went further? | Base + 2 bonus features |

Edit them in `src/lib/personas/index.ts` — that's where the product lives.

---

## ⚠️ Known Gaps (things to acknowledge in Q&A, not hide)

- **Branch is in sandbox, not pushed.** The "Create PR" button assumes the branch exists on GitHub. For hackathon: you can demo the full flow including PR creation by pushing from the sandbox first (not implemented in skeleton). Alternative: demo shows the diffs, PR-creation is "coming in v2".
- **No test-runner.** Agents commit without running tests. Add `npm test` in sandbox.exec for full Craftsman experience.
- **No codebase-semantic-context.** Agents see first 10 files, not the ones most relevant to the issue. Post-hackathon: embeddings + RAG.
- **Claude Opus 4.7 only.** No model-mix for diversity. Could try mixing Sonnet for Hackfix (faster) and Opus for Craftsman.

Owning these in the pitch shows maturity. Don't pretend they don't exist.

---

## 🎤 Pitch-Script Reference

0-12s: Hook (stats: 46% AI code, 1.7× bugs, Anthropic's own review-tool)
12-25s: Solution (one sentence)
25-70s: Live demo (paste issue, watch 5 agents, pick one)
70-90s: Vision + URL + thank

See `/docs/patchparty_prd.md` for full script.

---

## 📜 License

MIT — built fast at the Factory Berlin.
