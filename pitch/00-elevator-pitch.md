# PatchParty — Elevator Pitch

## One-liner

**PatchParty turns a GitHub issue into five parallel pull requests — each written by a Claude agent with a distinct engineering philosophy — and lets the human pick the winner.**

## Tagline

*Choose your patch. Skip the vibe.*

## The five-second version

Paste a GitHub issue URL. Five Claude Opus 4.7 agents spin up in five isolated Daytona sandboxes, each cloning your repo and implementing the issue according to a different philosophy. You see five live previews side by side. You click the one that matches your taste. It becomes a real pull request.

## The thirty-second version

In 2026, 46% of production code is AI-generated, and those pull requests carry 1.7× more bugs than human-written code. Every Claude gives the same answer to the same prompt. That is a monoculture problem. PatchParty fixes it by running five adversarial personas in parallel — Hackfix ships the minimum diff, Craftsman writes tests and types, UX-King obsesses over accessibility, Defender validates every input, Innovator ships the feature plus two cherry-pickable bonuses. You stop trusting one AI. You start choosing between five.

## Event context

Built in one hackday at **AI Builders Berlin** (Factory Berlin Mitte, April 2026). Single solo builder. Single Next.js app. Deployed on Railway. Live today.

## Who it is for

- **Solo developers and small teams** drowning in AI-generated PRs from Claude Code, Cursor, and co-pilots.
- **Engineering leads** who want to see design alternatives before committing.
- **Anyone shipping with AI** who has felt the loss of taste in a one-answer workflow.

## What it is not

- Not a code-review tool. CodeRabbit reviews a PR that already exists. PatchParty generates five alternatives *before* a PR exists.
- Not an autocomplete. It runs end-to-end: clone, implement, install, boot, preview, commit, push, PR.
- Not a chatbot. The interface is a comparison grid, not a conversation.

## The ask

A decision interface for the agent era. The AI writes. The human selects. That is the whole thesis.
