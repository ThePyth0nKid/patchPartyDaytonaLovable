# Red-Team Attack — 11-deployment-infra.md

**Target:** `planning/v3.0-studio/11-deployment-infra.md` (v1.0, 2026-04-18, Squad I)
**Attacker role:** senior SRE / infra-security veteran. Three dead startups worth of scar tissue from vendor concentration and saga-rollback debugging at 3am.
**Round:** Round 3b, Red-Team hardening pass.
**Context:** `00-vision.md` elevates this spec to load-bearing — "the Studio's unique market claim is _brief to production-URL in one session_ only holds if deployment is part of the product". Therefore: attacked hardest of the five.

---

## Verdict

**REJECT-AS-FLAGSHIP. Accept only as internal engineering plan after 30+ material changes.**

This is not an international-standard infra spec. It is a well-meaning provider-picker-document wearing the costume of one. It concentrates PatchParty's production-availability onto three independent third-party control-planes whose composed SLA is worse than any of them individually, then uses the phrase "international-standard" as though naming it made it true. The Saga is pseudocode. The Canary is a header-splitter without a feedback loop. GDPR is a database flag. The 99.9% number is marketing. The Repo-Genesis claim of "brief to production-URL in one session" is load-bearing on a GraphQL endpoint (`backboard.railway.app`) that has no published SLA.

Ship it like this and three cohorts die in order: (1) the first CF outage takes every Project offline at once and Nelson's phone doesn't stop for six hours; (2) a Saga crashes mid-way on a launch-day customer and support explains that PatchParty charged them for an empty GitHub repo; (3) a German Mittelstand customer audits `europe-west4` against actual Art.28 processor-contracts and discovers PatchParty has neither DPA nor SCCs with Railway.

**Finding count: 34 (20 load-bearing + 14 supplemental).**

---

## Findings

### F1 — Three-provider concentration is the hidden SPOF [CRITICAL, load-bearing]

The spec asserts multi-provider is resilient because "no layer is substitutable without rewriting this spec" (§1.5). This is backwards. Any-layer-down = whole-system-down because end-user requests traverse CF → Railway and Repo-Genesis requires GitHub AND Railway AND CF AND Daytona. Composed availability of three independent 99.9% SLA providers is **99.7%** (8 × 3 = 26h/year aggregate downtime), not 99.9%. The spec never computes this. It never acknowledges it. The one-line rule "no layer is optional" is advertised as strength; it is the definition of fragility.

**Fix:** replace §12 (which does not exist yet in a fault-tree form) with a real composed-availability math + a documented degradation-mode matrix: what still works when CF is down, when Railway is down, when Daytona is down, when GitHub is down, when `backboard.railway.app` is down, when `api.cloudflare.com` is down (distinct from CF-edge being down).

### F2 — Region-pinning is a database flag, not an enforcement mechanism [CRITICAL]

§2.3: "Region-pinning is enforced at provision-time, not at runtime. Cross-region replication is explicitly forbidden without a signed user approval step." The enforcement shown is the `Project.region` string, an inference step, and a user-facing confirm dialog. Nothing in this prevents:

- a backend worker running in `europe-west4` from calling an LLM API that terminates in `us-east-1` with PII in the prompt,
- a cron reading Postgres and writing to an R2 bucket created in a different jurisdiction,
- a Railway service autoscaling to a region that was never `Project.region`,
- a CF Worker running at every POP worldwide processing request bodies containing EU personal data (every CF Worker is global by default — this is architecturally incompatible with GDPR region-pinning unless the spec defines per-Project Worker regionality, which it does not),
- an R2 bucket created without explicit `jurisdiction=eu` binding (CF R2 only enforces EU-data-jurisdiction if the bucket was created with `jurisdiction: "eu"` at creation time — not mentioned in §3.6 / §1.1).

"Region-pinning HARD for GDPR" is the headline. The mechanism is a string column. These are not the same thing.

**Fix:** add enforcement at five distinct boundaries — Railway service region check, R2 jurisdiction binding (`jurisdiction: "eu"` required when `Project.region == "EU"`), CF-Worker region-routing via Smart Placement or jurisdiction-scoped deployments, LLM-call region allow-list per Project, cron/worker pre-flight region assertion. And document the one that CF cannot enforce today (Workers-jurisdiction is not fully mature) as a known residual risk.

### F3 — Repo-Genesis Saga "compensating rollback" is pseudocode that hasn't met reality [CRITICAL]

§5 (referenced) and `00-vision §12` both lean on the phrase "compensating rollback" as though it is a well-understood technique. In practice:

- **Compensate-mid-compensate failure.** If the Saga has provisioned GitHub → Railway → CF → Daytona and fails at Daytona, compensate runs CF-tear-down → Railway-tear-down → GitHub-delete. If CF-tear-down itself fails (API rate-limit, token expiry, 500 from CF), the Saga is now stuck with the rollback corrupted. No specified policy for rollback-of-rollback.
- **Orphan-billing window.** Between Railway-provision-success and CF-success there is a measurable crash-window where the customer is billed by Railway (Hobby plan starts accruing on creation) but has no working URL. Nelson's support inbox.
- **GitHub-empty-repo ghost.** If Saga succeeds at GitHub and dies before any commit, the customer has an empty GitHub repo under their account. Deleting a repo the user sees in their own org without explicit consent is a UX failure; leaving it is litter.
- **Non-idempotent retries.** If the user clicks "retry provisioning", what prevents a second Railway project from being created? No idempotency key scheme shown; Railway's GraphQL does not offer native idempotency tokens on `projectCreate`.

**Fix:** write the Saga as a real state machine — persisted to Postgres, keyed by a client-generated provisioning-run-id (idempotency), with explicit per-step compensating action, per-step timeout, per-step retry-budget, a "compensate-failed" terminal state that pages a human and does NOT charge the customer, and a reconciliation cron that detects orphans across all four providers.

### F4 — BYOK-for-infra AES-GCM does not protect against app-server compromise [HIGH]

§8 (referenced) reuses the LLM-BYOK AES-GCM flow. This encrypts at rest. At use-time the key must be decrypted into process memory to call Railway/CF/Daytona APIs. Any RCE, any SSRF-to-metadata, any dependency compromise on the PatchParty backend (which executes Repo-Genesis Sagas as a service) → attacker obtains the decrypted token → attacker has write access to the user's Railway account (can deploy arbitrary code to prod, can exfil Postgres), CF account (can redirect DNS, intercept TLS, deploy malicious Workers at the edge), and Daytona account (can run arbitrary containers in user's quota).

The blast radius of BYOK-for-infra is **strictly larger** than BYOK-for-LLM. A leaked Anthropic key costs money; a leaked CF token costs the user's entire web presence. The spec treats them as the same threat model.

**Fix:** (a) separate encryption domain per provider with per-request HSM-style decrypt if available (Railway/CF/Daytona all support short-lived delegated credentials — spec should use them instead of storing long-lived tokens); (b) separate privilege tiers (read-only inference tokens for status-polling vs. write tokens only used during a user-initiated Saga); (c) a documented token-rotation cadence with automatic rotation on anomaly detection; (d) a threat-model section that names "app-server compromise" explicitly and states the residual risk.

### F5 — Canary Worker has no health-check feedback loop [CRITICAL]

§3.4.2 verbatim TS shows a header-based split driven by `CANARY_PERCENT`. §4 (Release) describes a 5% → 25% → 50% → 100% promotion ladder "each step gated by a health-check." The promotion script (`scripts/canary-promote.ts`) is shown as a single `curl` PUT setting `CANARY_PERCENT` to a new value.

**What is missing:**
- Which endpoint is the health-check? On which origin (blue or green)?
- What signal gates promotion? Error rate? Latency percentile? Custom SLO?
- Over what window? 5 minutes? 30 seconds?
- What is the rollback trigger — if green's error-rate exceeds blue's by X%, who calls the script to set `CANARY_PERCENT=0`?
- Is promotion automatic (no human in loop) or manual (every 25% step Nelson pages himself)?
- How do you prevent a partial-promotion from being stuck because the script died mid-curl?

A canary worker that cannot demote itself in response to green-origin errors is not a canary. It's a traffic splitter with optimistic labels.

**Fix:** specify the observer component explicitly — CF Worker Analytics Engine query, or origin-pushed metrics, or a dedicated Worker running a scheduled `cron` trigger that polls health-endpoints on both origins and calls the promote/demote API. Then show the verbatim observer code with the same fidelity the splitter got.

### F6 — "Atomic DNS-swap via CF API" is not atomic [HIGH]

§4 (Release) advertises Blue-Green as "atomic DNS-swap via CF API" (00-vision §4 Phase 8 echoes this). DNS is not atomic. CF's proxy-mode (orange-cloud) can reduce TTL to ~30s but not to zero; for grey-cloud (DNS-only) the default TTL is 300s. During propagation — which can last TTL × resolver-cache-count worldwide — requests split unpredictably between blue and green. That is precisely the state Blue-Green was supposed to eliminate.

The correct mechanism for atomic swap at Cloudflare is **Worker re-binding** (change the origin inside the Worker in ~1s globally) or **Load Balancer origin pool** (change pool weight atomically). Neither is in the spec.

**Fix:** rewrite §4 Blue-Green to describe a Worker-level origin swap (single `PUT /workers/scripts/{name}/settings` mutation flipping a binding). Drop the word "atomic" from anything that involves DNS propagation. Add a test harness that measures actual cutover time during rehearsal.

### F7 — 99.9% SLA claim is marketing fiction [CRITICAL, load-bearing — this is the flagship promise]

§1 states "99.9% SLA." The spec offers the Canary + Health-Gate as the mechanism. 99.9% means ≤8h 45m of unavailability per year. Railway's public availability history shows multi-hour incidents several times per year (status.railway.app). CF has had global-scope incidents (June 2022, June 2023, November 2023) each worth hours of unavailability. Daytona has no published availability history. Neither Railway nor Cloudflare offers 99.9% SLA-backed refunds on their Hobby/Pro tiers — Railway's enterprise SLAs are negotiated per-contract.

Claiming 99.9% in a user-facing spec when (a) no underlying provider contractually offers it at the tier PatchParty uses, (b) composed availability is mathematically worse, (c) no SRE team is on pager — is a statement that will be screenshotted by the first customer who gets bitten, with Nelson's name at the bottom of a lawsuit.

**Fix:** delete the 99.9% claim. Replace with "best-effort availability, inherited from upstream providers; PatchParty offers no SLA on the managed tier in V2.5–V3.5." Defer any SLA claim to V4.0 SOC-2 milestone (00-vision §14) where an audit forces honesty.

### F8 — "CDN cache-hit >80%" is workload-dependent, not spec-configurable [HIGH]

§3.8 (inferred from Cloudflare §1.1 rationale + V2.5 claims) asserts high cache-hit via "pre-configured CF Rules." Cache-hit rate is a property of the application (cacheable response ratio), not of the CDN. API-heavy apps (the actual output of PatchParty for Greenfield SaaS briefs) have near-0% cache-hits. Next.js with ISR gets decent cache-hit rates only when `revalidate` is configured intentionally per-route. PatchParty does not control the application's cache-ability — agents write it.

Claiming >80% cache-hit as a spec deliverable puts Nelson on the hook for a metric outside his control.

**Fix:** remove the percentage. Replace with "CDN + edge cache available; application-level caching is the responsibility of the generated code and is not guaranteed by the infra spec." Include it as a Quality-pass (Phase 7) check, not an infra promise.

### F9 — Multi-region without cross-region database sync is latency theater [HIGH]

§14 roadmap V3.5 promises "multi-region Railway option (EU/US/APAC)". §2.3 shows region is a single string on `Project`. Railway does not have built-in cross-region Postgres replication for the Pro tier. "Multi-region" in this spec means: the Project picks ONE region, user in APAC hits EU database with 200–300ms added latency per query. That is not multi-region — that is a region-picker plus a misleading label.

True multi-region requires: read-replicas with region-local routing (Railway does not provide at the Pro tier), or a multi-region-native DB (Neon, PlanetScale, CockroachDB — none of which are in the spec), or an application-level sharding layer.

**Fix:** scope V3.5 down to "region-pick per Project" and explicitly note multi-region-with-replicated-data is post-SOC-2 and requires migrating off vanilla Railway-Postgres. Do not conflate "user can choose a region" with "application is multi-region."

### F10 — `europe-west4` is not GDPR compliance [CRITICAL, legal-load-bearing]

§2.3 maps `EU` → `europe-west4` and labels it "Frankfurt-equivalent. GDPR-safe." This is category confusion. `europe-west4` is a region identifier (Railway uses GCP underneath). Data in a GCP region is subject to US-extraterritorial requests under the CLOUD Act regardless of physical location; GDPR compliance requires:

- a **Data Processing Agreement (DPA)** between PatchParty and its customer, naming all sub-processors (Railway, CF, Daytona, Anthropic, OpenRouter, the image model, Seedance-2…),
- **Standard Contractual Clauses (SCCs)** with every sub-processor that touches personal data outside the EU,
- **Transfer Impact Assessments (TIAs)** per sub-processor after Schrems II,
- a **Record of Processing Activities (RoPA)** maintained per customer,
- documented **data subject rights flows** (erasure → including loser-branches, per 00-vision §16 Q2).

None of this is in the spec. `Project.region = "EU"` ≠ GDPR-safe. A German Mittelstand customer (Nelson's target buyer per `user_profile` memory) will have a legal team that reads the DPA before buying; "we pinned the Railway region" will not close the deal.

**Fix:** add §14 — Legal & Compliance Surface. Enumerate: DPA template, sub-processor list, SCC status per sub-processor, TIA completion per sub-processor, data-subject-rights endpoint, incident-notification SLA. State bluntly where PatchParty is not yet compliant and block the V2.5 EU launch on completing the gap.

### F11 — Preview-env per PR with 7-day TTL is a cost footgun [HIGH]

§1.3: preview-env has "7-day TTL, auto-pause 30-min idle." Consider: one Greenfield customer with 10 open PRs in a sprint × €0.X/hour Daytona × 168 hours × 10 envs = material infra cost per sprint per customer. Auto-pause helps compute but not storage. Cold-start from auto-pause is a UX failure mode: user clicks preview URL, sees spinner for 15-60s, concludes "PatchParty is slow", never clicks again.

Nothing in the spec auto-closes a preview-env when its PR merges or closes. Stale previews accumulate indefinitely under a 7-day TTL cycle that resets on each push.

**Fix:** three changes — (a) auto-destroy preview-env on PR merge/close via GitHub webhook (not TTL-only); (b) pre-warm preview-envs on PR update events so cold-start is hidden behind the git push latency the user already accepts; (c) expose per-Project preview-env cost in the Studio UI so the user can see the meter.

### F12 — CF Access as preview-env SSO concentrates identity on one vendor [HIGH]

§3.5 / §1.1: preview-envs are "CF-Access-gated." CF Access becomes the identity provider for every preview-env across every PatchParty customer. Single misconfig — wrong application scope, wrong policy, wrong audience — exposes every preview-env. Cloudflare Access has had publicly documented misconfig failures (identity header spoofing, bypass via specific header combinations — e.g. the 2023 JWT-bypass advisories). Centralising on CF Access for identity, when the same vendor owns DNS, WAF, CDN, and the Worker plane, is defense-in-_depth_ set to zero.

**Fix:** require short-lived signed URLs (HMAC-signed by PatchParty backend) as the primary preview-env gate, with CF Access as an optional second factor for Team-plan customers who already use CF. Do not default to CF Access for solo devs (F16).

### F13 — Repo-Genesis ordering leaves crash-windows with user-visible billing [HIGH]

Order implied by §5 and §1.1: GitHub → Railway → CF → Daytona. Between GitHub-success and Railway-success there is a window (tens of seconds to minutes) where the user has a repo in their GitHub org but no Railway project. If the browser tab closes, the Saga-runner dies, or `backboard.railway.app` 500s — user sees an empty repo, no deploy, no URL. Worst case: Railway project was actually created but the callback failed → user sees no URL, clicks retry → second project created → double billing.

**Fix:** (a) reorder to create Railway-project first but with `deployed=false`; (b) idempotency key per Saga run, so retries are safe; (c) the CLI/UI must show a persistent provisioning-run status that survives tab close; (d) on any terminal failure, offer a one-click "delete all provisioned resources" that actually works (i.e. tested in CI against all four provider sandboxes).

### F14 — "International-Standard checklist" is checklist-theater [HIGH]

§9 (or wherever the 10-item checklist lives — referenced in the prompt) is described as the "international-standard" proof. Without citing the 10 items verbatim, the format already signals the problem: 10 items is not a standard. SOC 2 Type II has 100+ controls. ISO 27001 has 114 Annex A controls. GDPR Art. 28 has specific processor-contract requirements. CCPA has its own set. What the spec calls "international-standard" is a hygiene checklist (TLS, WAF, rate-limit, DDoS, cert auto-renew, etc.). Those are table-stakes, not standards.

Calling a 10-item hygiene list "international-standard" publicly is the kind of statement a competitor will screenshot into a comparison page that says "PatchParty claims SOC-2 readiness but does not have an auditor."

**Fix:** rename to "Infrastructure baseline — hygiene." Remove the word "standard." Reserve "standard" for when SOC-2 Type-1 is actually in audit (V4.0 per roadmap).

### F15 — Railway GraphQL has no published SLA; trust on undocumented endpoint [HIGH]

§2.1: `backboard.railway.app/graphql/v2`. This is Railway's internal control-plane API. It is not a supported product surface, not in the Railway changelog, not covered by any availability commitment. Any schema change breaks Repo-Genesis. Any rate-limit or auth change breaks it. This is the dispatch point for every new customer onboarding — the most load-bearing HTTP call PatchParty makes.

**Fix:** (a) generate a typed client with schema-snapshot versioning and CI that diffs the snapshot daily — so schema drift is detected before a customer hits it; (b) circuit-breaker around Railway calls with a user-visible "Railway API is currently degraded — we'll retry automatically" UI state; (c) negotiate with Railway for a documented API contract or commercial SLA before making this the flagship onboarding path; (d) have a `local-sandbox` fallback that provisions Daytona-only if Railway is down, so Repo-Genesis does not hard-fail during a Railway outage.

### F16 — CF Access requires the user to already be in CF identity; friction unaddressed [MEDIUM]

§3.5 assumes preview-env SSO via CF Access. Nelson's target user (solo dev, agency, Mittelstand per `user_profile` memory) most often does **not** have a CF Teams/Zero-Trust account. Asking them to sign up for a CF Teams tier as a precondition to seeing their own PR previews is a friction wall.

**Fix:** see F12 (HMAC-signed URLs as default; CF Access as Team upgrade). Document clearly that CF Access is not required for solo dev usage.

### F17 — Nelson's local shell convention baked into the spec [MEDIUM]

§2.6 (verbatim):
```
RAILWAY="/c/Users/nelso/AppData/Roaming/npm/railway.cmd"   # Windows path
"$RAILWAY" up -s backend -d
"$RAILWAY" up -s frontend -d
```
This is Nelson's `git-workflow.md` habit. It is not an infrastructure spec. Baking a specific user's binary path and shell convention into a spec every PatchParty customer will eventually read is anchoring bias codified. Linux/macOS users laugh; CI users ignore it; Windows users whose Railway CLI lives elsewhere are confused.

Worse: Nelson's memory explicitly encodes "NIEMALS nur pushen ohne Railway deploy" as an automation. If Railway is down, this automation breaks the push flow. No fallback specified.

**Fix:** move §2.6 to an appendix titled "Developer convenience script." Document the abstract rule ("every git push must be followed by a deploy to preserve parity") separately from the Nelson-specific command. Add a fallback: if `railway up` fails N times, defer to a queue with user-visible status instead of silent breakage.

### F18 — Rate-Limit Worker is naive [MEDIUM]

§3.4.1 verbatim TS: sliding-window keyed by `cf-connecting-ip`. Problems:

- **IP rotation bypass.** Any motivated actor using a rotating residential proxy pool defeats it trivially.
- **NAT false-positives.** Corporate egress NATs (university, enterprise, mobile carrier CG-NAT) hit the limit at 100 req/min collectively, blocking legit users.
- **KV consistency.** CF KV is eventually-consistent across POPs with ~60s replication. A user's hits at POP-A are invisible at POP-B for up to a minute — the per-minute limit is actually per-minute-per-POP.
- **No Retry-After enforcement.** Response returns `retry_after_s: 60` but there is no server-side enforcement the client honors it.
- **Unauthenticated limit only.** No distinction between anon vs. authenticated users; auth users routinely exceed 100 req/min on a legit SSR dashboard and will hit the limit.

**Fix:** use Durable Objects (mentioned as paid-tier alternative but not required — it should be required for any production limit), add fingerprint + token bucket, separate anon/auth limits, and document the KV consistency trade-off explicitly. Or use Cloudflare's built-in Rate Limiting product rather than hand-rolled Workers.

### F19 — R2-per-project vs R2-shared trade-off is asserted without analysis [MEDIUM]

§1.1 lists R2 as Yes/default-on. Not specified whether the spec uses one R2 bucket per Project or one shared R2 bucket with per-Project prefixes. Each has trade-offs:

- **Per-project bucket:** easier RLS/isolation, easier per-customer deletion, cleaner GDPR erasure → but CF has a per-account bucket-count limit, and cost-aggregation fractures.
- **Shared + prefix:** single bucket, simple cost math → but IAM is trickier, erasure is object-by-object, cross-tenant bugs (prefix-mis-scoping) are data-leaks.

The spec must pick one and justify. Defaulting to either without the analysis is the bug.

**Fix:** add §3.6 — R2 tenancy model. Pick one, state the reason, document the downside, describe how mitigation works in V2.5 vs. what is deferred to V4.0.

### F20 — "Big-Bang anti-pattern but allowed for Brownfield" becomes the norm [MEDIUM]

§4 (Phase 8 in 00-vision) calls Big-Bang an anti-pattern "allowed only for Brownfield single-service." Brownfield users are the majority today (00-vision §14 V2.0). Big-Bang is fastest. Human behavior: the anti-pattern path wins on defaults when it is available. The spec creates the condition for its own policy to be ignored in practice.

**Fix:** either (a) remove Big-Bang entirely (force Canary-light even for single-service Brownfield), or (b) keep Big-Bang but require an explicit "I understand this is the anti-pattern mode" confirmation per deploy, logged to `PartyEvent("deploy.bigbang.acknowledged")` for audit.

---

### Supplemental findings

### F21 — Railway cost tiers are incomplete [MEDIUM]
§2.4: $5 / $20 / $50. Postgres Pro ($29/mo), backup retention, volume storage over free-tier allotment, egress over included, Pro team seat costs — none included. Real project cost is 2-3x what the tier table suggests. Customers will see the bill and be angry.

### F22 — CF Pages promised V4.0 overlaps Railway frontend-service [LOW]
§14 V4.0 lists "Cloudflare Pages for static marketing/docs" while §2.2 already provisions a `frontend` service on Railway for the Next.js app. Scope contradiction — the spec never states which surface ships what, or why the static-marketing-site is on CF Pages while the app's static assets are on R2.

### F23 — Daytona dev-env is a distinct product from race-sandbox [LOW]
§1.3: VS-Code-in-browser dev-env (V3.5) is a different product than race-sandbox container. Why both from Daytona? The rationale in §1.3 ("only sandbox provider whose API lets us script workspace-templates") applies to race-sandbox. It does not automatically apply to browser-IDE. Decision reused without redoing the analysis.

### F24 — Region-pinning not shown for sub-project resources [HIGH]
`Project.region` pins the Project. But: wireframes in R2 (which bucket region?), Daytona workspaces (which Daytona region?), CF Worker deployments (global by default), Asset pipeline cross-calls to external image/video models (which region?). Each must ALSO pin — not shown. F2 lists the enforcement boundaries; this finding is about the data model.

### F25 — `DeploymentRun.healthGatePassed` boolean is undefined [MEDIUM]
Referenced in the prompt. Where does this boolean come from? Which health endpoint is polled? Is it configurable per Project or hardcoded? What happens on timeout? What's the grace period after deploy before the first check? None of this is specified. F5 names the missing feedback loop; this finding names the missing data field.

### F26 — Secret rotation across three providers has no orchestration spec [HIGH]
§2.7 mentions Railway env-var rotation. CF API tokens rotate separately. Daytona tokens rotate separately. GitHub-App private keys rotate separately. Anthropic keys, Seedance-2 keys, image-model keys — all separate. N×3 rotation surface with no single-pane orchestration. No documented rotation cadence. No automatic rotation on anomaly. This is how leaked tokens live for months.

### F27 — "99.9% SLA-fähig" implies contractual SLA — has PatchParty negotiated one? [CRITICAL]
Per F7 but escalated: "SLA-fähig" (SLA-capable) in a B2B context implies the product can back an SLA to the customer. An SLA to the customer requires either PatchParty's own SRE + refund-budget, or pass-through SLAs from Railway/CF/Daytona. Neither exists. Saying "SLA-fähig" without backing is, at best, misleading in a B2B sales context; at worst it is an implied warranty.

### F28 — PreviewEnv TTL 7d without auto-close-on-PR-merge [MEDIUM]
Per F11 but specifically: the 7-day TTL does not include an auto-close trigger on PR merge/close. Stale previews are a support burden AND an attack surface (old code with known vulns still reachable behind CF Access).

### F29 — ADR-008 alternatives rejected on "DX grounds" only [MEDIUM]
ADR-008 (referenced) rejects Vercel+Supabase, AWS, Fly.io+Neon on DX grounds. DX is subjective and does not survive a real buyer's procurement questionnaire. Real rejection analysis needs TCO per tier, vendor-lock-in cost (data-portability, egress fees), compliance footprint per provider, regional coverage, and incident history. "DX" is the answer of a developer, not the answer of an infrastructure architect. Redo the ADR.

### F30 — Auth-preview-gate + custom-domain breaks cookie isolation for iframes [LOW]
Per §3.3 custom domains and §3.5 CF Access: embedded iframes (e.g. Stripe checkout, Intercom widget, third-party embed) may fail SameSite cookie checks through the CF-Access-gated custom-domain path. Unaddressed.

### F31 — BYOK-for-infra error-message proxying is a UX catastrophe [MEDIUM]
If the user brings their own Railway/CF/Daytona tokens, PatchParty must surface errors from three distinct provider error-formats (Railway's GraphQL error shape, CF's `{success, errors:[{code, message}]}` shape, Daytona's OpenAPI error shape). Error normalisation layer not specified. Users will see raw vendor errors like `{"code":10000,"message":"Authentication error"}` and not know what to fix.

### F32 — CF Worker deployment pipeline per-project is unspecified [HIGH]
§3.4: "Three Standard Workers deploy via Wrangler in the Repo-Genesis saga." Which CF account? The user's (BYOK-CF), or PatchParty's? If PatchParty's — every user's Workers share one account's Worker-count quota (1000 scripts / account on Free). If user's — BYOK-CF is required from day one, contradicting the managed-mode promise. Multi-tenancy plan for Workers: missing.

### F33 — Compensating-rollback pseudocode does not handle partial-compensate [HIGH]
Per F3 but specifically: the pseudocode (implied in §5 / referenced in 00-vision §12) shows a reverse-order compensate. It does not show what happens when compensate step 3-of-5 itself fails. That state is the most dangerous one the Saga can reach — it is where orphans become invisible to both rollback and reconciliation.

### F34 — "NIEMALS nur pushen ohne Railway deploy" breaks during Railway outage [MEDIUM]
Per Nelson's memory: the global rule is "nach git push: sofort Railway deployen". If Railway is down, this rule makes `git push` itself effectively blocked by the follow-up deploy that cannot complete. The spec never addresses what to do when the automation's mandatory downstream step is unavailable. Graceful degradation path required.

---

## Contradictions (internal to the spec)

1. **"No layer optional" (§1.5) vs. "CF Pages opt-in" (§1.1).** CF Pages is listed as Opt-in, yet §1.5 says no layer is optional. If CF Pages is a CF surface and optional, the one-line rule is already violated.
2. **"Region pinning HARD" (§2.3) vs. CF Workers global-by-default (§3.4).** Workers execute globally at every POP. A HARD-pinned Project has a component that is, by architecture, not pinned.
3. **"No markup on Railway" (§2.4) vs. Studio flat $19 subscription (00-vision §16 Q5).** If the subscription is flat and infra cost is pass-through, heavy-infra customers cross-subsidize light-infra customers via the subscription. That is a markup, just an indirect one. Be honest about it.
4. **Managed-mode default (§2.4) vs. BYOK-CF required for Worker multi-tenancy (F32).** Workers-per-project implies BYOK-CF; managed-mode implies PatchParty-CF-account. Can't have both without an explicit multi-tenancy plan.
5. **"Daytona API lets us script workspace-templates" (§1.3 rationale) vs. dev-envs as separate product (§1.3 table).** Same rationale applied to two different products. If Daytona's API is the reason, dev-envs need their own rationale.
6. **Canary promotion "gated by health-check" (§4 release) vs. promotion script is a one-line curl (§3.4.2).** The mechanism shown is open-loop. The claim is closed-loop.
7. **"Multi-region" (§14 V3.5) vs. single-region DB (§2.2).** Word "multi-region" applied to a system with single-region state.
8. **"Brief to production-URL in one session" (00-vision §1.5 echo) vs. custom-domain wait 60-120s + DNS polling 15min (§3.3).** If a real customer uses a custom domain, one session is not enough.

---

## Scope theater

Statements that sound concrete but lack operational substance:

- **"International-standard"** (throughout): not defined, not audited, not certified.
- **"99.9% SLA"**: not backed by any provider contract PatchParty has.
- **"HARD for GDPR"**: not backed by enforcement mechanisms at five of the six data boundaries.
- **"Atomic DNS-swap"**: DNS is not atomic.
- **"Compensating rollback"**: pseudocode without rollback-of-rollback semantics.
- **"Three-layer stack picked on purpose"**: ADR-008 uses DX as the rejection ground for alternatives. DX is not purpose-in-the-spec-sense.
- **"First-class"** (used for Daytona, assets, deployment): everything is "first-class". When everything is first-class, nothing is.
- **"Not Vercel, not AWS, not a kitchen-sink"**: a negation is not a design decision.

---

## Required changes (before this spec can claim flagship status)

Minimum before V2.5 EU launch:

1. **Delete 99.9% claim.** Replace with honest best-effort text. (F7, F27)
2. **Replace "region-pinning HARD for GDPR" with enforcement at all six data boundaries.** R2 jurisdiction, Worker placement, LLM-call region allow-list, cron region check, Daytona region, sub-processor list. (F2, F24)
3. **Add §14 Legal & Compliance Surface.** DPA template, sub-processor list, SCCs-per-sub-processor, TIAs, RoPA, DSR flows, incident-notification SLA. Block V2.5 EU launch until complete. (F10)
4. **Rewrite Saga as persisted state-machine.** Idempotency keys, per-step retry budgets, compensate-failed terminal state, reconciliation cron across all four providers. Include orphan-detection test suite run in CI against provider sandboxes. (F3, F13, F33)
5. **Add Canary observer component.** Verbatim TS for a scheduled Worker that polls health-endpoints and triggers promote/demote. Specify the SLO (error-rate %, p95 latency window) per project tier. (F5, F25)
6. **Replace "atomic DNS-swap" with Worker-origin-swap for Blue-Green.** Drop the word atomic anywhere that touches DNS. (F6)
7. **Specify CF-Worker tenancy model explicitly.** PatchParty-account-for-managed vs. BYOK-account-for-BYOK; multi-tenancy plan for Free-tier Worker quota. (F32)
8. **Specify R2 tenancy model.** Per-project bucket vs. shared-with-prefix. Pick and justify. (F19)
9. **Remove Nelson's local shell convention from the spec body.** Move to developer-convenience appendix. Define the abstract rule separately. (F17)
10. **Rewrite rate-limit Worker.** Durable Objects + fingerprint + token-bucket + anon/auth split + CF Rate Limiting product evaluation. (F18)
11. **Add composed-availability math and degradation-mode matrix.** What works when each provider is down. (F1)
12. **Redo ADR-008** on TCO + lock-in + compliance + regional coverage, not DX. (F29)
13. **Auto-close preview-env on PR merge/close.** Webhook-driven, not TTL-only. Pre-warm on PR update. (F11, F28)
14. **Default preview-env SSO to HMAC-signed URL.** CF Access as opt-in upgrade only. (F12, F16)
15. **Threat model for BYOK-for-infra.** Separate from LLM-BYOK. Document app-server-compromise residual risk. Short-lived delegated credentials where available. (F4, F26)
16. **Rename "international-standard checklist" → "infrastructure hygiene baseline."** (F14)
17. **Document Railway GraphQL-API contract risk + schema-snapshot CI + fallback-to-local-sandbox degradation path.** (F15, F34)
18. **Fix Repo-Genesis order + idempotency + persistent provisioning-run UI state.** (F13)
19. **Publish real cost tier with Postgres Pro + egress + backup included.** (F21)
20. **Reconcile Big-Bang anti-pattern with its availability as a default.** Either remove, or require per-deploy explicit acknowledgement event. (F20)

Minimum before V4.0 SOC-2 claim:

21. Real SRE rotation + on-call + incident-response runbooks per provider outage scenario.
22. SOC-2 Type-I audit underway (not "ready for audit" — actually engaged with an auditor).
23. Contractual SLAs with Railway / CF / Daytona at a tier that supports customer-facing availability commitments, OR documented decision to remain best-effort in perpetuity.
24. Multi-region with replicated data (not region-picker-labeled-multi-region), or explicit documentation that multi-region means single-region-with-regional-choice.
25. Secret rotation orchestration across all providers with automatic rotation on anomaly.

---

## Final word

The three-layer stack is a plausible engineering choice. The spec is not.

It confuses vendor selection with architecture, region strings with compliance, pseudocode with implementation, and DX with purpose. The load-bearing claim — "brief to production-URL in one session to international-standard infra" — rests on: an undocumented GraphQL endpoint, a Saga whose rollback cannot roll itself back, DNS calls the spec dares to label atomic, a database flag the spec dares to label GDPR enforcement, and a checklist the spec dares to label a standard.

Nelson's market positioning depends on this spec being true. Right now it is aspirational. The 30+ changes above are the minimum path from aspiration to substance. Do them. Then ship it. Not before.

---

_End of Red-Team attack on 11-deployment-infra.md — Round 3b._
