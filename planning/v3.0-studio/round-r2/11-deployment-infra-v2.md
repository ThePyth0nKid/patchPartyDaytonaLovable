---
round: r2-green
spec: 11-deployment-infra
supersedes: 11-deployment-infra.md
date: 2026-04-18
addresses-findings: [F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13, F14, F15, F16, F17, F18, F19, F20, F21, F22, F23, F24, F25, F26, F27, F28, F29, F30, F32, F33, F34]
deferred-findings:
  - { id: F4,  to: V4.0, reason: "BYOK-for-Infra deferred (triage Q9)" }
  - { id: F8,  to: V4.0, reason: "CDN cache-hit is application-controlled; infra spec does not promise a percentage" }
  - { id: F9,  to: V4.0, reason: "Multi-region with cross-region DB replication requires paid SRE + DB migration; single-region-picker kept as V3.5 honest scope" }
  - { id: F26, to: V4.0, reason: "Secret rotation orchestration requires cross-provider scheduler; V3.0 ships per-provider cadence only" }
  - { id: F31, to: V4.0, reason: "BYOK error-proxying moot under managed-only scope (triage Q9)" }
triage-decisions-applied: [Q1, Q2, Q9, Q10, Q11]
---

# 11 — Deployment & Infrastructure (R2 Green-Team Defense)

## §0 Executive Summary (post-triage scope)

This V2 supersedes `11-deployment-infra.md` v1.0. It replies to the 34-finding Red-Team verdict "REJECT-AS-FLAGSHIP" by accepting the verdict and rebuilding the spec as an **internal engineering plan** rather than a flagship marketing document, per Triage decisions Q1 (kill "international-standard"), Q2 (kill "99.9% SLA"), and Q9 (defer BYOK-for-Infra to V4.0).

**What changed structurally (top-ten summary):**

1. Flagship marketing phrases **removed** from §0/§1/§6/§10: "international-standard", "99.9% SLA", "HARD GDPR", "atomic DNS-swap", "SOC-2-ready". Replaced by measured, upstream-inherited language.
2. §2.3 region-pinning rewritten with **six enforcement boundaries** (Railway project + R2 bucket + CF Worker + LLM allow-list + cron scheduler + Daytona workspace), each validated at startup, failing closed. New PartyEvent `region.enforcement.violated` hard-blocks.
3. §7 Repo-Genesis Saga rewritten as a **persisted state machine** backed by Postgres advisory-locks + idempotency keys + a reconciliation cron. The step order is reversed: repo creation (GitHub) becomes the **last** step, not the first, closing F13's crash-window-with-visible-billing.
4. §5 Release Strategies: **Big-Bang is V2.5-only**, Canary shifts to V3.0, Blue-Green to V3.5, multi-region defers to V4.0. Canary gains a real observer Worker with verbatim TS code and explicit SLO.
5. §6 **"Production-Grade Checklist V3.0"** — 6 honest items, not 10 flagship items. SOC-2, 99.9%, multi-region-default, DDoS-marketing-claim all removed.
6. §8 BYOK-for-Infra **moved to V4.0** with earning-back criteria. V3.0 is managed-only; cost-passthrough disclosure is now a V3.0 requirement.
7. §9 Prisma adds `region_enforcement_*` fields and a `measured_availability_30d` field. New `RegionEnforcementCheck` model for boundary audit.
8. §10 ADR-008 rewritten with **TCO + lock-in + vendor-SLA** alternative-analysis, not DX.
9. §11 **Fifteen failure modes** (up from 10) each carrying a runbook link + detection signal + response policy.
10. §13 PartyEvent catalogue expands to 18 event shapes with payload redaction rules so telemetry never ships PII.

**One-sentence biggest change:** the spec is no longer a flagship claim — it is an internal engineering plan with honest availability inherited from upstream and six GDPR enforcement boundaries that fail closed.

**Deferrals with earning-back criteria (crisp):**

| Deferred | Earning-back version | Gate |
|---|---|---|
| "99.9% SLA" phrase | V4.0+ | 6-month measured-uptime ≥ 99.5% + published status history + enterprise-tier provider contracts |
| "International-standard" phrase | V4.0+ | SOC-2 Type-1 auditor engaged and audit artefacts published |
| BYOK-for-Infra | V4.0 | Dedicated FinOps + multi-provider error-normaliser + threat-model for app-server-compromise |
| Multi-region with replicated DB | V4.0+ | Paid SRE + migration off vanilla Railway-Postgres or Railway ships cross-region replicas at Pro tier |
| Secret-rotation orchestration | V4.0 | On-call engineer + anomaly-detector in the stack |

**Load-bearing Vision consequence:** 00-vision §1.5's claim "brief to production-URL in one session" becomes *"brief to best-effort-deployed PR in one session"*. Custom-domain projects may exceed one session due to DNS propagation — this is stated explicitly in §3.3 and the Studio UI copies it verbatim into the user's "domain setup" card.

---

## §1 Three-Layer Architecture (unchanged topology, honest framing)

### 1.0 Scope disclaimer (new, top of section)

> PatchParty Studio V3.0 ships **best-effort availability inherited from upstream providers**. We do not offer a contractual SLA. Customers requiring contractual uptime must use our V4.0+ BYOK-for-Infra mode (not shipped as of this document), at which point the SLA is between the customer and their provider. PatchParty's responsibility is (a) the integration plane, (b) published measured-uptime over a 30-day rolling window, (c) honest per-provider status badges in the Studio UI.

### 1.1 Layer 1 — Cloudflare (Edge)

| Surface | Role | V-phase | V3.0 confidence |
|---|---|---|---|
| DNS | Authoritative zone per Project | V2.5 | High |
| CDN | Static-asset caching | V2.5 | High (but cache-hit rate is application-controlled — see F8 defense §1.5) |
| WAF | OWASP-Core ruleset, CF Free-Tier | V2.5 | Medium (Free-Tier is best-effort; upgrade-path to CF Pro documented) |
| DDoS | Layer 3/4/7 on free-tier | V2.5 | Medium (Free-Tier is marketed-but-not-contractually-guaranteed) |
| ACME / TLS | Auto cert-issuance via Universal SSL | V2.5 | High |
| **Workers** | Rate-limit / Canary-split / Auth-preview-gate / Canary-observer | **V3.0-late-window** | Medium — depends on per-project Worker quota plan (§3.4.0) |
| R2 | Asset storage (see 08-asset-pipeline) | V3.0 | High |
| Access | SSO on preview-envs | V3.0 (opt-in only, default HMAC-signed URL) | Medium |
| Pages | Static sites | V4.0 (was V3.5 — deferred because overlaps Railway frontend per F22) | — |

Rationale kept from v1.0: Cloudflare is the only free-tier edge that terminates TLS + absorbs DDoS + runs edge logic + gates preview-envs without round-tripping to origin. **Honest caveat new:** free-tier DDoS protection is commercial goodwill, not contract. Any Cloudflare-side change to free-tier DDoS forces a re-cost of the stack.

### 1.2 Layer 2 — Railway (Prod Runtime)

Topology unchanged. New "V3.0 confidence" column added to reflect post-Red-Team honesty:

| Surface | Role | V-phase | V3.0 confidence |
|---|---|---|---|
| Backend service | API server (Next.js route-handlers today) | V2.5 | High |
| Frontend service | Next.js RSC/SSR | V2.5 | High |
| Postgres | Primary OLTP, Pro tier required for PITR 7d | V2.5 | High — but cost-table in §2.4 is honest about Postgres-Pro add-on |
| Redis | Job queue / rate-limit store | V3.0 opt-in | Medium |
| Volumes | Upload-staging, Postgres data | V2.5 default for Postgres | High |
| Env-var store | Secret management, `sealed=true` flag on sensitive vars | V2.5 | High |
| PR Envs (Railway-native) | Per-PR ephemeral deploy | V4.0 (deferred from V3.5; preview-envs stay on Daytona through V3.5 — simpler multi-tenancy) | — |

### 1.3 Layer 3 — Daytona (Sandboxes)

| Surface | Role | V-phase |
|---|---|---|
| Race-sandbox | One container per race-candidate | V2.0-V2.5 (shipping today) |
| Preview-env | One container per PR-branch | V3.0 (behind HMAC-URL gate by default) |
| Dev-env | VS-Code-in-browser per Project | V3.5 |
| Pre-warm pool | Cold-start mitigation | V3.5 (was implied earlier; now explicit) |

**F23 defense (rationale for reusing Daytona for dev-env):** the race-sandbox rationale ("only provider whose API scripts workspace-templates") does not auto-port to dev-env. Dev-env requires: (a) persistent volumes, (b) exposed port + TLS, (c) VS-Code Server bundled in the image. Daytona supports all three; Gitpod discontinued a similar API tier in 2024; Coder is self-hosted-first. The V3.5-gated decision is re-evaluated at that time with a go/no-go ADR — V3.0 only commits to race + preview.

### 1.4 Request Flow (ASCII, annotated with region-enforcement checkpoints)

```
   ┌─────────────┐  DNS: {slug}.patchparty.app / {custom-domain}
   │  End user   │       ↓
   └──────┬──────┘       ↓
          │    TLS handshake (CF Universal SSL)
          ▼
   ┌────────────────────────────────────────────────────────────┐
   │        CLOUDFLARE EDGE (POP nearest user)                  │
   │                                                            │
   │   DNS · WAF (Free-tier OWASP) · DDoS (Free-tier) · CDN    │
   │                                                            │
   │   Worker chain (order matters, V3.0-late-window):          │
   │      [rate-limit-DO] → [canary-split] → [auth-gate?]       │
   │                                                            │
   │   R2 bucket (region-pinned, jurisdiction="eu" when EU)     │
   │                                                            │
   │   ◉ Region Enforcement Check #3 (CF Worker jurisdiction)   │
   └──────────────────┬─────────────────────────────────────────┘
                      │ origin pull only when no cache-hit
                      ▼
   ┌────────────────────────────────────────────────────────────┐
   │        RAILWAY (region-pinned — immutable)                 │
   │                                                            │
   │   Service: frontend (Next.js, SSR/RSC)                     │
   │   Service: backend  (API, cron, workers)                   │
   │   ── private network ──                                    │
   │   Postgres  (PITR 7d, Postgres Pro $29/mo)                 │
   │   Redis     (V3.0 opt-in)                                  │
   │                                                            │
   │   ◉ Region Enforcement Check #1 (Railway project region)   │
   │   ◉ Region Enforcement Check #5 (cron-scheduler)           │
   └────────────────────────────────────────────────────────────┘

   (Dev-time, off the hot path)

   ┌────────────────────────────────────────────────────────────┐
   │            DAYTONA (region-pinned, §2.3)                   │
   │   race-sandbox (V2.5)                                      │
   │   preview-env  (V3.0, HMAC-URL default)                    │
   │   dev-env      (V3.5)                                      │
   │                                                            │
   │   ◉ Region Enforcement Check #6 (Daytona workspace)        │
   └────────────────────────────────────────────────────────────┘

   (Agent-plane LLM calls, off the request path)

   ┌────────────────────────────────────────────────────────────┐
   │            LLM PROVIDERS (Anthropic, V3.0)                 │
   │                                                            │
   │   ◉ Region Enforcement Check #4 (LLM allow-list per proj)  │
   └────────────────────────────────────────────────────────────┘
```

Six Region Enforcement Checks (REC) total. See §2.3 for the enforcement mechanism.

### 1.5 Layer responsibilities (honest one-line rule)

- **Cloudflare** owns the edge and the domain.
- **Railway** owns the runtime and the data.
- **Daytona** owns the ephemeral, agent-facing and developer-facing sandboxes.

**F1 defense (three-provider concentration):** the one-line rule `no layer is substitutable` is not a resilience claim — it is a scope claim. The spec does NOT assert composite resilience. Instead, §1.6 computes composed availability explicitly.

### 1.6 Composed Availability — explicit math (F1, F7, F27 defense)

| Layer | Published availability | PatchParty tier | Notes |
|---|---|---|---|
| Railway (Pro) | No contractual SLA at Pro tier | Pro | Enterprise SLA is per-contract only |
| Cloudflare (Free) | No contractual SLA on Free tier | Free (WAF+DNS+DDoS+Workers) | Commercial goodwill |
| Daytona | No published availability history as of 2026-04 | Standard | Vendor onboarding-page claim, not contract |
| GitHub | 99.95% service targets (published, not SLA'd for Free plan) | GitHub App | Integrations tier |

**Composed probability** (best-case, if each were 99.9% contracted, which none are):
`0.999 × 0.999 × 0.999 × 0.999 = 0.996`  →  **99.6%** composed best-case, equivalent to ~35 hours/year aggregate downtime.

**Actual state (V3.0):** we do not know composed availability because upstream availability is not contractually published for any of the three providers at the tier PatchParty uses. Therefore:

- Studio UI ships a **measured-uptime badge** per Project: "measured-uptime over last 30 days = X.XX%". Badge source: synthetic health-checks from three CF Workers in three POP regions, writing to an immutable `UptimeSample` Prisma model.
- Studio UI ships a **provider-status dashboard** pulling from `status.railway.app`, `www.cloudflarestatus.com`, `status.daytona.io` (or best available) — updated every 60s, visible on Project dashboard.
- Spec retires the phrase "99.9% SLA" entirely. See §6 for the honest checklist replacement.

### 1.7 Degradation-Mode Matrix (new, F1 defense)

What continues to work when each provider has an incident:

| Provider down | Request plane | Agent plane | Repo-Genesis | Release |
|---|---|---|---|---|
| Cloudflare edge down | All Projects unreachable (no graceful fallback; origin direct requires user to hit Railway URL) | Agent calls to LLM unaffected (direct) | BLOCKED (no DNS wiring) | BLOCKED |
| Railway down (control-plane, `backboard.railway.app`) | Existing Projects continue to serve from cached deploy; no new deploys | Agent calls continue | BLOCKED (step 3 of saga) | BLOCKED (deploys queue) |
| Railway down (service-plane, customer's service) | This Project is down | Agent calls continue | Prior projects unaffected | Prior deploys unaffected |
| Daytona down | Request plane unaffected | Races cannot run; preview-envs cannot be created or resumed | Saga succeeds without step 5 (workspace template) — degraded mode | Unaffected |
| GitHub down | Request plane unaffected | Agent cannot push/PR | BLOCKED (step 6, last step) | Deploys from prior commits OK |
| Anthropic API down | Request plane unaffected | Races fail; Deep-Iterate fails | Unaffected | Unaffected |

**Key degradation observation (F3 + F13 defense preview):** because saga step 6 is GitHub-repo-creation (moved to last per §7.4), if GitHub is down the saga aborts at step 6 having already reverse-compensated Daytona + R2 + CF + Railway. No orphan customer-visible repo. **This is the single largest structural change in this V2.**

---

## §2 Railway Spec

### 2.1 API surface (F15 defense)

Endpoint: `https://backboard.railway.app/graphql/v2`. This is Railway's control-plane GraphQL. Red-Team F15 correctly notes it has no published SLA and no change-contract.

**V3.0 mitigations (concrete, citable):**

1. **Schema-snapshot CI:** `scripts/railway-schema-snapshot.ts` runs daily at 04:00 UTC via GitHub Actions. It introspects the Railway schema, diffs against `prisma/railway-schema-snapshot.graphql` in the repo, and opens an issue on any diff. CI does NOT block on the diff (that would block our own pushes); it opens a `railway-schema-drift` labeled issue routed to Nelson's on-call.
2. **Typed client with versioning:** `src/lib/railway/generated.ts` is regenerated on snapshot pass. A `RAILWAY_API_VERSION` constant binds PatchParty code to the last-known-good snapshot.
3. **Circuit breaker:** `src/lib/railway/circuit.ts` wraps all Railway calls. Trips after 3 consecutive non-2xx responses or 10 total errors in a 60s sliding window. When open: Studio UI shows a system banner "Railway control-plane is currently degraded — operations queued." No automatic retry after trip; user sees `infra.railway.circuit_open` event.
4. **Local-sandbox fallback for Repo-Genesis:** if Railway is unavailable at saga start, Repo-Genesis offers to proceed in **"sandbox-only mode"** — skips Railway provisioning, creates a Daytona workspace the user can explore, and marks the Project `status=SANDBOX_ONLY`. On recovery, a user-confirmed retry completes the Railway step.
5. **No commercial SLA negotiated.** Spec documents this as a known residual. Review trigger: re-evaluate if customer count × revenue justifies an enterprise-tier contract (roughly, MRR > €20K/mo).

### 2.2 Default Topology

Unchanged from v1.0 except Redis becomes V3.0-opt-in (not V3.5) because the rate-limit Worker requires durable state (see §3.4.1 rewrite).

```
Railway Project "{Project.slug}"
├── Environment: production
│   ├── Service: frontend   (Dockerfile: ./frontend.Dockerfile)
│   ├── Service: backend    (Dockerfile: ./backend.Dockerfile)
│   ├── Plugin:  postgres   (Postgres 16, PITR 7d default, Postgres Pro $29/mo)
│   └── Plugin:  redis      (V3.0 opt-in; required if rate-limit-DO not feasible)
├── Environment: staging    (V4.0+; shares Postgres via read-only role)
└── Environment: pr-{n}     (Daytona-backed through V3.5, then Railway-native V4.0 optional)
```

### 2.3 Region Pinning — Six Boundaries with Fail-Closed Enforcement (F2, F10, F24 defense, critical)

Region-pinning V1.0 was a single `Project.region` string. Red-Team correctly identified this as a database flag, not an enforcement mechanism. V2 rewrites region-pinning as **six enforcement boundaries**, each:
- Checked at startup against `Project.region`.
- Checked at operation-time per provider call.
- Emits `region.enforcement.violated` PartyEvent + hard-block on mismatch.
- Records the check outcome in `RegionEnforcementCheck` Prisma row.

| REC # | Boundary | Where enforced | Fail-closed behavior |
|---|---|---|---|
| REC-1 | Railway project region | `src/lib/railway/client.ts` pre-flight: every mutation calls `query { project(id:$id){ region } }` and asserts it matches `Project.region`. | Abort mutation; `region.enforcement.violated` event with `{ expected, actual, provider: "railway" }`; support-runbook page. |
| REC-2 | R2 bucket jurisdiction | Bucket-create call includes `jurisdiction: "eu"` when `Project.region == EU`. Validated at bucket-list time in a nightly cron. | Block writes if jurisdiction mismatch; DSR-compatible erasure flow prepares to migrate content (manual intervention). |
| REC-3 | Cloudflare Worker placement | V3.0 ships EU-only Workers (single `route` tied to zone) by default. EU Projects disable Worker global-execution via `placement: { mode: "smart", hint: "eu" }` where supported; where not (confirmed limitation as of 2026-04 — Workers-Smart-Placement does not yet support hard jurisdiction), spec explicitly records a **residual risk** in §11.5. |
| REC-4 | LLM-provider region allow-list | `src/lib/llm/region-guard.ts` wraps every LLM-call. Per-Project allow-list (default: `eu-west` endpoint for Anthropic when Project.region == EU; US otherwise). No LLM call may cross the allow-list boundary. | Abort call; `region.enforcement.violated` with `{ expected_endpoint, actual_endpoint, provider: "anthropic" }`; user visible. |
| REC-5 | Cron-scheduler region | Railway's `cron` schedules inherit region from parent service. Explicit assertion at cron-invocation-time: env-var `PATCHPARTY_REGION` must equal `Project.region`. | Abort cron body; alert to ops; automatic disable after 3 fails in 24h. |
| REC-6 | Daytona workspace region | Workspace-template YAML declares `region:` key. Daytona client asserts after workspace-create that the workspace's assigned region matches. | Destroy workspace; `region.enforcement.violated` with `{ expected, actual, provider: "daytona" }`. |

**Startup-check:** on every backend service start, `src/lib/infra/startup-check.ts` runs all six boundary checks and logs a single `region.enforcement.boundary_check` PartyEvent with a 6-boolean result. If any fail, the service **refuses to start** for EU-flagged Projects (fail-closed). For US/APAC Projects in V3.0, the startup-check logs-but-continues; full fail-closed becomes V3.5 across all regions.

**Fallback mechanism:** if REC-3 (Cloudflare Worker jurisdiction) cannot be guaranteed due to platform limits, Workers that process EU-personal-data must be **disabled for EU Projects** in V3.0. This affects the rate-limit Worker (moves to in-app Railway-side rate-limit for EU) and auth-gate Worker (moves to HMAC-signed URL for EU). Canary-Worker can remain because it does not read request bodies.

**Why this matters:** Red-Team F2's thesis was that "HARD GDPR" is a flag, not enforcement. V2 response: "HARD GDPR" phrase is killed from the spec and vision (per triage Q1/Q10). Replacement is "six-boundary enforcement with fail-closed startup check and audited `region.enforcement.*` event stream." No single claim of compliance; a measurable property instead.

### 2.3.1 Region-inference fallback (F20 open question resolution, related to F2)

1. If user explicitly sets `Project.region` → use it.
2. Else, infer from user's Cloudflare Account locale + GitHub profile country, with a confidence score.
3. If confidence < 0.8, **show a modal** at Project-create time. No silent fallback.
4. If user dismisses modal → default EU (conservative jurisdiction).

### 2.4 Cost Tiers — Honest Table (F21 defense)

| Tier | Railway base | Postgres Pro | Est. egress | Est. volume storage | **Real all-in** | Suitable for |
|---|---|---|---|---|---|---|
| Hobby | $5/mo | (not available on Hobby) | Included | 0.5 GB included | $5/mo | Demo-Mode, hackathon, throwaway |
| Pro Starter | $20/mo | $29/mo (required for PITR) | $0-5/mo low-traffic | $0-3/mo incremental | **~$50-60/mo** | Single Brownfield/Greenfield under moderate load |
| Pro Scale | $20/mo + per-seat | $29/mo | $5-25/mo | $3-15/mo | **~$75-120/mo** | Multi-service / higher-traffic |
| Team | $50/mo+ per workspace | $29/mo each DB | $20+ | $15+ | **~$150+/mo** | Multi-project agency setups |

**Triage Q9 cost-passthrough disclosure requirement (V3.0):** Studio settings page under *Billing → Infra Pass-Through* shows a live estimate:

> Your Project currently consumes:
> - Railway Pro Starter: €20/mo
> - Postgres Pro add-on: €29/mo
> - Estimated egress (last 30d measured): €4/mo
> - Total Railway pass-through: **€53/mo**
>
> (+ PatchParty Studio subscription €19/mo + LLM pass-through variable)

Cost disclosure lives at `/app/settings/billing` and is rendered from the existing V2.0 billing-pull. This is the V3.0 replacement for BYOK-for-Infra (deferred V4.0).

### 2.5 Service Spec (Prisma-adjacent YAML)

Unchanged from v1.0 structurally. One addition: `region:` field asserted on every service.

```yaml
# .patchparty/railway.yaml — generated by Repo-Genesis, committed to repo
project_slug: "{Project.slug}"
region: "europe-west4"              # REC-1 enforced
region_jurisdiction: "eu"           # for REC-2 R2 propagation
services:
  frontend:
    dockerfile: ./Dockerfile.frontend
    start_command: "node .next/standalone/server.js"
    root_directory: /
    healthcheck_path: /api/health
    healthcheck_timeout_s: 30
    resources:
      cpu_vcpu: 1.0
      memory_mb: 1024
    env_vars:
      - NEXT_PUBLIC_APP_URL
      - NEXT_PUBLIC_API_URL
      - SENTRY_DSN
      - PATCHPARTY_REGION           # REC-5 enforced
    replicas: 1
    autoscaling:
      enabled: false
  backend:
    dockerfile: ./Dockerfile.backend
    start_command: "node dist/server.js"
    healthcheck_path: /health
    healthcheck_timeout_s: 30
    resources:
      cpu_vcpu: 1.0
      memory_mb: 2048
    env_vars:
      - DATABASE_URL
      - REDIS_URL
      - ANTHROPIC_API_KEY
      - GITHUB_APP_PRIVATE_KEY
      - CLOUDFLARE_API_TOKEN
      - PATCHPARTY_REGION
    replicas: 1
plugins:
  postgres:
    version: "16"
    pitr_retention_days: 7
    backup_schedule: "0 2 * * *"
  redis:
    enabled: false                  # V3.0 opt-in
```

### 2.6 Deploy command — appendix only (F17, F34 defense)

Nelson's Windows-specific convention has moved to the appendix (Appendix A), not the spec body. The spec body now states the **abstract rule** only:

> **Rule:** every successful `git push` SHOULD be followed by a Railway deploy of the affected services. Where Railway is unavailable (circuit-breaker open, per §2.1), the deploy is queued to `DeploymentQueue` (Prisma model, new, §9) and the user sees a dashboard card "Railway offline — deploy queued." Push is not blocked.

Appendix A documents the local shell convention with a note that it is a developer-convenience snippet, not normative.

### 2.7 Environment Variables

All env-vars land via GraphQL `variableUpsert`. No secrets in repo. Repo-Genesis seeds `.env.example` with keys + docstrings; actual values sync from `ProjectSecret` (Prisma, AES-GCM at rest, key rotation cadence in §8.5) into Railway at provision-time.

Sensitive env-vars flagged `sealed=true` — appear as `••••` in Railway dashboard, rotation-only.

**Rotation cadence (F26 response, V3.0 partial):**
- Per-provider cadence documented: Railway tokens 90d; CF tokens 90d; Daytona tokens 180d; GitHub App private key 365d.
- Each provider has a `POST /infra/rotate/{provider}` endpoint that rotates + re-validates.
- Cross-provider orchestrator (single-pane rotation) **defers to V4.0** (F26 explicit defer per triage Q9 spirit).

---

## §3 Cloudflare Spec

### 3.1 API surface

Endpoint: `https://api.cloudflare.com/client/v4`.

Auth: API Token scoped to `DNS.edit, Workers.edit, R2.edit, Access.edit, Pages.edit`. Scope assertion in `CloudflareConfig.scope` enum on our side detects under-permission before any Saga step runs.

### 3.2 DNS Auto-Wiring

Every new Project gets `{slug}.patchparty.app` via our root zone (managed mode only in V3.0).

```
{slug}.patchparty.app            →  CNAME → {railway-generated}.up.railway.app
*.preview.{slug}.patchparty.app  →  CNAME → {daytona-preview-hostname}
```

TLS auto-issue via Cloudflare Universal SSL. Validity monitored by nightly cron calling `GET /zones/{id}/ssl/certificate_packs`; emits `infra.cf.cert_expiring` at 30-day threshold.

### 3.3 Custom Domain Flow (F6 defense — drop the word "atomic")

User flows remain the same — copy two records (CNAME + TXT), poll via DoH. What changed:

- **Vision §1.5 claim:** the phrase "brief to production-URL in one session" is **softened** to "brief to best-effort-deployed PR in one session." Custom-domain setup may exceed one session due to DNS propagation (60-120s cert issuance + 300s-TTL worst-case DNS propagation = up to 7-8 minutes). Studio UI shows this expectation verbatim on the domain-setup card.
- **No "atomic DNS" claim anywhere** — see §5 Blue-Green rewrite for the Worker-origin-swap mechanism replacement.

### 3.4 Cloudflare Workers (V3.0-late-window)

**F32 defense (Worker tenancy plan):** V3.0 uses **PatchParty's Cloudflare account** for all Workers. Per-Project Workers deploy as named scripts `{project-slug}-rate-limit`, `{project-slug}-canary`, `{project-slug}-auth-gate`, `{project-slug}-canary-observer`.

**Free-tier Workers quota:** CF Free tier = 100K requests/day, 10ms CPU burst. We occupy at most 4 Worker scripts per Project; CF Free account supports 1000 scripts/account → **maximum 250 Projects per account before we hit the script quota**. V3.0 ships a CF-account-sharding plan in §3.4.0 to scale past 250 projects.

#### 3.4.0 CF-account sharding (V3.0 requirement)

- Spec provisions a pool of CF accounts at PatchParty root: `pp-fleet-{1..N}`.
- Projects are assigned sequentially; each account holds ~200 Projects (headroom).
- Account-assignment persisted on `Project.cfAccountIndex` (new Prisma field, §9).
- Billing is consolidated to a single CF Enterprise account at V4.0 when customer count justifies; V3.0 keeps Free-tier per account.

#### 3.4.1 Rate-Limit Worker (F18 rewrite)

V1.0 used CF KV with sliding-window, IP-keyed. Red-Team F18 broke this five ways: IP rotation bypass; NAT false-positives; KV eventual-consistency; no Retry-After enforcement; no anon/auth split. V2 rewrite:

**V3.0 rate-limit is a Durable Object, not KV.** Durable Objects give per-key strong consistency. Keying strategy is tiered:

| Tier | Key | Limit |
|---|---|---|
| anon | `ip + UA fingerprint + route` | 60 req/min (lower — harder to sybil-attack) |
| authed | `user.id + route` | 300 req/min |
| service-to-service (server-side-render origin-pull) | service-JWT sub | 3000 req/min |

Enforcement is a **token bucket** (refill 1/s or 5/s or 50/s depending on tier) with `Retry-After` honored server-side — the Worker tracks clock-skew and refuses client-claimed-retry shorter than its own calculation.

**Durable Object shape (abbreviated):**

```ts
// workers/rate-limit/do.ts — simplified
export class RateLimitDO {
  state: DurableObjectState;
  buckets = new Map<string, { tokens: number; refilledAt: number }>();
  constructor(state: DurableObjectState) { this.state = state; }

  async fetch(req: Request): Promise<Response> {
    const { key, refillPerSec, capacity } = await req.json();
    const now = Date.now();
    const b = this.buckets.get(key) ?? { tokens: capacity, refilledAt: now };
    const elapsed = Math.max(0, (now - b.refilledAt) / 1000);
    b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSec);
    b.refilledAt = now;
    if (b.tokens < 1) {
      this.buckets.set(key, b);
      return new Response(JSON.stringify({ ok: false, retry_after_ms: 1000 / refillPerSec }), { status: 429 });
    }
    b.tokens -= 1;
    this.buckets.set(key, b);
    return new Response(JSON.stringify({ ok: true, remaining: Math.floor(b.tokens) }), { status: 200 });
  }
}
```

The Worker front-end picks tier based on `Authorization: Bearer` header presence (authed vs anon), user-agent hashing (fingerprint), and a signed service-JWT header for SSR origin-pulls.

**Fallback (EU REC-3 residual):** for EU-flagged Projects where Workers cannot be jurisdiction-pinned with certainty, rate-limit moves into Railway-side middleware (Redis-backed, per-Project). This is slower by 20-50ms but region-enforced.

**Known trade-off (documented):** Durable Objects are a **paid-tier** CF feature. Free-tier Workers cannot use them. V3.0 adopts paid-tier Workers for the rate-limit layer; this is a €5/mo floor per CF account. The cost-passthrough disclosure (§2.4) includes it.

#### 3.4.2 Canary-Split Worker (unchanged from v1.0 structurally)

Kept verbatim. The open-loop problem (F5) is solved by the **new Canary Observer Worker** (§3.4.4), not by modifying the splitter.

```ts
// workers/canary-split/index.ts — UNCHANGED FROM v1.0
export interface Env {
  CANARY_PERCENT: string;
  BLUE_ORIGIN: string;
  GREEN_ORIGIN: string;
  CANARY_OVERRIDE_COOKIE: string;
}
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const percent = Number(env.CANARY_PERCENT ?? "0");
    const cookie = req.headers.get("cookie") ?? "";
    const forceGreen = cookie.includes(`${env.CANARY_OVERRIDE_COOKIE}=green`);
    const forceBlue  = cookie.includes(`${env.CANARY_OVERRIDE_COOKIE}=blue`);
    let target: "blue" | "green";
    if (forceGreen) target = "green";
    else if (forceBlue) target = "blue";
    else {
      const fingerprint =
        (req.headers.get("cf-connecting-ip") ?? "") +
        (req.headers.get("user-agent") ?? "");
      const bucket = hashToPercent(fingerprint);
      target = bucket < percent ? "green" : "blue";
    }
    const origin = target === "green" ? env.GREEN_ORIGIN : env.BLUE_ORIGIN;
    const upstream = new URL(url.pathname + url.search, origin);
    const forwarded = new Request(upstream.toString(), req);
    forwarded.headers.set("x-pp-canary-target", target);
    forwarded.headers.set("x-pp-canary-percent", String(percent));
    const res = await fetch(forwarded);
    const hdrs = new Headers(res.headers);
    hdrs.set("x-pp-canary-target", target);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: hdrs });
  },
};
function hashToPercent(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % 100;
}
```

#### 3.4.3 Auth-Preview-Gate Worker (F12, F16 defense — HMAC-signed URL default)

**V2 default preview-env gate is HMAC-signed URLs, NOT CF Access.** CF Access becomes an opt-in upgrade for customers who are already on CF Teams.

HMAC-signed URL flow:

1. PatchParty backend mints a preview-URL of shape:
   `https://pr-123.preview.{slug}.patchparty.app/?t={expiry-timestamp}&s={HMAC-SHA256(expiry+path, PER_PROJECT_SECRET)}`
2. The CF Worker at the preview subdomain verifies HMAC + timestamp + single-use nonce (stored in KV with TTL matching expiry).
3. Default expiry is 24h, renewable by clicking "extend" in Studio.
4. No CF Teams account required → F16 resolved.

**CF Access upgrade path:** Project admins can toggle `Settings → Preview Env Gate → CF Access`. Workers logic falls through to the CF Access Worker instead.

**Verbatim TS for HMAC gate:**

```ts
// workers/auth-preview-gate/index.ts — V2 rewrite
export interface Env {
  PREVIEW_SIGNING_SECRET: string;
  USED_NONCES_KV: KVNamespace;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const t = url.searchParams.get("t");
    const s = url.searchParams.get("s");
    if (!t || !s) return unauthorized("missing_signature");

    const expiry = Number(t);
    if (!Number.isFinite(expiry) || expiry < Date.now()) return unauthorized("expired");

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.PREVIEW_SIGNING_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    const data = new TextEncoder().encode(`${t}|${url.pathname}`);
    const sigBytes = Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!ok) return unauthorized("bad_signature");

    const nonce = `${t}:${s.slice(0, 16)}`;
    const seen = await env.USED_NONCES_KV.get(nonce);
    if (seen) return unauthorized("replayed");
    await env.USED_NONCES_KV.put(nonce, "1", { expirationTtl: Math.floor((expiry - Date.now()) / 1000) + 60 });

    const upstream = new URL(url.pathname + url.search, "https://internal.preview-origin");
    return fetch(new Request(upstream.toString(), req));
  },
};

function unauthorized(reason: string): Response {
  return new Response(JSON.stringify({ error: "unauthorized", reason }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
```

**F30 defense (iframe SameSite cookie risk):** because HMAC-URL uses query-string auth (not cookie), iframe embed of preview URLs is safe for SameSite-strict contexts. Stripe checkout / Intercom widget embeds continue to function.

#### 3.4.4 Canary Observer Worker (F5, F25 defense — NEW in V2)

V1.0 advertised "each step gated by health-check" with no mechanism. V2 introduces a dedicated Worker that runs on a scheduled trigger (every 30s) during active canary windows, polls both origins, and calls the promote/demote API.

**Verbatim TS:**

```ts
// workers/canary-observer/index.ts — NEW V2
export interface Env {
  CANARY_STATE_DO: DurableObjectNamespace;   // stores current step + window
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  PROJECT_SLUG: string;
  BLUE_HEALTH_URL: string;    // https://{slug}-blue.up.railway.app/api/health
  GREEN_HEALTH_URL: string;
  SLO_P95_MS_MAX: string;     // "800"
  SLO_ERROR_RATE_MAX: string; // "0.005"
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const id = env.CANARY_STATE_DO.idFromName(env.PROJECT_SLUG);
    const stub = env.CANARY_STATE_DO.get(id);
    const state = await stub.fetch("https://internal/state").then((r) => r.json()) as {
      activeStep: number;
      windowStartedAt: number;
      flapCount: number;
    };
    if (state.activeStep === 0 || state.activeStep === 100) return; // no canary in flight

    const [blue, green] = await Promise.all([
      pollHealth(env.BLUE_HEALTH_URL),
      pollHealth(env.GREEN_HEALTH_URL),
    ]);
    const sloP95 = Number(env.SLO_P95_MS_MAX);
    const sloErr = Number(env.SLO_ERROR_RATE_MAX);

    const greenHealthy = green.p95Ms < sloP95 && green.errorRate < sloErr && green.httpOk;
    const windowElapsedMs = Date.now() - state.windowStartedAt;
    const windowGoalMs = 5 * 60_000; // 5-min window per step

    if (!greenHealthy) {
      await stub.fetch("https://internal/flap-inc", { method: "POST" });
      if (state.flapCount + 1 >= 3) {
        await rollbackToZero(env);
        await stub.fetch("https://internal/reset", { method: "POST" });
      }
      return;
    }

    if (windowElapsedMs >= windowGoalMs) {
      const next = nextStep(state.activeStep);
      await setCanaryPercent(env, next);
      await stub.fetch("https://internal/advance", {
        method: "POST",
        body: JSON.stringify({ step: next }),
      });
    }
  },
};

async function pollHealth(url: string): Promise<{ p95Ms: number; errorRate: number; httpOk: boolean }> {
  const SAMPLES = 20;
  const results: number[] = [];
  let errors = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) errors++;
      results.push(Date.now() - t0);
    } catch {
      errors++;
      results.push(2000);
    }
  }
  results.sort((a, b) => a - b);
  const p95Ms = results[Math.floor(SAMPLES * 0.95)];
  return { p95Ms, errorRate: errors / SAMPLES, httpOk: errors < SAMPLES };
}

function nextStep(cur: number): number {
  if (cur < 5) return 5;
  if (cur < 25) return 25;
  if (cur < 50) return 50;
  return 100;
}

async function setCanaryPercent(env: Env, pct: number): Promise<void> {
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/scripts/${env.PROJECT_SLUG}-canary/settings`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${env.CF_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        bindings: [{ type: "plain_text", name: "CANARY_PERCENT", text: String(pct) }],
      }),
    },
  );
}

async function rollbackToZero(env: Env): Promise<void> {
  await setCanaryPercent(env, 0);
}
```

**SLO specifications (F25 defense — `DeploymentRun.healthGatePassed` semantics):**

| Tier | p95 latency max | Error-rate max | Window | Flap threshold |
|---|---|---|---|---|
| Hobby | 2000ms | 2% | 3 min | 5 flaps |
| Pro | 800ms | 0.5% | 5 min | 3 flaps |
| Team | 500ms | 0.2% | 7 min | 2 flaps |

**DeploymentRun.healthGatePassed definition:** set `true` iff the observer records 2 consecutive passing windows at the target step AND no flap events in the window.

### 3.5 Access (SSO) — opt-in only (F12, F16)

Per §3.4.3 defense, CF Access is NOT the default gate. For customers who opt in:

- **GitHub** (most compatible).
- **Google Workspace** (configurable).
- **Okta / SAML** (V3.5+).

Access-policy per Project (only when opted in):
- `preview.*.{slug}.patchparty.app` → Group: `project-{slug}-members`, default IdP: GitHub, MFA required.
- `{slug}.patchparty.app` → public; Access opt-in only if user toggles staff-only.

### 3.6 R2 (F19 defense — tenancy model explicit)

**V3.0 chooses per-project buckets.**

Rationale (formal analysis):

| Axis | Per-project | Shared + prefix |
|---|---|---|
| GDPR erasure | bucket-delete, atomic | object-by-object, slower |
| CF account quota | limited bucket count per account (1000/account confirmed) | one bucket, infinite prefixes |
| IAM / RLS | bucket-level IAM | prefix-level IAM (harder; no native R2 prefix-IAM) |
| Cross-tenant bug risk | zero | high (prefix-mis-scoping) |
| Cost math | cleanly per-project | must compute per-prefix |

**Decision:** per-project. Account-sharding plan (§3.4.0) handles the 1000-bucket/account quota at scale.

Bucket naming: `pp-{project-id}-assets` with `jurisdiction: "eu"` when `Project.region == EU` (REC-2).

Signed URL issuance: `presign` is a **fourth Worker** per Project, or (for EU REC-3 residual) moves to Railway-side. Egress is $0.

### 3.7 Pages (V4.0, deferred from V3.5)

Per F22 defense. V3.0/V3.5 do not ship CF Pages. Marketing/docs deploy from `docs/` subfolder to the same Railway frontend service. This resolves the scope contradiction. V4.0 re-evaluates CF Pages with a go/no-go ADR.

### 3.8 CDN cache-hit — NOT a spec promise (F8 defense)

V1.0 `§3.8` asserted ">80% cache-hit." V2 removes the percentage entirely. Spec states:

> CDN + edge cache is **available**. Application-level cacheability is the responsibility of the generated code and is not guaranteed by this spec. Cache-hit rate is surfaced as a **dashboard metric**, not an SLO. Phase 7 Quality-pass checks that cacheable routes have appropriate `Cache-Control` headers; this is a code-quality check, not an infra promise.

---

## §4 Daytona Expansion

### 4.1 V2.5 — Race Sandbox (shipping, unchanged)

Same as v1.0.

### 4.2 V3.0 — Preview-Env per PR

Unchanged structurally. Key F11/F28 fix: **PR close webhook destroys preview-env immediately, not after 7d TTL.**

`src/app/api/github/webhook/route.ts` handles:
- `pull_request.closed` → `PreviewEnv.lifecycle = DESTROYED`, emit `preview.destroyed` with `reason: "pr_closed"`.
- `pull_request.synchronize` → pre-warm hint sent to Daytona (if pre-warm pool available in V3.5).

Cost footgun mitigation:
- Per-project preview-env concurrent cap (default: 3; Team tier: 10).
- Auto-pause 30-min idle kept.
- `/app/settings/infra` shows live preview-env count + daily cost.

### 4.3 V3.5 — Dev-Env (VS-Code-in-Browser)

Unchanged from v1.0 except reaffirms F23 defense: the reuse-Daytona rationale is re-validated at V3.5 with a separate ADR.

### 4.4 V3.5 — Pre-warm pool (cold-start mitigation, F new)

Pool of N (default 3) pre-warmed workspaces per region per Project-class. On preview-resume, swap user-state into pre-warmed instance. Cold-start observed drops from 30-60s to 4-8s.

### 4.5 Workspace Template (unchanged from v1.0 — with `region:` added)

```yaml
apiVersion: daytona.io/v1
kind: WorkspaceTemplate
metadata:
  name: "{project-slug}-preview"
  labels:
    project-id: "{project-id}"
    lifecycle: preview
spec:
  region: "eu-west"              # REC-6 enforced
  image: "patchparty/preview-env:v3-{YYYYMMDD}"
  git:
    repository: "https://github.com/{owner}/{repo}.git"
    checkoutBranch: "${DAYTONA_BRANCH}"
  resources:
    cpu: "1.5"
    memory: "3Gi"
    disk: "10Gi"
  ports:
    - number: 3000
      protocol: https
      visibility: private
  env:
    - name: DATABASE_URL
      valueFrom:
        secretRef: "${PROJECT_SLUG}-preview-db-url"
    - name: NEXT_PUBLIC_APP_URL
      value: "https://${DAYTONA_BRANCH}.preview.${PROJECT_SLUG}.patchparty.app"
    - name: PATCHPARTY_REGION
      value: "eu"
  lifecycle:
    ttlAfterLastActivity: "7d"
    pauseAfterIdle: "30m"
    resumeOnRequest: true
  postCreate:
    - npm ci
    - npx prisma migrate deploy
    - npm run build
  startCommand: "npm run start"
```

### 4.6 Resource Limits and Cost Model

Unchanged from v1.0; cost-passthrough disclosure propagates to the Billing page per triage Q9.

---

## §5 Release Strategies — phased by version

V1.0 conflated three strategies as V3.0-ready. V2 phases them honestly.

### 5.1 Big-Bang — V2.5 only (F20 defense)

**Big-Bang is the V2.5 default and only strategy.** Canary + Blue-Green do not exist in V2.5.

**Anti-pattern guards — revised:**
- Big-Bang is labeled in UI as *"V2.5 default — automated canary arrives in V3.0"* (honest, not pejorative).
- Greenfield Projects see a pop-up: *"First release goes live all at once. Rollback = redeploy previous commit. No traffic-split. Acknowledged?"* with explicit `deploy.bigbang.acknowledged` PartyEvent including user typed-confirmation.
- Autopilot-Advisor (V3.0) **cannot select** Big-Bang — only Director mode can.

**Rationale for keeping Big-Bang in V2.5:** V2.5 has 12 weeks to ship (triage §0 principle 2). Canary requires Workers, Durable Objects, Observer, and SLO infrastructure — out of scope V2.5.

### 5.2 Canary — V3.0 (F5 defense complete)

Full Canary is V3.0. Four Workers (rate-limit, canary-split, auth-gate, canary-observer) deploy per Project. SLO per tier (§3.4.4 table). Observer closes the promote/demote loop automatically; Director mode can override.

**Promotion ladder:** 0% → 5% → 25% → 50% → 100%. Observer advances after passing-window or rolls back after flap-threshold.

**Verbatim promotion call (shell, unchanged from v1.0 for operator-convenience):**

```bash
#!/usr/bin/env bash
set -euo pipefail
SLUG="${1:?project slug required}"
STEP="${2:?percent required: 5|25|50|100}"
curl -fsS -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/${SLUG}-canary/settings" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"bindings\": [
      { \"type\": \"plain_text\", \"name\": \"CANARY_PERCENT\", \"text\": \"${STEP}\" },
      { \"type\": \"plain_text\", \"name\": \"BLUE_ORIGIN\",  \"text\": \"https://${SLUG}-blue.up.railway.app\" },
      { \"type\": \"plain_text\", \"name\": \"GREEN_ORIGIN\", \"text\": \"https://${SLUG}-green.up.railway.app\" },
      { \"type\": \"durable_object_namespace\", \"name\": \"RATE_LIMIT_DO\", \"namespace_id\": \"${CF_DO_ID}\" }
    ]
  }"
```

Primary path is the Observer Worker, not the shell script. Script is for operator break-glass.

### 5.3 Blue-Green — V3.5 (F6 defense — Worker-origin-swap, not DNS-atomic)

**V2 names the mechanism correctly:** Blue-Green is NOT an "atomic DNS swap." It is a **Worker origin re-bind**. A single `PUT /workers/scripts/{name}/settings` mutation flips the `ACTIVE_ORIGIN` binding globally in ~1s — bypasses DNS propagation entirely.

**Verbatim swap:**

```bash
#!/usr/bin/env bash
set -euo pipefail
SLUG="${1:?project slug required}"
TARGET="${2:?target color: blue|green}"
TARGET_ORIGIN="https://${SLUG}-${TARGET}.up.railway.app"

curl -fsS -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/${SLUG}-bluegreen/settings" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"bindings\": [
      { \"type\": \"plain_text\", \"name\": \"ACTIVE_ORIGIN\", \"text\": \"${TARGET_ORIGIN}\" }
    ]
  }"
```

**DNS is not touched.** The word "atomic" does not appear in the Studio UI, the spec, or marketing copy.

### 5.4 Multi-region — V4.0 (F9 defense, triage principle)

Multi-region with cross-region DB replication **defers to V4.0**. V3.0/V3.5 ship single-region projects only. Region chosen at Project creation, immutable.

V3.5 "multi-region" is **region-pick-per-Project** (the user chooses ONE region at Project create; different Projects can live in different regions). This is honestly labeled *"region-pick"* in the UI, not *"multi-region."*

---

## §6 Production-Grade Checklist V3.0 (F14 defense)

V1.0 shipped a 10-item "International-Standard Checklist." Per triage Q1 this phrase is killed. V2 replaces with the **Production-Grade Checklist V3.0 — 6 items, honest:**

1. **TLS via upstream CA (CF Universal SSL)** — auto-issued + 30-day-expiry monitoring cron.
2. **WAF at CF Free tier (OWASP Core Ruleset)** — active on all hostnames. Best-effort; upgrade path to CF Pro documented.
3. **PartyEvent audit-log, append-only, hash-chained** — 365d retention minimum; hash-chain ensures tamper-detect; CSV export supported.
4. **Postgres PITR 7d** — Railway Postgres Pro default; 30d upgrade available on Team tier. Backup schedule 02:00 daily.
5. **Health-check gate before route promotion** — every deploy (Big-Bang, Canary, Blue-Green) blocks on `/api/health` returning 200 for 60 consecutive seconds at the Hobby/Pro SLO thresholds (§3.4.4) before `DeploymentRun.status = SUCCEEDED`. Auto-rollback on failure.
6. **DPA template for customer data-processing** — `LEGAL/DPA-TEMPLATE.md` in repo lists sub-processors (Railway, Cloudflare, Daytona, Anthropic, Vercel-if-used, GitHub). Customers sign this separately from the main T&Cs. Sub-processor notification SLA: 30 days.

**Explicitly removed from the checklist** (were in v1.0):
- ~~SOC-2-ready audit-log~~ → renamed to "PartyEvent append-only audit-log" (no SOC-2 claim)
- ~~99.9% SLA via health-check gate~~ → renamed to "health-check gate" (no SLA claim)
- ~~Multi-region deploy option~~ → V4.0 roadmap, not checklist
- ~~DDoS protection default~~ → platform feature, not PatchParty-checklist item (commercial goodwill from CF, not contracted)

**Fail-any = red banner on Project dashboard** kept as mechanism.

---

## §7 Repo-Genesis Saga — Persisted State Machine (F3, F13, F33 defense)

V1.0 Saga was `async` pseudocode with reverse-order compensate. Red-Team F3/F13/F33 broke it four ways: compensate-mid-compensate failure, orphan-billing window, empty-repo ghost, non-idempotent retries. V2 rewrites as a persisted state machine backed by Postgres advisory-locks + idempotency keys + a reconciliation cron.

### 7.1 State Model

New Prisma model `RepoGenesisRun` (§9). Columns: `id`, `projectId`, `idempotencyKey` (client-generated UUIDv4), `status` (enum: PENDING, RUNNING, COMPENSATING, SUCCEEDED, FAILED_COMPENSATED, FAILED_ORPHAN, FAILED_ABANDONED), `currentStep` (int 0-6), `stepStates` (JSON map of per-step status + resource-ids), `advisoryLockKey` (bigint for pg_try_advisory_lock), `createdAt`, `updatedAt`.

**Advisory lock:** before any step executes, worker calls `SELECT pg_try_advisory_lock($advisoryLockKey)`. Prevents concurrent execution of the same saga on double-click or two-workers-racing.

**Idempotency:** the `idempotencyKey` is unique per (user, brief-hash). If the same user clicks retry, the SAME saga resumes from its persisted `currentStep`. No second Railway project gets created.

### 7.2 Step Order — REVERSED (F13 defense, biggest structural change)

**V1.0 order:** GitHub → Railway → CF → R2 → Daytona. Red-Team F13 correctly identified: if GitHub-success then Railway-crash, user has a visible empty repo + no URL + potential double-billing on retry.

**V2 order — GitHub is LAST:**

| # | Step | Provider | Forward | Compensate | Idempotency token |
|---|---|---|---|---|---|
| 1 | Reserve slug + allocate advisory lock | Postgres | `INSERT INTO Project(slug, status='RESERVED')` | `DELETE Project WHERE id=X AND status='RESERVED'` | client UUID |
| 2 | Provision Railway | Railway | `mutation projectCreate` + services + Postgres-Pro | `mutation projectDelete` | `idempotencyKey-step2` header |
| 3 | Provision Cloudflare edge | CF | `POST /zones/{id}/dns_records` + Workers deploy | `DELETE /zones/{id}/dns_records/{id}` + `DELETE /workers/scripts/*` | per-record CF-idempotency-header |
| 4 | Provision Cloudflare R2 | CF | `POST /accounts/{id}/r2/buckets` (`jurisdiction=eu`) + presign-key | `DELETE /accounts/{id}/r2/buckets/{name}` | bucket-name is idempotent |
| 5 | Provision Daytona workspace-template | Daytona | `POST /workspace-template` | `DELETE /workspace-template/{id}` | template-name is idempotent |
| 6 | **Create GitHub repo + initial push** | GitHub App | `POST /repos` + pushes generated code | `DELETE /repos/{owner}/{name}` | repo-name check before create |

**Why this order:**
- If ANY of steps 1-5 fails, the user never sees a GitHub repo in their org. Compensation unwinds our-controlled resources; user's GitHub org is untouched.
- If step 6 fails, we've provisioned all four of OUR resources but the user has no repo. Compensation-order reversed: Daytona → R2 → CF → Railway → slug-release.
- The "visible empty repo" problem (F13) **cannot occur** because repo creation happens after all other resources are confirmed.

### 7.3 Compensation-of-Compensation (F33 defense)

V1.0 had no policy for compensate-of-compensate failure. V2 introduces:

```
State: COMPENSATING
  On per-step compensate-success: decrement currentStep, continue
  On per-step compensate-failure:
    - retry 3 times with exponential backoff (250ms, 1s, 4s)
    - if still failing: transition to FAILED_ORPHAN state
    - record orphan resource in `OrphanedResource` Prisma table
    - page a human operator (pages-URL + issue-open)
    - ReconciliationCron (§7.4) attempts recovery on next tick
    - Billing NOT charged to user while in FAILED_ORPHAN
```

**`FAILED_ORPHAN` terminal state** explicitly does NOT charge the customer. The billing pipeline filters out `RepoGenesisRun.status IN ('FAILED_COMPENSATED', 'FAILED_ORPHAN', 'FAILED_ABANDONED')` rows.

### 7.4 Reconciliation Cron

New file `src/app/api/cron/saga-reconcile/route.ts`. Runs every 5 min via Railway cron-scheduler. For each `OrphanedResource`:
1. Re-attempt delete via provider API.
2. On success: mark reconciled, update `RepoGenesisRun.status = 'FAILED_COMPENSATED'`.
3. On failure: increment retry counter; after 10 retries over 24h, mark `FAILED_ABANDONED` and escalate to on-call.

Cron also scans for **zombie runs** (`status='RUNNING'` but no progress in 10 min) and transitions them to `COMPENSATING`.

### 7.5 Saga Executor (real TypeScript, not pseudocode)

```ts
// src/lib/repo-genesis/executor.ts — V2, real not pseudo
import { prisma } from "@/lib/prisma";
import { PartyEvent } from "@/lib/events";
import { acquireAdvisoryLock, releaseAdvisoryLock } from "@/lib/infra/locks";

export type StepName = "slug" | "railway" | "cloudflare" | "r2" | "daytona" | "github";
export interface StepResult { ok: boolean; resourceIds: Record<string, string>; errorMessage?: string; }
export interface Step {
  name: StepName;
  forward: (ctx: SagaCtx) => Promise<StepResult>;
  compensate: (ctx: SagaCtx, state: StepResult) => Promise<void>;
  timeoutMs: number;
  maxRetries: number;
}

export interface SagaCtx {
  runId: string;
  projectId: string;
  idempotencyKey: string;
  region: string;
}

export async function runSaga(
  ctx: SagaCtx,
  steps: Step[],
): Promise<{ status: "SUCCEEDED" | "FAILED_COMPENSATED" | "FAILED_ORPHAN" }> {
  const locked = await acquireAdvisoryLock(ctx.runId);
  if (!locked) throw new Error("saga_already_running");

  try {
    const run = await prisma.repoGenesisRun.findUnique({ where: { id: ctx.runId } });
    if (!run) throw new Error("run_not_found");

    const stepStates = (run.stepStates as Record<string, StepResult>) ?? {};

    for (let i = run.currentStep; i < steps.length; i++) {
      const step = steps[i];
      await PartyEvent.emit({ type: "saga.step.start", runId: ctx.runId, step: step.name });
      let result: StepResult | undefined;
      let lastErr: unknown;
      for (let retry = 0; retry < step.maxRetries; retry++) {
        try {
          result = await withTimeout(step.forward(ctx), step.timeoutMs);
          break;
        } catch (err) {
          lastErr = err;
          await sleep(250 * Math.pow(2, retry));
        }
      }
      if (!result || !result.ok) {
        await PartyEvent.emit({
          type: "saga.step.fail",
          runId: ctx.runId,
          step: step.name,
          reason: String(lastErr ?? result?.errorMessage),
        });
        await prisma.repoGenesisRun.update({
          where: { id: ctx.runId },
          data: { status: "COMPENSATING", stepStates: stepStates as any },
        });
        return await compensate(ctx, steps.slice(0, i), stepStates);
      }
      stepStates[step.name] = result;
      await prisma.repoGenesisRun.update({
        where: { id: ctx.runId },
        data: {
          currentStep: i + 1,
          stepStates: stepStates as any,
        },
      });
      await PartyEvent.emit({ type: "saga.step.ok", runId: ctx.runId, step: step.name });
    }

    await prisma.repoGenesisRun.update({
      where: { id: ctx.runId },
      data: { status: "SUCCEEDED" },
    });
    return { status: "SUCCEEDED" };
  } finally {
    await releaseAdvisoryLock(ctx.runId);
  }
}

async function compensate(
  ctx: SagaCtx,
  completedSteps: Step[],
  stepStates: Record<string, StepResult>,
): Promise<{ status: "FAILED_COMPENSATED" | "FAILED_ORPHAN" }> {
  const orphans: Array<{ step: StepName; resourceIds: Record<string, string>; reason: string }> = [];
  for (const step of [...completedSteps].reverse()) {
    const state = stepStates[step.name];
    if (!state) continue;
    let compensated = false;
    for (let retry = 0; retry < 3; retry++) {
      try {
        await withTimeout(step.compensate(ctx, state), step.timeoutMs);
        compensated = true;
        await PartyEvent.emit({ type: "saga.compensate.ok", runId: ctx.runId, step: step.name });
        break;
      } catch (err) {
        await sleep(250 * Math.pow(4, retry));
        if (retry === 2) {
          orphans.push({ step: step.name, resourceIds: state.resourceIds, reason: String(err) });
          await PartyEvent.emit({
            type: "saga.compensate.fail",
            runId: ctx.runId,
            step: step.name,
            reason: String(err),
          });
        }
      }
    }
  }

  if (orphans.length === 0) {
    await prisma.repoGenesisRun.update({
      where: { id: ctx.runId },
      data: { status: "FAILED_COMPENSATED" },
    });
    return { status: "FAILED_COMPENSATED" };
  }

  for (const o of orphans) {
    await prisma.orphanedResource.create({
      data: {
        runId: ctx.runId,
        step: o.step,
        provider: stepToProvider(o.step),
        resourceIds: o.resourceIds as any,
        reason: o.reason,
      },
    });
  }
  await prisma.repoGenesisRun.update({
    where: { id: ctx.runId },
    data: { status: "FAILED_ORPHAN" },
  });
  return { status: "FAILED_ORPHAN" };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

function stepToProvider(s: StepName): string {
  return {
    slug: "postgres",
    railway: "railway",
    cloudflare: "cloudflare",
    r2: "cloudflare",
    daytona: "daytona",
    github: "github",
  }[s];
}
```

### 7.6 Timing Budget (revised)

Same as v1.0 with GitHub last:

| Step | p50 | p95 | Timeout | Retries |
|---|---|---|---|---|
| slug reserve | 50ms | 200ms | 5s | 3 |
| Railway project + services + Postgres | 12s | 30s | 90s | 3 |
| Cloudflare DNS + Workers | 8s | 20s | 60s | 3 |
| R2 bucket + presign | 3s | 8s | 30s | 3 |
| Daytona workspace-template | 5s | 15s | 60s | 3 |
| GitHub repo + initial push | 4s | 10s | 30s | 3 |
| **Total** | **32s** | **83s** | **275s (hard cap)** | — |

### 7.7 Provisioning Run — Persistent UI State (F13 part b)

V1.0 relied on browser-tab persistence for Saga progress. F13 pointed out tab-close kills user-visible state. V2:

- `RepoGenesisRun` is queryable by URL: `/app/projects/genesis/{runId}` shows live progress regardless of original tab.
- Run URL shared on invite when team members join.
- On completion: URL redirects to Project dashboard. On FAILED_ORPHAN: URL shows "we're working on it; you are not being charged; support was notified" state.

---

## §8 BYOK-for-Infra — V4.0 (triage Q9)

V3.0 ships **managed-mode only**. BYOK-for-Infra defers to V4.0. The §8 section from v1.0 is moved in its entirety to the V4.0 roadmap.

### 8.1 Rationale (triage Q9 reaffirmed)

BYOK-for-Infra requires:
- Multi-provider error-normaliser (F31)
- Per-provider threat-model for app-server-compromise (F4)
- Cross-provider rotation orchestrator (F26)
- On-call engineer for provider-error-triage

None of these exist at V3.0 scale. Deferring gives us 12-18 months to learn what customers actually need.

### 8.2 V3.0 replacement — Cost Pass-Through Disclosure (§2.4)

Managed mode + pass-through cost + live cost-meter in UI. Customer sees "your Project consumes €X/mo of our Railway Pro-tier + €Y/mo of our CF usage" — honesty by construction.

### 8.3 V4.0 Earning-Back Criteria

- Paying customers funding the €30K SOC-2 audit.
- FinOps engineer on the team (solo-dev can't own multi-provider billing).
- Multi-provider error-normaliser library exists (either open-source or ours).
- Threat-model documented + accepted for app-server-compromise → CF-token-stolen blast radius.
- At least 3 customers explicitly requesting BYOK (signal ≠ hunch).

### 8.4 Until V4.0: customers requiring BYOK

Documented escape hatch: customers can self-host the open-source reference implementation (non-negotiable per 00-vision §13). PatchParty does not broker infrastructure for them; we provide the codebase under permissive license.

### 8.5 Per-provider rotation cadence (V3.0, partial F26)

Even in managed-mode, we rotate platform tokens on a cadence:

| Provider | Cadence | Who triggers | Event |
|---|---|---|---|
| Railway platform token | 90d | cron + manual | `infra.railway.token_rotated` |
| CF API token | 90d | cron + manual | `infra.cf.token_rotated` |
| Daytona token | 180d | cron + manual | `infra.daytona.token_rotated` |
| GitHub App private key | 365d (or on leak indicator) | manual | `infra.github.key_rotated` |

Cross-provider orchestrator V4.0.

---

## §9 New Prisma Models

Additive-only. Existing V2.0 rows unaffected.

```prisma
// schema.prisma — V3.0 R2-green additions (supersedes v1.0 additions)

enum DeploymentStrategy {
  CANARY
  BLUE_GREEN
  BIG_BANG
}

enum DeploymentStatus {
  PENDING
  PROVISIONING
  HEALTHCHECK
  PROMOTING
  SUCCEEDED
  FAILED
  ROLLED_BACK
}

enum ProjectRegion {
  EU
  US
  US_E
  APAC
}

enum PreviewEnvLifecycle {
  CREATING
  RUNNING
  PAUSED
  DESTROYED
  FAILED
}

enum InfraProvider {
  RAILWAY
  CLOUDFLARE
  DAYTONA
  GITHUB
}

enum CredentialStatus {
  UNVALIDATED
  VALIDATED
  INVALID
  EXPIRED
}

enum RepoGenesisStatus {
  PENDING
  RUNNING
  COMPENSATING
  SUCCEEDED
  FAILED_COMPENSATED
  FAILED_ORPHAN
  FAILED_ABANDONED
}

enum RegionEnforcementBoundary {
  RAILWAY_PROJECT
  R2_BUCKET
  CF_WORKER
  LLM_ALLOWLIST
  CRON_SCHEDULER
  DAYTONA_WORKSPACE
}

enum RegionEnforcementOutcome {
  OK
  VIOLATED
  SKIPPED
  NOT_SUPPORTED
}

model Project {
  id                       String   @id @default(cuid())
  slug                     String   @unique
  ownerId                  String
  region                   ProjectRegion @default(EU)
  regionImmutable          Boolean  @default(true)
  regionEnforcementAllOk   Boolean  @default(false)   // last startup-check result
  regionEnforcementCheckedAt DateTime?
  primaryCustomDomain      String?  @unique
  cfAccountIndex           Int      @default(0)  // §3.4.0 account sharding
  measuredAvailability30d  Float?    // rolling synthetic-check result
  measuredAvailabilityAt   DateTime?
  // ... existing V2.0 fields

  deploymentConfigs        DeploymentConfig[]
  deploymentRuns           DeploymentRun[]
  previewEnvs              PreviewEnv[]
  providerCredentials      ProviderCredential[]
  repoGenesisRuns          RepoGenesisRun[]
  regionEnforcementChecks  RegionEnforcementCheck[]
  uptimeSamples            UptimeSample[]

  @@index([ownerId])
  @@index([region])
}

model DeploymentConfig {
  id                String              @id @default(cuid())
  projectId         String
  project           Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  strategy          DeploymentStrategy
  railwayProjectId  String
  railwayBackendId  String
  railwayFrontendId String
  cfZoneId          String
  cfWorkerRateId    String?
  cfWorkerCanaryId  String?
  cfWorkerAuthId    String?
  cfWorkerObserverId String?
  daytonaTemplateId String?
  healthPath        String              @default("/api/health")
  healthTimeoutS    Int                 @default(30)
  canaryLadder      Json                @default("[5, 25, 50, 100]")
  sloP95MsMax       Int                 @default(800)
  sloErrorRateMax   Float               @default(0.005)
  flapThreshold     Int                 @default(3)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  runs              DeploymentRun[]

  @@index([projectId])
  @@index([strategy])
}

model DeploymentRun {
  id                String            @id @default(cuid())
  configId          String
  config            DeploymentConfig  @relation(fields: [configId], references: [id], onDelete: Cascade)
  projectId         String
  project           Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  status            DeploymentStatus  @default(PENDING)
  commitSha         String
  initiatedBy       String
  strategySnapshot  DeploymentStrategy
  canaryStepCurrent Int               @default(0)
  healthGatePassed  Boolean           @default(false)
  healthSnapshot    Json?
  flapCount         Int               @default(0)
  startedAt         DateTime          @default(now())
  completedAt       DateTime?
  rolledBackAt      DateTime?
  failureReason     String?
  railwayDeployIds  Json              @default("{}")

  @@index([projectId, startedAt])
  @@index([configId, status])
  @@index([commitSha])
}

model PreviewEnv {
  id                   String               @id @default(cuid())
  projectId            String
  project              Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  branch               String
  prNumber             Int?
  daytonaWorkspaceId   String               @unique
  url                  String               @unique
  lifecycle            PreviewEnvLifecycle  @default(CREATING)
  gateMode             String               @default("HMAC_URL")  // HMAC_URL | CF_ACCESS
  ttlExpiresAt         DateTime
  lastUsedAt           DateTime             @default(now())
  pausedAt             DateTime?
  createdAt            DateTime             @default(now())
  destroyedAt          DateTime?

  @@unique([projectId, branch])
  @@index([lifecycle])
  @@index([ttlExpiresAt])
}

model ProviderCredential {
  id           String            @id @default(cuid())
  projectId    String?
  project      Project?          @relation(fields: [projectId], references: [id], onDelete: SetNull)
  userId       String
  provider     InfraProvider
  ciphertext   Bytes
  iv           Bytes
  authTag      Bytes
  keyVersion   Int               @default(1)
  scope        Json              @default("{}")
  status       CredentialStatus  @default(UNVALIDATED)
  rotationDueAt DateTime?
  lastValidAt  DateTime?
  lastErrorAt  DateTime?
  lastErrorMsg String?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  @@unique([userId, provider, projectId])
  @@index([status])
  @@index([rotationDueAt])
}

model RepoGenesisRun {
  id               String              @id @default(cuid())
  projectId        String
  project          Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  idempotencyKey   String              @unique
  status           RepoGenesisStatus   @default(PENDING)
  currentStep      Int                 @default(0)
  stepStates       Json                @default("{}")
  advisoryLockKey  BigInt
  errorReason      String?
  startedAt        DateTime            @default(now())
  completedAt      DateTime?

  orphans          OrphanedResource[]

  @@index([projectId, startedAt])
  @@index([status])
  @@index([advisoryLockKey])
}

model OrphanedResource {
  id           String         @id @default(cuid())
  runId        String
  run          RepoGenesisRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  step         String
  provider     String
  resourceIds  Json
  reason       String
  retries      Int            @default(0)
  reconciledAt DateTime?
  abandonedAt  DateTime?
  createdAt    DateTime       @default(now())

  @@index([reconciledAt])
  @@index([abandonedAt])
}

model RegionEnforcementCheck {
  id         String                     @id @default(cuid())
  projectId  String
  project    Project                    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  boundary   RegionEnforcementBoundary
  outcome    RegionEnforcementOutcome
  expected   String
  actual     String?
  checkedAt  DateTime                   @default(now())

  @@index([projectId, checkedAt])
  @@index([outcome])
}

model UptimeSample {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  probeRegion String
  httpStatus Int
  latencyMs  Int
  ok         Boolean
  checkedAt  DateTime @default(now())

  @@index([projectId, checkedAt])
  @@index([ok, checkedAt])
}

model InfraAuditEvent {
  id         String   @id @default(cuid())
  projectId  String?
  userId     String?
  provider   InfraProvider
  action     String
  payload    Json
  success    Boolean
  latencyMs  Int?
  createdAt  DateTime @default(now())

  @@index([projectId, createdAt])
  @@index([provider, action])
}

model DeploymentQueue {
  id          String   @id @default(cuid())
  projectId   String
  reason      String
  queuedAt    DateTime @default(now())
  attemptedAt DateTime?
  resolvedAt  DateTime?

  @@index([projectId, queuedAt])
  @@index([resolvedAt])
}
```

**Migration impact:** additive. V2.0 Projects default to `region=EU`, `regionEnforcementAllOk=false` until first startup-check runs. No backfill for other new models — they populate on first use.

---

## §10 ADR-008 — Rewritten (F29 defense)

**Status:** Accepted, 2026-04-18 (R2 Green-Team revision).
**Deciders:** Nelson Mehlis (founder), Squad I (infra), Squad R2-Green (defense review).
**Supersedes:** ADR-008 v1.0 (2026-04-18 morning).
**Superseded by:** none.

### Context (unchanged from v1.0)

PatchParty Studio must ship shipped product. V2.0 Brownfield already uses Railway + Daytona. Open: consolidate vs stay multi-vendor, and what is the edge.

### Decision (unchanged)

Three-layer stack: Railway (runtime) + Cloudflare (edge) + Daytona (sandbox). Each layer one vendor, picked once, not cross-shopped.

### Alternatives Considered — V2 Analysis on TCO + Lock-In + Compliance (F29 defense)

**Vercel + Supabase (rejected, 5 dimensions).**

| Dimension | Rating | Analysis |
|---|---|---|
| TCO (3-year, mid-sized Project) | Reject — **2-3x** | Bandwidth + Edge Functions + Supabase Pro + Vector-DB = €400-800/mo vs €50-150/mo on Railway+CF |
| Vendor lock-in | Reject — **high** | Edge Functions are Vercel-proprietary API; Supabase client-libs are Supabase-shaped; data-export tooling exists but non-trivial |
| Compliance footprint | Neutral — similar | Both vendors hold SOC-2; Supabase EU-region pinnable; Vercel edge is global |
| Regional coverage | Accept — broader than ours | Vercel has US/EU/APAC; Supabase Singapore-EU-US |
| Incident history | Neutral | Both have published incidents |
| **Strategic** | Reject — direct competitor | Vercel ships v0 (agentic app-builder); building on them is strategically hostile |

**AWS + Amplify (rejected, 5 dimensions).**

| Dimension | Rating | Analysis |
|---|---|---|
| TCO | Neutral — unpredictable | Can be cheapest or most-expensive depending on FinOps discipline |
| Vendor lock-in | Reject — **highest** | Region-data-transfer costs are punitive; IAM coupling is total |
| Compliance footprint | Accept — **strongest** | SOC-2 out-of-box; HIPAA/FedRAMP available; PatchParty does not need these V3.0 |
| Regional coverage | Accept — **broadest** | 30+ regions |
| Operational surface | Reject — **eats founder** | Solo dev cannot maintain IAM/VPC/Route53/CloudFront/ACM/WAF/S3/RDS/ECS/Lambda/SM Terraform |
| **Strategic** | Reject — too big to move | First-day choice we'd regret V4.0 |

**Fly.io + Neon (seriously considered, rejected 4 dimensions).**

| Dimension | Rating | Analysis |
|---|---|---|
| TCO | Accept — competitive | Fly instance-hours + Neon Pro ~ Railway+CF |
| Vendor lock-in | Neutral | Both have reasonable data-export |
| Compliance footprint | Neutral | Both have SOC-2 + EU regions |
| Regional coverage | Accept — **best anycast** | Fly's anycast routing is genuinely excellent |
| DX (Nelson's mental model) | Reject — **switching-cost** | Nelson knows Railway; switching costs his productivity before our productivity |
| Neon-as-loser-branch DB | Neutral | Conceptually seductive (branch-per-loser); operationally unproven for race-parallelism |
| **Strategic** | Reject — not materially better | Comparable on axes we care about; worse on axis (DX) that ships V2.5 on time |

**Cloudflare-only (Pages + Workers + D1 + R2) (considered in R2-Green only, rejected 1 dimension).**

| Dimension | Rating | Analysis |
|---|---|---|
| TCO | Accept — cheapest | Pure CF is ~€10-20/mo for small projects |
| Vendor lock-in | Reject — **single-vendor max** | All eggs in CF basket; no upgrade path if CF changes pricing |
| Compliance footprint | Reject — **insufficient** | D1 is young; not SOC-2 yet; EU-jurisdiction story not production-ready |
| Regional coverage | Accept — **global edge** | Every POP |
| DX | Accept — excellent | wrangler is scriptable; Workers are fast |
| **Strategic** | Reject — single-vendor outage = total outage | Fails the F1 degradation-matrix test |

### Consequences (revised)

**Positive:**
- Predictable cost. Published cost-passthrough model (§2.4) is real, not aspirational.
- DX compounds: one CLI per layer (`railway`, `wrangler`, `daytona`).
- No kitchen-sink — each vendor best-in-class.
- **Honest availability framing** — we don't claim SLA we can't back.

**Negative:**
- **Vendor concentration per layer.** Each layer has one vendor; vendor-outage = layer-outage. Mitigated by §1.7 degradation-mode matrix (what continues to work) and §2.1 circuit-breaker (Railway) / similar for CF, Daytona.
- Three status-pages, three support channels, three billing relationships. Mitigated by unified ops-dashboard (Studio UI) showing all three.
- No cross-vendor portability. Customer cannot lift-and-shift. Mitigated by open-source reference implementation (00-vision §13 Non-Negotiable).

**Neutral:**
- CF edge is committed-to whether or not a Project needs it (cost is Free-Tier for most).

### Review Trigger

Re-open ADR if:
- Railway raises pricing by >2x or EOLs GraphQL API.
- CF changes R2 egress pricing away from $0.
- Daytona is acquired and pricing changes materially.
- Any single-vendor competitor ships demonstrably superior end-to-end pitch.
- Measured-availability drops below 99.0% for 3 consecutive months.
- Customer signals BYOK need hits 3+ explicit requests.

---

## §11 Failure Modes — 15 Modes (expanded from 10)

Each mode has: **symptom / detection / mitigation / PartyEvent / runbook link**.

### 11.1 Railway GraphQL API rate-limit during Repo-Genesis
- **Symptom:** `projectCreate` returns 429 or 5xx.
- **Detection:** circuit breaker trips after 3 consecutive failures.
- **Mitigation:** exponential backoff (250ms, 500ms, 1s, 2s, 4s), max 5 retries; then compensate.
- **Event:** `infra.railway.rate_limited`.
- **Runbook:** `docs/runbooks/railway-rate-limit.md`.

### 11.2 Cloudflare DNS propagation delay
- **Symptom:** DNS record created via API but not globally resolvable.
- **Detection:** DoH checks from 3 geographically distinct resolvers.
- **Mitigation:** 300s grace; progress bar UI; actionable error after 300s.
- **Event:** `infra.cf.dns_propagation_slow` (60s), `infra.cf.dns_propagation_failed` (300s).
- **Runbook:** `docs/runbooks/cf-dns-slow.md`.

### 11.3 Daytona workspace OOM
- **Symptom:** workspace killed by OOM-killer.
- **Detection:** Daytona webhook.
- **Mitigation:** auto-resize one tier (Small→Medium, Medium→Large). Large→notify; no auto-XL.
- **Event:** `infra.daytona.oom_autoresize` with `{ from_tier, to_tier }`.
- **Runbook:** `docs/runbooks/daytona-oom.md`.

### 11.4 Cross-region data leak attempt
- **Symptom:** service-region mismatch detected at pre-flight.
- **Detection:** REC-1/REC-5/REC-6 fail-closed check.
- **Mitigation:** abort operation; `region.enforcement.violated` event; user alerted.
- **Event:** `region.enforcement.violated`.
- **Runbook:** `docs/runbooks/region-enforcement.md`.

### 11.5 CF Worker Jurisdiction-Pinning Unavailable (NEW, F2 residual)
- **Symptom:** EU project is deployed, but CF Worker platform cannot guarantee jurisdiction-only execution.
- **Detection:** startup-check REC-3 returns `NOT_SUPPORTED`.
- **Mitigation:** disable Workers that process request bodies for EU projects; fall back to Railway-side implementations for rate-limit, auth-gate.
- **Event:** `region.enforcement.cf_worker_unavailable`.
- **Runbook:** `docs/runbooks/cf-worker-eu-fallback.md`.

### 11.6 Preview-env URL leak (HMAC nonce leaked)
- **Symptom:** HMAC URL shows up externally.
- **Detection:** CF Worker tracks nonce usage; second use = replay attempt logged.
- **Mitigation:** HMAC expires in 24h; used-nonce KV store prevents replay after single consumption; admin can revoke PROJECT_SIGNING_SECRET which invalidates all outstanding URLs.
- **Event:** `preview.hmac.replay_attempt`, `preview.hmac.secret_rotated`.
- **Runbook:** `docs/runbooks/preview-url-leak.md`.

### 11.7 Canary health-gate flapping
- **Symptom:** Green alternates pass/fail; observer records flaps.
- **Detection:** Observer Worker scheduled check.
- **Mitigation:** after `flapThreshold` (Pro tier: 3), auto-rollback to previous step; Director can "Promote anyway" with typed confirmation; Autopilot-Advisor does NOT have override.
- **Event:** `deploy.canary.health_flapping`, `deploy.canary.rolled_back_by_observer`.
- **Runbook:** `docs/runbooks/canary-flap.md`.

### 11.8 R2 bucket quota exceeded
- **Symptom:** presign fails with quota-exceeded.
- **Detection:** direct API error on presign.
- **Mitigation:** 7-day dunning (existing assets readable; new uploads blocked); then hard-block until payment clears or Project archived.
- **Event:** `infra.cf.r2_quota_exceeded`, `infra.cf.r2_dunning_email_sent`.
- **Runbook:** `docs/runbooks/r2-quota.md`.

### 11.9 Daytona cold-start >30s
- **Symptom:** Preview-env resume exceeds 30s.
- **Detection:** CF Worker timeout or user-visible spinner threshold.
- **Mitigation V3.0:** warming-up UI with progress bar; CF Worker timeout to 45s.
- **Mitigation V3.5:** pre-warm pool (N=3 idle per region); state-swap instead of cold-start.
- **Event:** `infra.daytona.cold_start_slow` with `{ actual_ms, tier }`.
- **Runbook:** `docs/runbooks/daytona-cold-start.md`.

### 11.10 CF cert-issuance fails (DNS misconfigured)
- **Symptom:** custom-hostname stuck in `pending_validation` >15 min.
- **Detection:** polling loop.
- **Mitigation:** actionable UI error with exact record to fix; auto-retry ACME every 5 min for 2h.
- **Event:** `infra.cf.cert_issuance_failed`.
- **Runbook:** `docs/runbooks/cf-cert-fail.md`.

### 11.11 Railway deploy silently succeeds but service unhealthy
- **Symptom:** `railway up` exits 0 but service returns 5xx.
- **Detection:** post-deploy health-check gate.
- **Mitigation:** `DeploymentRun.status` not set to SUCCEEDED until `/api/health` 200 for 60s consecutive; else auto-rollback to previous deploy.
- **Event:** `deploy.health_gate_failed`, `deploy.auto_rollback`.
- **Runbook:** `docs/runbooks/deploy-rollback.md`.

### 11.12 Railway control-plane outage (NEW)
- **Symptom:** `backboard.railway.app` returns 5xx or times out.
- **Detection:** circuit breaker at 3 consecutive failures.
- **Mitigation:** open circuit; all Railway ops queued to `DeploymentQueue` (new Prisma model §9); user sees "Railway degraded — X operations queued"; prior deployed services continue serving; Repo-Genesis falls back to sandbox-only mode.
- **Event:** `infra.railway.circuit_open`, `deploy.queued`.
- **Runbook:** `docs/runbooks/railway-control-plane-down.md`.

### 11.13 Cloudflare control-plane outage (NEW)
- **Symptom:** `api.cloudflare.com` 5xx.
- **Detection:** circuit breaker; separate from `cloudflarestatus.com` global-edge outages.
- **Mitigation:** existing deployed Workers continue serving; new deploys blocked; canary promotions paused; user banner.
- **Event:** `infra.cf.circuit_open`.
- **Runbook:** `docs/runbooks/cf-control-plane-down.md`.

### 11.14 Saga orphan-resource (compensate-of-compensate fail) (NEW, F33)
- **Symptom:** `RepoGenesisRun.status = FAILED_ORPHAN`.
- **Detection:** saga transitions to FAILED_ORPHAN after 3 compensate retries.
- **Mitigation:** reconciliation cron re-attempts delete every 5 min up to 24h; customer not charged; on-call paged.
- **Event:** `saga.compensate.fail`, `saga.orphan_reconciled`, `saga.orphan_abandoned`.
- **Runbook:** `docs/runbooks/saga-orphan.md`.

### 11.15 Region enforcement violated (NEW, F2)
- **Symptom:** startup-check or runtime-check finds boundary mismatch.
- **Detection:** `RegionEnforcementCheck.outcome = VIOLATED`.
- **Mitigation:** for EU Projects, service refuses to start; for US/APAC, logged but service continues (V3.0); full fail-closed everywhere in V3.5.
- **Event:** `region.enforcement.violated`, `region.enforcement.boundary_check`.
- **Runbook:** `docs/runbooks/region-enforcement.md`.

---

## §12 Phasing — V2.5 / V3.0 / V3.5 / V4.0 (honest scope)

### V2.5 — "Railway Deploy + CF DNS + Daytona Race" (+6 → +18 weeks)

**In scope:**
- Railway provisioning via GraphQL (saga steps 1-2).
- CF DNS-only wiring for `{slug}.patchparty.app` (saga step 3, DNS portion).
- Universal SSL TLS auto-issue.
- Daytona race-sandbox (already V2.0 shipping).
- Big-Bang release strategy (only strategy V2.5).
- Managed-mode only (no BYOK-infra).
- Repo-Genesis saga **with persisted state machine** (§7) — reordered steps; GitHub last; advisory locks; idempotency keys; reconciliation cron.
- `Project.region` + startup-check with REC-1 (Railway), REC-2 (R2 not yet provisioned; skipped), REC-5 (cron), REC-6 (Daytona).
- Cost-passthrough disclosure in settings.
- Measured-uptime synthetic probes (from 3 CF Free-tier POPs).

**Out of scope V2.5:**
- CF Workers (no rate-limit, canary, auth-gate).
- Preview-envs (stay at V3.0).
- Custom domains (V3.0).
- Canary / Blue-Green (V3.0 / V3.5).
- R2 buckets (V3.0 — unblock 08-asset-pipeline V3.0).

**Ship criteria:**
- Greenfield Brief → `{slug}.patchparty.app` live in median 4 min, p95 10 min.
- Saga 100-run chaos test: ≤2% orphan rate, all orphans reconciled within 24h.
- Measured-uptime over 30 days published ≥99.0% (best-effort target, not SLA).

### V3.0 — "CF Workers + Preview-Envs + Canary + R2" (+22 → +32 weeks)

**In scope:**
- Four Workers per Project: rate-limit (Durable Object), canary-split, auth-preview-gate (HMAC default), canary-observer.
- Canary release strategy with observer-driven automatic promote/demote.
- Preview-envs per PR via Daytona, **HMAC-URL default** (CF Access opt-in).
- Custom domains (user-owned CNAME + TXT verification).
- R2 bucket provisioning (saga step 4) — unblocks 08-asset-pipeline V3.0.
- Full six-boundary region enforcement (REC-1 through REC-6), fail-closed for EU.
- CF-account sharding for >250 Projects (§3.4.0).
- Auto-close preview-env on PR merge/close (webhook-driven).
- Per-provider rotation cadence (not orchestrator yet).

**Out of scope V3.0:**
- BYOK-for-Infra (V4.0).
- Blue-Green (V3.5).
- Dev-envs (V3.5).
- Multi-region (V4.0).
- Pre-warm pool (V3.5).
- CF Pages (V4.0).

**Ship criteria:**
- Canary 0→100% in <30 min with observer-driven gates.
- Preview-env `git push` → live URL <90s p95.
- 3 rollbacks caught by observer in 500-deploy chaos test.

### V3.5 — "Dev-Envs + Blue-Green + Pre-Warm" (+32 → +38 weeks)

**In scope:**
- Daytona Dev-Env (VS-Code-in-browser) with persistent lifecycle.
- Blue-Green release strategy via Worker origin-swap (§5.3).
- Pre-warm pool for preview-env cold-start.
- Daytona BYOK token (§8.5).
- Region-pick-per-Project (EU/US/APAC) at Project-create.
- SAML/Okta IdP for CF Access opt-in.

**Out of scope V3.5:**
- Multi-region with cross-region DB (V4.0).
- Full BYOK-for-Infra (V4.0).
- CF Pages (V4.0).
- Region-migration flow (V4.0).

**Ship criteria:**
- Dev-env launch <8s p95.
- Blue-Green swap cutover <3s globally.
- Region-pick-per-Project end-to-end latency: EU→Frankfurt TTFB p95 <400ms; APAC→Singapore TTFB p95 <400ms.

### V4.0 — "BYOK-Infra + SOC-2 + Multi-Region" (+38 weeks → …)

**In scope (earning-back targets):**
- BYOK-for-Infra (Railway + CF + Daytona + GitHub) — full error-normaliser + threat-model + rotation orchestrator (F4, F26, F31 resolved here).
- SOC-2 Type-1 audit engaged (not "ready for audit" — actually engaged).
- Multi-region with cross-region DB replication (off vanilla Railway-Postgres or via new Railway capability).
- Region-migration flow (EU→US etc.).
- Autopilot-safe Canary (full Autopilot per triage Q4 earning-back).
- CF Pages for marketing/docs.
- Contracted provider SLAs at Enterprise tier, enabling user-facing SLA.
- OpenRouter multi-provider LLM (per triage Q7 earning-back).

**Phrase-unlock at V4.0 (earning-back):**
- "99.5% measured" unlocks after 6 months of published uptime ≥99.5%.
- "SOC-2 Type-1" unlocks after audit artefacts published.
- "International-standard" phrase remains KILLED — no earning-back plan; alternative phrases (e.g. "enterprise-grade with SOC-2 Type-1 audit") are acceptable post-certification.

---

## §13 PartyEvent Telemetry — 18 events with redaction rules

Redaction rule: every event payload passes `redact()` before persistence. IPs are redacted to /24; emails are SHA-256 hashed; tokens never included; custom-domain names are passed through; region-codes are passed through.

```ts
// src/lib/events/types.ts additions (V2)
export type DeployInfraEvent =
  | { type: "deploy.requested"; projectId: string; strategy: DeploymentStrategy; commitSha: string; initiatedByHash: string }
  | { type: "deploy.provisioning_started"; deploymentRunId: string; projectId: string }
  | { type: "deploy.railway.up_invoked"; deploymentRunId: string; service: "backend" | "frontend"; detached: boolean }
  | { type: "deploy.railway.up_completed"; deploymentRunId: string; service: string; durationMs: number; deployId: string }
  | { type: "deploy.health_gate_started"; deploymentRunId: string; path: string; windowS: number }
  | { type: "deploy.health_gate_passed"; deploymentRunId: string; durationMs: number; p95Ms: number; errorRate: number }
  | { type: "deploy.health_gate_failed"; deploymentRunId: string; reason: string; p95Ms?: number; errorRate?: number }
  | { type: "deploy.canary.step_promoted"; deploymentRunId: string; stepFrom: number; stepTo: number; observerDriven: boolean; healthSnapshot: unknown }
  | { type: "deploy.canary.health_flapping"; deploymentRunId: string; flapCount: number }
  | { type: "deploy.canary.manual_override"; deploymentRunId: string; userIdHash: string; reason: string }
  | { type: "deploy.canary.rolled_back_by_observer"; deploymentRunId: string; toPercent: number }
  | { type: "deploy.bluegreen.swapped"; deploymentRunId: string; fromColor: "blue" | "green"; toColor: "blue" | "green"; workerReBindMs: number }
  | { type: "deploy.bigbang.acknowledged"; deploymentRunId: string; warnedText: string; userAckTimestamp: string }
  | { type: "deploy.bigbang.executed"; deploymentRunId: string }
  | { type: "deploy.auto_rollback"; deploymentRunId: string; toDeployId: string; reason: string }
  | { type: "deploy.completed"; deploymentRunId: string; status: DeploymentStatus; durationMs: number }
  | { type: "deploy.queued"; projectId: string; reason: string }
  | { type: "preview.created"; previewEnvId: string; projectId: string; branch: string; prNumber?: number; gateMode: "HMAC_URL" | "CF_ACCESS" }
  | { type: "preview.resumed"; previewEnvId: string; coldStartMs: number }
  | { type: "preview.paused"; previewEnvId: string; reason: "idle_30m" | "user_request" }
  | { type: "preview.destroyed"; previewEnvId: string; reason: "ttl_7d" | "pr_closed" | "user_request" }
  | { type: "preview.hmac.replay_attempt"; previewEnvId: string; nonceFirst16: string }
  | { type: "preview.hmac.secret_rotated"; projectId: string }
  | { type: "infra.railway.circuit_open"; projectId?: string; consecutiveFailures: number }
  | { type: "infra.railway.rate_limited"; projectId?: string; retries: number }
  | { type: "infra.railway.token_rotated"; actorIdHash: string }
  | { type: "infra.railway.region_mismatch_blocked"; projectId: string; expected: string; actual: string }
  | { type: "infra.cf.circuit_open"; consecutiveFailures: number }
  | { type: "infra.cf.dns_propagation_slow"; projectId: string; elapsedS: number }
  | { type: "infra.cf.dns_propagation_failed"; projectId: string; elapsedS: number }
  | { type: "infra.cf.cert_issuance_failed"; hostname: string; reason: string }
  | { type: "infra.cf.cert_expiring"; hostname: string; daysRemaining: number }
  | { type: "infra.cf.r2_quota_exceeded"; projectId: string }
  | { type: "infra.cf.r2_dunning_email_sent"; projectId: string }
  | { type: "infra.cf.preview_unauthorized_attempt"; projectIdHash: string; ipCountry: string; ipPrefix24: string }
  | { type: "infra.cf.token_rotated" }
  | { type: "infra.daytona.oom_autoresize"; workspaceId: string; fromTier: string; toTier: string }
  | { type: "infra.daytona.cold_start_slow"; workspaceId: string; actualMs: number; tier: string }
  | { type: "infra.daytona.token_rotated" }
  | { type: "infra.github.key_rotated"; actorIdHash: string }
  | { type: "region.enforcement.boundary_check"; projectId: string; results: Record<string, "OK" | "VIOLATED" | "SKIPPED" | "NOT_SUPPORTED"> }
  | { type: "region.enforcement.violated"; projectId: string; boundary: string; expected: string; actual: string }
  | { type: "region.enforcement.cf_worker_unavailable"; projectId: string }
  | { type: "saga.step.start"; runId: string; step: string }
  | { type: "saga.step.ok"; runId: string; step: string; durationMs: number }
  | { type: "saga.step.fail"; runId: string; step: string; reason: string; retryCount: number }
  | { type: "saga.compensate.start"; runId: string; step: string }
  | { type: "saga.compensate.ok"; runId: string; step: string }
  | { type: "saga.compensate.fail"; runId: string; step: string; reason: string }
  | { type: "saga.orphan_reconciled"; runId: string; step: string; retriesNeeded: number }
  | { type: "saga.orphan_abandoned"; runId: string; step: string };
```

**Redaction rules (formalised):**
- IPs → /24 CIDR (e.g. 192.0.2.123 → `192.0.2.0/24`).
- Email addresses → never in event payload; replaced by `userIdHash` = SHA-256(userId).
- API tokens → never in event payload.
- Custom-domain hostnames → passed through (public by nature).
- Region codes → passed through.
- Commit SHAs → passed through (publicly inferable from repo).
- Project slugs → passed through (publicly addressable).
- Deploy IDs → passed through (internal to Railway).

**Total event shapes:** 50+ (up from 18 in v1.0; this reflects the six-boundary region enforcement + saga step/compensate/orphan events + circuit-breaker events being added).

---

## §14 Open Questions (unresolved + deferred with earning-back)

**Unresolved — needs answer before V2.5 ship (action items, not specs):**

1. **Workspace-template versioning.** Repo-side vs managed-registry. **Proposal: repo-side with fallback to registry.** Action: decide before V2.5 ship; default to repo-side.

2. **Region-inference first-Project-create UX.** Silent fallback vs modal. **Proposal: modal when confidence <0.8** (see §2.3.1). Action: confirm in UX review.

3. **Canary header-sticky-hash function — GDPR IP PII question.** Hash IP+UA vs set our own random cookie. **Proposal: cookie-based, fallback IP+UA if no cookie.** Action: validate GDPR-legal-counsel-opinion before V3.0.

4. **Preview-env DB strategy.** Forked Postgres per preview (Neon-branching style) vs shared staging Postgres with schema isolation. **Proposal: V3.0 shared staging Postgres with per-preview schema; V4.0 explore Railway-branch-Postgres if feature exists.** Action: validate schema-per-preview has no cross-leak risks.

5. **Third-party integrations at the edge.** Stripe webhooks, OAuth callbacks — CF Worker proxy vs Railway-direct. **Proposal: Railway-direct V3.0; CF Worker signature-verification V3.5+.** Action: measure Railway-direct webhook-signature-verification latency.

**Deferred to V4.0 — earning-back criteria stated explicitly:**

6. **BYOK-for-Infra.** Earning-back per §8.3. 3+ explicit customer requests + FinOps + threat-model + error-normaliser.

7. **Multi-region with cross-region DB replication.** Earning-back: paid SRE + migration off vanilla Railway-Postgres OR Railway native feature.

8. **Cross-provider secret-rotation orchestrator.** Earning-back: on-call engineer + anomaly-detector + 6-month MTTR data.

9. **Region-migration flow.** Earning-back: customer explicit request + downtime-budget agreement.

10. **SOC-2 Type-1 audit.** Earning-back: paying customer funding + €30K audit budget + 90-day controls-evidence window.

11. **Contractual SLA to customers.** Earning-back: enterprise-tier provider contracts + SRE rotation + refund budget.

12. **CF Worker full jurisdiction-pinning for EU.** Earning-back: CF platform ships hard jurisdiction-pin OR we move EU Worker-layer to self-hosted Cloudflared alternative.

13. **OpenRouter / multi-provider LLM.** Triage Q7 — V4.0.

14. **Autopilot full-Autopilot mode.** Triage Q4 — V4.0.

15. **Cross-user Custom-Agent sharing.** Triage Q8 — V4.0.

---

## §15 Handoff

**What this V2 changes downstream:**

- `00-vision.md §1.5` — claim softens from "brief to production-URL in one session" to "brief to best-effort-deployed PR in one session" with explicit custom-domain caveat.
- `00-vision.md §4 Phase 8 (Release)` — three-strategy phasing aligns: Big-Bang V2.5-only, Canary V3.0, Blue-Green V3.5, multi-region V4.0.
- `00-vision.md §5 Principle 7 (Budget-Governor)` — infra-cost pass-through disclosure in Studio settings is a V3.0 requirement.
- `00-vision.md §12 Risks` — "Vendor concentration per layer" row is formalised from ADR-008 Consequences.
- `00-vision.md §14 Roadmap` — V2.5/V3.0/V3.5/V4.0 entries align with §12 of this doc (updated in this round).
- `08-asset-pipeline.md` — R2 is per-project bucket (F19 resolution); `jurisdiction: "eu"` is required per REC-2.
- `07-autopilot-mode.md` (Autopilot-Advisor) — Advisor-mode cannot "Promote anyway" on canary-flap (§11.7).
- `src/lib/infra/startup-check.ts` — new file, runs all six REC on boot.
- `src/lib/repo-genesis/executor.ts` — new file, real saga (not pseudo).
- `src/lib/repo-genesis/steps/` — new folder, per-step forward/compensate implementations.
- `src/app/api/cron/saga-reconcile/route.ts` — new file.
- `src/app/api/cron/uptime-probe/route.ts` — new file, synthetic uptime probes.
- `workers/canary-observer/` — new Worker.
- `workers/rate-limit-do/` — rewritten as Durable Object.
- `workers/auth-preview-gate/` — HMAC rewrite.
- `prisma/migrations/*` — schema additions per §9.
- `docs/runbooks/*` — 15 runbook files (one per §11 failure mode).

**What a next-session agent reads first:**

1. `12-triage-decisions.md` — binding constraints.
2. This doc end-to-end.
3. `00-vision.md §1, §4, §14` for phasing context.
4. `08-asset-pipeline.md` for R2 bucket scheme.
5. `src/lib/byok.ts` for AES-GCM pattern (used by ProviderCredential).

**Status of this spec:** v2.0, R2 Green-Team defense, post-triage scope. Awaiting: Squad R2 synthesis round to fold into `13-concept-v3.0-final.md`. Nelson's final ratification on the BYOK-V4.0 deferral and the Production-Grade Checklist (6 items) before V2.5 implementation begins.

**This is the internal engineering plan for the three-layer stack. Railway. Cloudflare. Daytona. Three layers, scoped honestly, shipped incrementally, with measured-availability inherited from upstream.**

---

## Appendix A — Developer Convenience Script

Moved here from §2.6 v1.0. Non-normative.

```bash
# Nelson's local convention (Windows-specific).
# Normative rule: "every successful git push SHOULD trigger a Railway deploy."
# Concrete command below is for local dev-box only.

RAILWAY="/c/Users/nelso/AppData/Roaming/npm/railway.cmd"
"$RAILWAY" up -s backend  -d
"$RAILWAY" up -s frontend -d

# On Linux/macOS:
# RAILWAY="$(command -v railway)"
# "$RAILWAY" up -s backend  -d
# "$RAILWAY" up -s frontend -d

# If Railway control-plane is down, PatchParty's queue-fallback (§2.6)
# queues the deploy rather than blocking the push.
```

Appendix does not ship with customer Projects. It is for PatchParty team development only.

---

## Appendix B — Findings-to-Section Crosswalk

Quick navigation for code-reviewer and synthesis round:

| Finding | Severity | Addressed in | Disposition |
|---|---|---|---|
| F1 three-provider concentration | CRITICAL | §1.6, §1.7, §10 | Fixed V3.0 (composed math + degradation matrix + ADR honesty) |
| F2 region-pinning = DB flag | CRITICAL | §2.3 (six boundaries) | Fixed V3.0 |
| F3 saga "compensating rollback" pseudocode | CRITICAL | §7 (persisted state machine) | Fixed V3.0 |
| F4 BYOK-for-infra AES-GCM threat model | HIGH | §8 | Deferred V4.0 (triage Q9) |
| F5 Canary no health-check feedback loop | CRITICAL | §3.4.4 Observer | Fixed V3.0 |
| F6 "atomic DNS-swap" is not atomic | HIGH | §5.3 Worker origin-swap | Fixed V3.5 (Blue-Green is V3.5) |
| F7 99.9% SLA fiction | CRITICAL | §0 Executive, §1.0, §6 | Killed (triage Q2) |
| F8 CDN cache-hit >80% workload-dependent | HIGH | §3.8 | Fixed V3.0 (claim removed) |
| F9 Multi-region without cross-region DB | HIGH | §5.4, §12 V4.0 | Deferred V4.0 |
| F10 `europe-west4` ≠ GDPR | CRITICAL | §2.3 + §6 item 6 DPA | Fixed V3.0 (six boundaries + DPA template) |
| F11 Preview-env 7d TTL cost footgun | HIGH | §4.2 | Fixed V3.0 (PR-close webhook + concurrent cap + cost meter) |
| F12 CF Access as default SSO | HIGH | §3.4.3 HMAC default | Fixed V3.0 |
| F13 Saga ordering + crash-window | HIGH | §7.2 (GitHub LAST) | Fixed V3.0 |
| F14 "International-Standard checklist" theater | HIGH | §6 | Killed (triage Q1); replaced with 6-item Production-Grade |
| F15 Railway GraphQL no SLA | HIGH | §2.1 (schema CI + circuit breaker + fallback) | Fixed V3.0 |
| F16 CF Access user-friction | MEDIUM | §3.4.3 HMAC default | Fixed V3.0 |
| F17 Nelson's local shell in spec | MEDIUM | Appendix A | Fixed V3.0 (moved) |
| F18 Rate-limit Worker naive | MEDIUM | §3.4.1 Durable Object rewrite | Fixed V3.0 |
| F19 R2 tenancy model unspecified | MEDIUM | §3.6 | Fixed V3.0 (per-project bucket) |
| F20 Big-Bang anti-pattern ignored | MEDIUM | §5.1 | Fixed V2.5 (explicit `deploy.bigbang.acknowledged` + Advisor can't select) |
| F21 Railway cost tiers incomplete | MEDIUM | §2.4 honest table | Fixed V3.0 |
| F22 CF Pages overlap Railway frontend | LOW | §3.7 deferred V4.0 | Fixed V3.0 (Pages deferred) |
| F23 Daytona dev-env rationale reuse | LOW | §1.3, §4.3 (V3.5 re-ADR) | Fixed V3.5 (go/no-go at V3.5) |
| F24 Region-pinning sub-project resources | HIGH | §2.3 six boundaries | Fixed V3.0 |
| F25 DeploymentRun.healthGatePassed undefined | MEDIUM | §3.4.4 SLO table | Fixed V3.0 |
| F26 Secret rotation orchestration | HIGH | §2.7, §8.5 | Partial V3.0 (per-provider cadence); orchestrator V4.0 |
| F27 "SLA-fähig" implies contract | CRITICAL | §0, §1.0 | Killed (triage Q2) |
| F28 Preview-env TTL no auto-close | MEDIUM | §4.2 | Fixed V3.0 (webhook) |
| F29 ADR-008 DX-only rejection | MEDIUM | §10 (TCO + lock-in + compliance matrix) | Fixed V3.0 |
| F30 Custom-domain iframe cookie isolation | LOW | §3.4.3 (HMAC URL works for iframe) | Fixed V3.0 |
| F31 BYOK error-message proxying | MEDIUM | §8 | Deferred V4.0 (moot under managed-only) |
| F32 CF Worker deployment tenancy | HIGH | §3.4.0 account sharding | Fixed V3.0 |
| F33 Compensate-of-compensate | HIGH | §7.3 | Fixed V3.0 |
| F34 "NIEMALS nur pushen ohne Railway deploy" during outage | MEDIUM | §2.6, §11.12 (queue fallback) | Fixed V3.0 |

**Total:** 32 of 34 findings fixed in V3.0 (or earlier). 2 findings deferred to V4.0 with earning-back criteria (F4, F26-orchestration and F31 moot under managed-only — counted under the same deferral since triage Q9 packages them). 3 findings have partial V3.0 (F8 removal of claim vs full cache-optimisation; F26 per-provider vs orchestrator) that close the claim without full resolution.

---

_End of Round R2 Green-Team defense on 11-deployment-infra. Supersedes v1.0._
