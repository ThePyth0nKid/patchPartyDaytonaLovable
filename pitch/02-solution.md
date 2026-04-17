# The Solution — Five patches, one click

## The core idea

Give the developer **five pull requests to choose from**, not one to accept or reject.

PatchParty runs five Claude Opus 4.7 agents in parallel, each with a **distinct engineering philosophy** baked into its system prompt. Each agent works in its own isolated Daytona sandbox — clones the target repo, reads code for context, implements the issue, installs dependencies, boots a live dev server, and pushes a git branch.

The user sees all five live previews side by side. Picking one opens a pull request against the original repository in a single click.

## What the user experiences

1. **Paste a GitHub issue URL** on the landing page.
2. **Five cards appear**, one per persona, streaming live status updates via SSE (Server-Sent Events) — *spinning up sandbox* → *cloning* → *reading codebase* → *thinking* → *writing files* → *installing* → *live preview*.
3. **Each card becomes an iframe** with a real, running dev server — the user can click through the rendered feature as it would exist after the merge.
4. **Compare two side by side** in a modal: diff view, live preview, per-file browsing.
5. **Click "Pick this one."** PatchParty opens the PR against the source repo via Octokit. Branch name, commit message, PR body — all generated.

From paste to PR: about three minutes.

## Why this beats "one smarter AI"

- **You compare, you do not guess.** Seeing Hackfix's 8-line diff next to Defender's 60-line fortified implementation tells you instantly what trade-off you are accepting.
- **The personas are adversarial by design.** Hackfix would never add rate-limiting; Defender would never ship without input validation. The diffs diverge hard — that *is* the product.
- **The model writes. The human chooses.** No more pretending the model is also the architect.

## Why this beats "a better review tool"

Code review is a *gate*. It says "yes or no" to one artifact that already exists. PatchParty is a *menu*. It shows several artifacts before any one of them is final. Different category, different moment in the workflow, different job.

## Why this is possible now (and was not in 2024)

Three things had to be true at the same time:

1. **Models good enough to implement a small-to-medium issue end-to-end** (Claude Opus 4.7, released 2025).
2. **Per-agent sandboxing that provisions in seconds** (Daytona's ephemeral dev-containers with auto-stop).
3. **Live-preview iframes that survive CORS, HMR, and auth** (our stateless proxy — see architecture doc).

Without all three, parallel agents-with-previews was a research demo, not a product. In 2026 it is a weekend project.

## What the user does not see (and does not have to)

- Five separate Anthropic API calls, each with a different system prompt.
- Five Daytona sandboxes, each running `git clone --depth 1`, `npm install`, `npm run dev` concurrently.
- A stateless proxy rewriting absolute asset paths, stubbing Vite HMR, and stripping Daytona's interstitial warning so the iframe just works.
- An in-memory pub/sub store streaming status events to the browser over SSE.
- Octokit creating a real pull request on a real repository when the user picks a winner.

To the user, it is "paste, wait 3 minutes, click." That is the point.

## The emotional shift

Using a single AI feels like trust-falling. You hope the answer is good.
Using PatchParty feels like choosing. You see what you are choosing between.

That shift — from **trust to taste** — is what makes AI-assisted engineering feel like engineering again.
