# v2.1 — Iterate-Flow UX Redesign

**Target:** Ship a Cursor/Lovable-style "vibe-code" iterate experience post-pick. User keeps full control, sees per-turn diffs, toggles desktop/mobile preview, ends with a deliberate Ship PR step.

**Nordstern:** "Pick a persona → iterate in chat with live preview + per-turn diffs → Ship PR". No switching winners. No iterate-before-pick. Only the winner's sandbox stays alive.

---

## Read order (for any agent picking this up)

1. [`agent-start-prompt.md`](./agent-start-prompt.md) — the handoff. Copy-paste verbatim into fresh session.
2. [`00-locked-decisions.md`](./00-locked-decisions.md) — non-negotiables from the user. Do not re-litigate.
3. [`01-ux-spec.md`](./01-ux-spec.md) — screen layout, component tree, turn-card spec, viewport toggle, ship flow.
4. [`02-data-model-changes.md`](./02-data-model-changes.md) — Prisma schema + SSE event extensions. **P0 prerequisite for UI.**
5. [`03-tasks.md`](./03-tasks.md) — priority-ordered work with file paths + acceptance criteria.
6. [`04-red-team-findings.md`](./04-red-team-findings.md) — 10 breakage scenarios. Verify fixes against these.
7. [`05-security-checklist.md`](./05-security-checklist.md) — iframe sandbox, XSS, rate limit, CSRF.

## Scope summary

**In scope (v2.1-iterate-ux):**

- `IteratePage` 55/45 split: `PreviewPane` (left, sticky, with `ViewportToggle`) + `TurnColumn` (right, scrollable) + `InputDock` (sticky, 5 chips) + `ShipBar` (sticky footer).
- Per-turn `TurnCard` with file pills (`button.tsx +12/-3`), expandable `DiffDrawer`.
- `ViewportToggle`: Desktop 1280×800 vs. Mobile 390×844 with device frame. Pure client-side CSS.
- Control chips: `Shorter` · `Add tests` · `Run build` · `Mobile-first` · `Undo last`.
- `ShipSheet` with editable PR title/body, diff summary, failure-safe state.
- Undo last turn via new revert commit (never force-push), soft-delete `ChatTurn.status='undone'`.
- **P0 prerequisites:** Postgres advisory lock on chat turn (concurrency), extended `ChatTurn` schema (`commitSha`, `diffStats`, `revertedByTurnIndex`), extended SSE `diff_stats` event.
- **P1 security hardening:** iframe `sandbox` attribute, rate limit on `/chat`, syntax highlighter without `dangerouslySetInnerHTML`, deny-list for secrets files in `read_file`, token leak fix in `agent.ts`.

**Out of scope (defer):**

- Iterate-before-pick (user locked this out)
- Switch winner after pick (user locked this out)
- Multiple personas alive post-pick (only winner; losers killed at pick — already coded, needs parallelization)
- Daily managed-cost cap (ship later as P2)
- CSRF custom-header (ship later unless subdomains added)
- Token-streaming (v2.1-pro)

## Ship Criteria

- [ ] P0 (data model + advisory lock) merged before any UI work starts
- [ ] P1 security hardening complete
- [ ] 5 new/modified endpoints typecheck-green, smoke-tested locally
- [ ] Per-turn diff hydration works for ACTIVE, PAUSED (via GitHub compare fallback), and historic turns
- [ ] Undo last turn round-trip works: click → revert commit → UI updates → message history excludes undone turn
- [ ] Viewport toggle works without reloading iframe (no HMR impact)
- [ ] Ship PR sheet: edit title/body → create PR → link shown → retry on failure
- [ ] Red-team attack scenarios 1-10 explicitly addressed (see `04-red-team-findings.md`)
- [ ] Manual smoke: start party → wait for done → pick → iterate 3 turns with build → undo one → ship PR
- [ ] No regression in v2.0 smoke path (BYOK, cron pause/resume, telemetry writes)

## Status

- Planning: 2026-04-19
- Swarm review: architect + planner + code-reviewer + security-reviewer done
- Sprint 1 (data model + advisory lock): not started
