# Locked Decisions — Do Not Re-Litigate

These are product decisions the user already made. An agent picking up this work must treat them as constraints, not propose alternatives.

## From user, verbatim or paraphrased closely

1. **Pick is the hard gate.**
   No iterate-before-pick. User's words: *"zu eins hast du vollkommen recht. Es ist nicht nötig."* Rationale: would require 3 live sandboxes + cost explosion; persona diversity gets muddied if user feeds a favorite early.

2. **No switching winner after pick.**
   User's words: *"will ich nicht switchen können, wenn man sich entschieden hat. Dann braucht man es nicht."* Rationale: final commit is part of the deliberation. Picking is a decision, not a draft.

3. **Terminal verb is "Ship" / "Ship PR".**
   User's words: *"Ja, Schöp ist doch super."* Not "Apply", not "Open PR". Ship conveys finality.

4. **Solve sandbox cost at pick immediately — don't defer.**
   User's words: *"Jetzt schon lösen."* `terminateLosers()` must kill the 2 loser sandboxes at pick time, not at an undefined later moment.

5. **Mobile + Desktop viewport toggle in preview iframe is mandatory.**
   User's words: *"wichtig ist, dass man später dann auch einfach zwischen Mobil- und Desktop-Ansicht wechseln kann."*

6. **Per-turn commit-style diffs, not cumulative side-by-side.**
   Agent proposed this, user did not object. Each turn = a mini-commit with its own diff-set. Scrollable history, expandable per file.

7. **Peek-mode for pre-pick preview validation.**
   Hover/click a persona card before picking → small inline preview iframe, no chat, no state. Just look. Agent proposed, user accepted: *"dann lass uns mit Portal noch mal validieren und überlegen"* (voice transcription — meant Peek).

8. **Multi-team adversarial design (persistent preference).**
   User explicitly wants Red Team / Green Team / Architect / Security swarm rounds for every major feature, not single-agent design. This is a repeatable workflow, not a one-off.

## Corollaries (derived, do not contradict)

- Ship PR is the **only** terminal step after iterate. No "save draft", no "close without PR", no "download patch" alternatives.
- The 3 persona sandboxes do **not** all stay alive post-pick. Only the winner's. Loser sandboxes are destroyed immediately at pick.
- Viewport toggle is **client-side CSS only**. No server-side `?viewport=` param. No iframe `src` change (would kill HMR). Document the honest limitation: the cross-origin iframe's `window.innerWidth` may not re-evaluate — mobile preview is an approximation, not pixel-perfect.
- Undo is **a new revert commit**, not a force-push. PR history shows "user changed mind" honestly. Force-push is forbidden by user policy anyway.
- Chat cap stays at **20 turns per party**. Failed turns still count. No "buy more turns" affordance in v2.1.

## What is still open for agent judgment

These were not explicitly decided — make the reasonable call and commit:

- **Chip set.** Recommendation in `01-ux-spec.md`: `Shorter · Add tests · Run build · Mobile-first · Undo last`. If a better set emerges during implementation, ship it, but document the reason in the commit.
- **Mobile breakpoint behavior for iterate screen itself.** Recommendation: collapse to single column below `md` (768px), preview becomes a collapsible detail or swipeable sheet. Ship whichever feels natural — we're primarily a desktop product.
- **Exact device-frame styling** (rounded corners, border width, notch shape). Ship clean, minimal. No skeuomorphic iPhone.
