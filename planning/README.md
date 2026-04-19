# PatchParty — Planning Folder

Strategic planning artifacts for PatchParty post-MVP evolution. Each sub-folder is one release-scope.

## Active

- [`v2.0-chat-iterate/`](./v2.0-chat-iterate/) — Race, Pick, Iterate. Foundation for telemetry-moat + chat-iterate + BYOK.
- [`v2.1-iterate-ux/`](./v2.1-iterate-ux/) — **Post-pick UX redesign.** Cursor/Lovable-style vibe-code flow: per-turn diffs, viewport toggle, control chips, Ship PR. Adversarial-design pass done (architect + red + green + security). Start with `agent-start-prompt.md`.

## Concept (vision-level)

- [`v3.0-studio/`](./v3.0-studio/) — **Studio (Final Cut Pro for Software Production).** Dual-Entry model: Brownfield (today's V2.0) + Greenfield (Brief → new GitHub repo → full pipeline). 3 race-phases, 5 linear. Survives Red-Team round; awaiting Green-Team + ADRs.

## Upcoming

- `v2.1-pro-tier/` — Stripe billing, token-stream, admin dashboard, divergence-score benchmark. (Stub after v2.0 ships.)
- `v2.2-patterns/` — Personal Patterns Library from telemetry data. Requires ≥3k parties.
- `v2.5-greenfield/` — Stories + Stack + Repo-Genesis phases. First Greenfield-entry release. (See `v3.0-studio/00-vision.md` §11.)
- `v3.0-project-agents/` — Repo-bound resident agents. Requires per-repo telemetry.

## Cut (not on roadmap)

- Public Marketplace — no moat, moderation-hell.
- Public Patterns-Sharing — privacy-by-default, private sharing only.

---

See [`../cheerful-nibbling-quail.md`](../../../.claude/plans/cheerful-nibbling-quail.md) (Claude plan file, absolute-path ref) for the consolidated strategic plan spanning v2.0 → v3.0.
