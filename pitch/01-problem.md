# The Problem — Generation is cheap. Selection is the new job.

## The market shift

AI-generated code is no longer a side workflow. It is the default.

- **46%** of production code is AI-written in 2026.
- AI-generated pull requests carry **1.7× more bugs** than human-written code.
- Anthropic launched its own code-review tool in March 2026 **because Claude Code produced so many pull requests that enterprise teams were drowning in review load**.

The bottleneck has moved. It is no longer "write the code." It is "which of the many plausible answers should I actually merge."

## The monoculture problem

Every engineer on a team asking the same Claude the same question gets the same answer. That is not collaboration — that is a single opinion, scaled. When every PR in your repo was nudged by one model, you lose the built-in disagreement that made code review valuable in the first place.

AI copilots optimized for **one correct answer**. Real engineering is full of trade-offs that have **no single correct answer**:

- Should this endpoint rate-limit?
- Does this form need a honeypot?
- Do we ship fast or ship tested?
- Accessibility first, or performance first?

A single-agent workflow forces an implicit answer to every one of those. The human never sees the fork.

## The "AI slop" tax

Teams we talked to reported three symptoms:

1. **Review fatigue.** Engineers spend more time reviewing AI PRs than writing code. The PRs all look plausible, which makes them harder, not easier, to reject.
2. **Uniform blandness.** Features ship without opinionated choices — no one defended a stance, no one weighed trade-offs out loud.
3. **Hidden defects.** Bugs that pattern-match to "this looks right" slip through because reviewers assume the model already considered edge cases. Often it did not.

The result is "AI slop": code that compiles, passes tests, and fails in production in the ways you did not ask about.

## Why existing tools do not solve this

- **Code review assistants** (CodeRabbit, Greptile) inspect one PR at a time. They do not offer alternatives.
- **IDE copilots** (Cursor, Copilot) autocomplete inside a single mental model. Disagreement is out of scope.
- **Agentic frameworks** (Devin, SWE-agent) aim to produce *the* answer, not *choices*.

All of them assume "one AI's opinion, polished harder" is the goal. We think the goal is different: **give the human back the act of choosing**.

## The shift PatchParty bets on

The next wave of developer tools is not "a better copilot." It is **decision interfaces** — surfaces that help humans pick between plausible AI outputs quickly and confidently.

Generation is cheap. Selection is the job.
