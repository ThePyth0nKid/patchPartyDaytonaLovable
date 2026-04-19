# 11 — Deployment & Infrastructure: The Three-Layer Stack

**Status:** v1.0 (2026-04-18). Load-bearing spec, authored by Squad I. Input into §4 Phase 8 (Release), §12 Risks, §14 Roadmap — the roadmap entries for v2.5/v3.0/v3.5/v4.0 will be updated to match the phasing in §12 of this document.

**Positioning (one line, market-facing):**
_The only agentic software-production studio that ships to international-standard infrastructure in one session._

**Positioning (one line, Nelson-internal):**
_Railway for prod-runtime. Cloudflare for the edge. Daytona for the sandbox layer. Not Vercel. Not AWS. Not a kitchen-sink. Three layers, picked on purpose._

**Nelson's verbatim directive (origin session d9c4c6d3-b346-4bce-a220-69cb404831c7):**
> _was hier dahinter bei mir steht ist ja immer Railway. Das Deployment, also das Production Deployment, auch noch und eben die ganze Dev-App-Seite über Cloudflare … genauso dass man internationale Software auf internationalen Standard produzieren kann._

This spec operationalises that directive. It is not an implementation-detail document; it is the **flagship infra spec**. Every pitch deck, every Demo-Mode replay, every ADR-chain descends from this file.

---

## 1. The Three-Layer Architecture

PatchParty Studio does not produce code. It produces **shipped product**. The gap between "code compiles" and "product runs under `{customer}.com` in Frankfurt with TLS, WAF, DDoS protection, CDN, and a 99.9% SLA" is three layers deep. Each layer is non-negotiable and irreplaceable.

### 1.1 Layer 1 — Cloudflare (Edge)

| Surface | Role | Default-on? | V-phase |
|---|---|---|---|
| DNS | Authoritative zone per Project | Yes | V2.5 |
| CDN | Static-asset caching, edge SSR | Yes | V2.5 |
| WAF | OWASP-Core ruleset | Yes (Free-Tier) | V2.5 |
| DDoS | Layer 3/4/7 protection | Yes (Free-Tier) | V2.5 |
| ACME / TLS | Auto cert-issuance | Yes | V2.5 |
| Workers | Rate-limit / Canary / Auth-gate | Yes (3 default Workers) | V3.0 |
| R2 | Asset storage (see 08-asset-pipeline.md) | Yes | V3.0 |
| Access | SSO-gate on preview-envs | Yes | V3.0 |
| Pages | Static sites (marketing, docs) | Opt-in | V3.5 |

**Rationale.** Cloudflare sits in front of everything. It is the only layer that can terminate TLS, absorb DDoS, run edge-logic (Workers), and gate preview-envs (Access) without round-tripping to origin. It is also the cheapest international-grade edge we could choose: Free-Tier covers WAF + DDoS + DNS + Workers-Free for every Project we provision. Egress-free R2 is the reason we picked it for assets over S3; the cost math only works if the edge and the asset-store share a vendor.

### 1.2 Layer 2 — Railway (Prod Runtime)

| Surface | Role | Default-on? | V-phase |
|---|---|---|---|
| Backend service | API server (Next.js route-handlers today) | Yes | V2.5 |
| Frontend service | Next.js RSC/SSR | Yes | V2.5 |
| Postgres | Primary OLTP | Yes | V2.5 |
| Redis | Job queue / rate-limit store | Opt-in | V3.0 |
| Volumes | Upload-staging, Postgres data | Default for Postgres | V2.5 |
| Env-var store | Secret management | Yes | V2.5 |
| PR Envs | Per-PR ephemeral deploy | Opt-in (competes with Daytona preview-envs) | V3.5 |

**Rationale.** Railway's DX wins. A `railway up -s {service} -d` ships a service in under 60s from local, 90s from GitHub snapshot. Their GraphQL API (`backboard.railway.app/graphql/v2`) is introspectable and scriptable; provisioning a project + services + Postgres from a script takes ~15s of round-trip time. Predictable cost (see §2.4). Multi-region is a first-class concept, not an afterthought. We do not pick AWS for the same reason we do not pick Kubernetes — the operational surface eats the founder.

### 1.3 Layer 3 — Daytona (Sandboxes)

| Surface | Role | Lifecycle | V-phase |
|---|---|---|---|
| Race-sandbox | 1 container per race-candidate | 30-min TTL | V2.0 (shipping) |
| Preview-env | 1 container per PR-branch | 7-day TTL, auto-pause 30-min idle | V3.0 |
| Dev-env | VS-Code-in-browser per Project | Persistent, user-controlled | V3.5 |

**Rationale.** Daytona is the only sandbox provider whose API lets us script workspace-templates in YAML, attach them to GitHub repos, and control lifecycle via simple HTTP. Gitpod shifted pricing model twice in 18 months; Coder is self-hosted-first; StackBlitz-containers are browser-only. We pick Daytona and we do not cross-shop.

### 1.4 Request Flow (ASCII)

```
   ┌─────────────┐  DNS: {slug}.patchparty.app / {custom-domain}
   │  End user   │       ↓
   └──────┬──────┘       ↓
          │    TLS handshake (CF ACME cert)
          ▼
   ┌────────────────────────────────────────────────────────────┐
   │                 CLOUDFLARE EDGE (POP nearest user)         │
   │                                                            │
   │   DNS · WAF · DDoS · CDN                                   │
   │                                                            │
   │   Worker chain (order matters):                            │
   │      [rate-limit] → [canary-split] → [auth-gate?]          │
   │                                                            │
   │   R2 bucket (assets, signed URLs, direct from edge)        │
   └──────────────────┬─────────────────────────────────────────┘
                      │ (origin pull — only when no cache-hit)
                      ▼
   ┌────────────────────────────────────────────────────────────┐
   │                 RAILWAY (region-pinned)                    │
   │                                                            │
   │   Service: frontend (Next.js, SSR/RSC)                     │
   │   Service: backend  (API, cron, workers)                   │
   │   ── private network ──                                    │
   │   Postgres  (PITR 7d)                                      │
   │   Redis     (optional, for rate-limit + jobs)              │
   └────────────────────────────────────────────────────────────┘

   (Dev-time, off the hot path)

   ┌────────────────────────────────────────────────────────────┐
   │                      DAYTONA                               │
   │   race-sandbox (V2.0)                                      │
   │   preview-env  (V3.0)  ── CF-Access-gated ──               │
   │   dev-env      (V3.5)  ── CF-Access-gated ──               │
   └────────────────────────────────────────────────────────────┘
```

The end-user path never touches Daytona. Daytona is the agent-plane and the dev-plane, fully isolated from the request-plane.

### 1.5 Layer Responsibilities (the one-line rule)

If you ever have to explain this stack in one breath:

- **Cloudflare** owns the edge and the domain.
- **Railway** owns the runtime and the data.
- **Daytona** owns the ephemeral, agent-facing and developer-facing sandboxes.

No layer owns what another layer owns. No layer is optional. No layer is substitutable without rewriting this spec.

---

## 2. Railway Spec

### 2.1 API surface

Endpoint: `https://backboard.railway.app/graphql/v2`.

Auth: Bearer token, either the PatchParty-platform service token (managed mode) or the user's own token (BYOK mode, see §8).

Introspection is public. We generate a typed client from their schema in `src/lib/railway/generated.ts`. All mutations go through a transaction wrapper that logs `PartyEvent("infra.railway.*")`.

### 2.2 Default Topology

```
Railway Project "{Project.slug}"
├── Environment: production
│   ├── Service: frontend   (Dockerfile: ./frontend.Dockerfile)
│   ├── Service: backend    (Dockerfile: ./backend.Dockerfile)
│   ├── Plugin:  postgres   (Postgres 16, PITR 7d default)
│   └── Plugin:  redis      (optional; V3.0+)
├── Environment: staging    (provisioned V3.5+; shares Postgres via read-only role)
└── Environment: pr-{n}     (Daytona-backed until V3.5, then Railway-native optional)
```

Two services is the MVP. Split-backend (worker service, cron service) is a V3.5 optimisation when PartyEvent volume crosses ~50k events/day per Project.

### 2.3 Region Pinning (HARD for GDPR)

Region-pinning is enforced at provision-time, not at runtime. A Project's region is set once during Repo-Genesis and **cannot be changed** without a user-initiated migration flow (V4.0+). Cross-region replication is explicitly forbidden without a signed user approval step.

| Region key | Railway region | Purpose |
|---|---|---|
| `EU` | `europe-west4` | Default for EU-flagged projects. Frankfurt-equivalent. GDPR-safe. |
| `US` | `us-west2` | Default for US-flagged projects. Portland. |
| `US-E` | `us-east4` | Alternate US, Virginia. Lower-latency to EU for bi-continent startups. |
| `APAC` | `asia-southeast1` | Default for APAC-flagged projects. Singapore. |

Region-detection at Project-create time:

1. If user sets `Project.region` explicitly — use it.
2. Else, infer from the user's Cloudflare Account-locale + GitHub profile country.
3. Fallback `EU` (conservative default — stricter jurisdiction).

The inference output is **shown to the user before provisioning** with a single-line confirm: _"Your Project will live in `europe-west4` (Frankfurt). Change?"_

### 2.4 Cost Tiers

| Tier | Railway price (team-managed) | Suitable for |
|---|---|---|
| Hobby | $5/mo | Demo-Mode, hackathon, throwaway |
| Pro | $20/mo | Single Brownfield/Greenfield Project under moderate load |
| Team | $50/mo+ per workspace | Multi-project agency setups |

PatchParty-managed mode passes **the actual Railway bill** through to the user's billing — we do not mark up Railway. Our margin is on LLM-cost and the Studio subscription ($19 flat, per 00-vision §16 Q5). This is a deliberate anti-pattern-avoidance: Vercel marks up compute 10x; we do not.

BYOK Railway (§8) removes all Railway cost from our pass-through entirely.

### 2.5 Service Spec (Prisma-adjacent YAML)

```yaml
# .patchparty/railway.yaml — generated by Repo-Genesis, committed to repo
project_slug: "{Project.slug}"
region: "europe-west4"
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
    replicas: 1
    autoscaling:
      enabled: false         # V2.5: no autoscale; V3.5 opt-in
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
    replicas: 1
plugins:
  postgres:
    version: "16"
    pitr_retention_days: 7
    backup_schedule: "0 2 * * *"
  redis:
    enabled: false            # V2.5 default; V3.0 opt-in
```

### 2.6 Deploy Command (Nelson's convention)

Nelson's git-workflow.md ships a Railway convention that MUST be honoured:

```bash
# Every Project includes this in its README and in .patchparty/deploy.sh
RAILWAY="/c/Users/nelso/AppData/Roaming/npm/railway.cmd"   # Windows path
# or on Linux/macOS:
RAILWAY="$(command -v railway)"

"$RAILWAY" up -s backend  -d
"$RAILWAY" up -s frontend -d
```

**Mandatory rule (from git-workflow.md):** after every `git push`, Railway must be deployed. The GitHub-snapshot-based auto-deploy is too slow and non-deterministic. PatchParty's Release-phase (Phase 8) always invokes `railway up -s {service} -d` directly.

The Release-phase Sonnet agent has this as a tool-call, not a shell-spawn: `tools.railway.deploy({ service: "backend", detached: true })` mapped to the GraphQL `serviceInstanceDeployV2` mutation.

### 2.7 Environment Variables

All env-vars land in Railway's encrypted env-store via GraphQL mutation `variableUpsert`. We never write secrets to the repo. Repo-Genesis seeds a `.env.example` with keys and docstrings; actual values are synced from `ProjectSecret` (Prisma model, AES-GCM at rest) into Railway at provision-time.

Sensitive env-vars are flagged `sealed = true` on the Railway side — they appear as `••••` in the Railway dashboard, cannot be read back, only rotated.

---

## 3. Cloudflare Spec

### 3.1 API surface

Endpoint: `https://api.cloudflare.com/client/v4`.

Auth: API Token (scoped: DNS.edit, Workers.edit, R2.edit, Access.edit, Pages.edit). Token scope is a `CloudflareConfig.scope` enum on our side so we can detect BYOK-under-permissioned before provisioning starts.

### 3.2 DNS Auto-Wiring

Every new Project gets `{slug}.patchparty.app` via our own root zone (managed mode). The wiring is:

```
{slug}.patchparty.app        →  CNAME → {railway-generated}.up.railway.app
*.preview.{slug}.patchparty.app → CNAME → {daytona-preview-hostname}
```

TLS is auto-issued via Cloudflare Universal SSL (ACME) — no action from user, no 24h wait on first cert. Validity is monitored via a nightly cron that calls `GET /zones/{id}/ssl/certificate_packs` and emits `PartyEvent("infra.cf.cert_expiring")` at 30-day threshold.

### 3.3 Custom Domain Flow

User wants `app.acme.com` instead of `acme.patchparty.app`:

1. User enters `app.acme.com` in Studio → Settings → Domains.
2. Studio shows two DNS records to copy:
   - CNAME: `app.acme.com` → `{slug}.patchparty.app`
   - TXT (verification): `_pp-verify.app.acme.com` → `pp-{random-uuid}`
3. User pastes records into their DNS provider.
4. Studio polls `dig` (via `dns.promises.resolveCname`) every 30s up to 15 min. On match, Studio calls `POST /zones/{custom-zone-id}/custom_hostnames` to add the hostname to CF, triggering ACME.
5. Cert issues in 60-120s. Studio surfaces "live" with a green checkmark.
6. Optional: wrap the custom hostname in CF-Access (§3.5) for staff-only environments.

Errors (cert-issuance fails, DNS mismatch, TXT missing) produce actionable messages with a copy-button for the exact record to fix.

### 3.4 Three Standard Workers

Every PatchParty Project gets three Workers deployed on provisioning. They live in the repo at `workers/{name}/index.ts` and deploy via Wrangler in the Repo-Genesis saga.

#### 3.4.1 Rate-Limit Worker

Sliding-window per-IP, 100 req/min default, configurable per-route. Backed by Cloudflare KV (free-tier) or Durable Objects (paid-tier for precision).

**Verbatim TypeScript (committed to every Project):**

```ts
// workers/rate-limit/index.ts
export interface Env {
  RATE_LIMIT_KV: KVNamespace;
  RATE_LIMIT_DEFAULT_PER_MINUTE: string; // "100"
}

const WINDOW_MS = 60_000;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
    const route = new URL(req.url).pathname.split("/").slice(0, 3).join("/");
    const key = `rl:${ip}:${route}`;

    const now = Date.now();
    const limit = Number(env.RATE_LIMIT_DEFAULT_PER_MINUTE ?? "100");

    const raw = await env.RATE_LIMIT_KV.get(key);
    const hits: number[] = raw ? JSON.parse(raw) : [];
    const fresh = hits.filter((t) => now - t < WINDOW_MS);
    fresh.push(now);

    ctx.waitUntil(
      env.RATE_LIMIT_KV.put(key, JSON.stringify(fresh), { expirationTtl: 120 }),
    );

    if (fresh.length > limit) {
      return new Response(
        JSON.stringify({ error: "rate_limited", retry_after_s: 60 }),
        { status: 429, headers: { "content-type": "application/json" } },
      );
    }

    return fetch(req);
  },
};
```

#### 3.4.2 Canary-Split Worker

Header-based traffic split. Promotion ladder: 5% → 25% → 50% → 100%, each step gated by a health-check. This is the Canary strategy from 00-vision §4 Phase 8, made concrete.

**Verbatim TypeScript (committed to every Project):**

```ts
// workers/canary-split/index.ts
export interface Env {
  CANARY_PERCENT: string;          // "0" | "5" | "25" | "50" | "100"
  BLUE_ORIGIN: string;             // https://{slug}-blue.up.railway.app
  GREEN_ORIGIN: string;            // https://{slug}-green.up.railway.app
  CANARY_OVERRIDE_COOKIE: string;  // e.g. "pp-canary"
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const percent = Number(env.CANARY_PERCENT ?? "0");

    // Sticky override: cookie wins. Operators can pin themselves to green.
    const cookie = req.headers.get("cookie") ?? "";
    const forceGreen = cookie.includes(`${env.CANARY_OVERRIDE_COOKIE}=green`);
    const forceBlue  = cookie.includes(`${env.CANARY_OVERRIDE_COOKIE}=blue`);

    let target: "blue" | "green";
    if (forceGreen) target = "green";
    else if (forceBlue) target = "blue";
    else {
      // Stable hash on IP + UA so a given client stays on one side per window.
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
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: hdrs,
    });
  },
};

function hashToPercent(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100;
}
```

The promotion script (`scripts/canary-promote.ts`) increments `CANARY_PERCENT` via CF API:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/workers/scripts/${PROJECT_SLUG}-canary/settings" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"bindings":[{"type":"plain_text","name":"CANARY_PERCENT","text":"25"}]}'
```

At each step, we poll `/api/health` on the green origin for 5 min. If p95-latency stays <800ms and error-rate <0.5%, the gate passes and the UI suggests the next step. If it fails, the Worker env-var reverts to the previous step atomically. Manual-promotion override (§11 failure-mode 6) skips the health-gate with a typed confirmation (Autopilot never skips; Director can).

#### 3.4.3 Auth-Preview-Gate Worker

Wraps preview-env URLs in CF-Access SSO. Every request to `*.preview.{slug}.patchparty.app` must carry a valid CF-Access JWT issued by the Project's Access Application.

**Verbatim TypeScript (committed to every Project):**

```ts
// workers/auth-preview-gate/index.ts
import { jwtVerify, createRemoteJWKSet } from "jose";

export interface Env {
  CF_ACCESS_TEAM_DOMAIN: string;   // e.g. "acme.cloudflareaccess.com"
  CF_ACCESS_AUD: string;           // application AUD tag
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const token =
      req.headers.get("cf-access-jwt-assertion") ??
      new URL(req.url).searchParams.get("cf_authorization");

    if (!token) {
      return redirectToLogin(req, env);
    }

    try {
      const jwks = createRemoteJWKSet(
        new URL(`https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`),
      );
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `https://${env.CF_ACCESS_TEAM_DOMAIN}`,
        audience: env.CF_ACCESS_AUD,
      });

      const forwarded = new Request(req);
      forwarded.headers.set("x-pp-access-email", String(payload.email ?? ""));
      forwarded.headers.set("x-pp-access-sub",   String(payload.sub   ?? ""));
      return fetch(forwarded);
    } catch {
      return redirectToLogin(req, env);
    }
  },
};

function redirectToLogin(req: Request, env: Env): Response {
  const url = new URL(req.url);
  const redirect = `https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/login?redirect_url=${encodeURIComponent(url.toString())}`;
  return Response.redirect(redirect, 302);
}
```

### 3.5 Access (SSO)

Preview-envs and any non-production environment are gated by CF-Access by default. Identity providers supported:

- **GitHub** (default; user already has a GitHub account because Repo-Genesis required one).
- **Google Workspace** (configurable).
- **Okta / SAML** (V3.5+, B2B target).

Access-policy per Project:

- `preview.*.{slug}.patchparty.app` → Group: `project-{slug}-members`, default identity-provider: GitHub, default MFA: required.
- `{slug}.patchparty.app` → **public by default**; Access only if user toggles "staff-only".

### 3.6 R2

R2 is the asset-store. See `08-asset-pipeline.md` for the full asset schema. Infra-relevant details:

- One R2 bucket per Project: `pp-{project-id}-assets`.
- Signed-URL issuance happens at the edge (a fourth optional Worker: `presign`); no round-trip to Railway for read.
- Egress is $0. This is the reason R2 won the asset-store bake-off (vs. S3 + CloudFront).

### 3.7 Pages (V3.5+)

For static sites (marketing pages, docs, public demo-mode replays), CF Pages:

- One Pages project per Project.slug.
- Built from a `docs/` subfolder on `main` branch push.
- No Railway compute consumed for doc traffic — pure edge.
- Automatic preview-URLs per branch, gated by Access.

---

## 4. Daytona Expansion

Daytona is already in production for V2.0 race-sandboxes. The V2.5→V4.0 expansion repurposes the same API surface for two new lifecycle-classes.

### 4.1 V2.0 — Race Sandbox (shipping)

- One workspace per race-candidate.
- Created via `POST /workspace` with a `raceRunId` tag.
- 30-min TTL (hard-kill at 35 min grace).
- Isolated container, no cross-candidate network.
- Image: `patchparty/race-sandbox:v2-{YYYYMMDD}`.

### 4.2 V3.0 — Preview-Env per PR

- One workspace per open PR on `{Project.slug}`.
- Created on PR-open webhook from GitHub.
- Bound to a subdomain `{pr-number}.preview.{slug}.patchparty.app` via CF Worker.
- CF-Access-gated (see §3.4.3).
- 7-day TTL from last activity.
- Auto-pause after 30-min idle (Daytona `workspace.pause`).
- Auto-resume on first HTTP request (CF Worker waits up to 8s, streams loading-state to client).

### 4.3 V3.5 — Dev-Env (VS-Code-in-Browser)

- One workspace per Project, per user.
- Persistent — user-controlled lifecycle.
- VS-Code Server exposed on port 8080, wrapped by CF Worker with Access.
- Shares R2 bucket via mounted credentials.
- Tier-sized: Small (1 vCPU / 2 GB), Medium (2 vCPU / 4 GB), Large (4 vCPU / 8 GB).

### 4.4 Workspace Template (YAML)

Every Daytona workspace is instantiated from a YAML template committed to the Project's repo.

```yaml
# .patchparty/daytona/workspace.yaml
apiVersion: daytona.io/v1
kind: WorkspaceTemplate
metadata:
  name: "{project-slug}-preview"
  labels:
    project-id: "{project-id}"
    lifecycle: preview
spec:
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
      visibility: private        # enforced by CF-Access
  env:
    - name: DATABASE_URL
      valueFrom:
        secretRef: "${PROJECT_SLUG}-preview-db-url"
    - name: NEXT_PUBLIC_APP_URL
      value: "https://${DAYTONA_BRANCH}.preview.${PROJECT_SLUG}.patchparty.app"
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

### 4.5 Resource Limits and Cost Model

| Class | CPU | Memory | Disk | Price (platform-managed pass-through) |
|---|---|---|---|---|
| race-sandbox | 1 vCPU | 2 GB | 5 GB | $0.04/hr, burst only (30-min TTL → $0.02/race) |
| preview-env | 1.5 vCPU | 3 GB | 10 GB | $0.08/hr active, $0.01/hr paused |
| dev-env-Small | 1 vCPU | 2 GB | 15 GB | $0.06/hr |
| dev-env-Medium | 2 vCPU | 4 GB | 30 GB | $0.12/hr |
| dev-env-Large | 4 vCPU | 8 GB | 60 GB | $0.24/hr |

We pass Daytona cost through 1:1 in managed mode. In BYOK-Daytona mode, the cost is the user's.

---

## 5. Release Race Concretized

Phase 8 from 00-vision §4 has three strategies. Each is now a concrete config, not a name on a button.

### 5.1 Canary

**Config:**
- Railway blue/green: two services `{slug}-blue` and `{slug}-green`, same Postgres.
- CF Worker `canary-split` (§3.4.2) routes header-based.
- Promotion ladder: 0% → 5% → 25% → 50% → 100%, each gated by health-check on `/api/health`.
- Health-check windows: 5 min per step, p95 < 800 ms, error-rate < 0.5%.

**Verbatim promotion call (shell):**

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
      { \"type\": \"kv_namespace\", \"name\": \"RATE_LIMIT_KV\", \"namespace_id\": \"${CF_KV_ID}\" }
    ]
  }"
```

**PartyEvent emitted:** `deploy.canary.step_promoted` with `{ step_from, step_to, health_snapshot }`.

### 5.2 Blue-Green

**Config:**
- Two Railway services `{slug}-blue` and `{slug}-green`, both hot, both bound to same Postgres.
- CF DNS points to the active one via a single CNAME.
- Promotion = atomic DNS-swap.

**Verbatim CF DNS swap:**

```bash
#!/usr/bin/env bash
set -euo pipefail
SLUG="${1:?project slug required}"
TARGET="${2:?target color: blue|green}"

# Fetch current record ID
RECORD_ID=$(curl -fsS \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${SLUG}.patchparty.app&type=CNAME" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  | jq -r '.result[0].id')

# Atomic swap
curl -fsS -X PUT \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"CNAME\",
    \"name\": \"${SLUG}.patchparty.app\",
    \"content\": \"${SLUG}-${TARGET}.up.railway.app\",
    \"ttl\": 60,
    \"proxied\": true
  }"
```

**PartyEvent:** `deploy.bluegreen.swapped` with `{ from_color, to_color, cname_ttl_s }`.

### 5.3 Big-Bang

**Config:**
- Direct `railway up -s backend -d` and `railway up -s frontend -d`.
- No intermediate environment, no traffic split.

**Constraints (anti-pattern guards):**
- Big-Bang is **explicitly marked anti-pattern** in the UI. The button is labelled "Big-Bang (not recommended)".
- Greenfield Projects cannot select Big-Bang for their first production release. It is only available from the second release onward, when a rollback plan exists.
- Only Brownfield-V2.0 single-service Projects can use Big-Bang as default — honouring Nelson's existing `railway up` convention for repositories that existed pre-PatchParty.
- Autopilot mode cannot select Big-Bang.

**PartyEvent:** `deploy.bigbang.executed` with `{ warned: true, user_ack: timestamp }`.

---

## 6. International-Standard Checklist

This is the "internationaler Standard" Nelson named. Every Project ships checking these 10 items. Fail-any = red banner on Project dashboard.

1. **Multi-region deploy option** — at least one of `EU`, `US`, `APAC` is configured at Repo-Genesis. Enforced in §2.3.
2. **GDPR region-pinning enforced** — `Project.region` is immutable post-provisioning; migration requires signed approval flow. §9 Prisma constraint.
3. **TLS auto via CF ACME** — Universal SSL on root + custom-hostname TLS on any added domain. Checked nightly (§3.2).
4. **WAF active default** — CF Free-Tier OWASP Core Ruleset active on all hostnames.
5. **DDoS protection default** — CF Layer 3/4/7 on all hostnames (free-tier, auto).
6. **CDN cache-hit > 80%** — pre-configured CF Page Rules: cache-everything for `/_next/static/*`, `/assets/*`, `*.js`, `*.css`, `*.woff2`. Checked weekly, reported in Studio dashboard.
7. **SOC-2-ready audit-log** — PartyEvent stream retains 365d minimum, immutable (append-only), exportable as CSV. The existing V2.0 telemetry pipeline already meets this.
8. **99.9% SLA via health-check gate** — every deploy blocked on `/api/health` passing; canary promotion gated on 5-min health-pass window; blue-green swap blocked on green health-pass.
9. **Backup policy: Postgres PITR 7d** — Railway's default on Postgres plugin is 7 days PITR. Upgrade to 30d is a Team-tier feature.
10. **Disaster-recovery runbook** — Repo-Genesis generates a `RUNBOOK.md` in the repo with per-Project DR steps: DNS-failover, Railway-service-restart, Postgres-restore-from-PITR, Daytona-sandbox-rebuild. Updated on every Release.

---

## 7. Repo-Genesis Saga (transactional 5-provider provisioning)

Repo-Genesis (00-vision §4 Phase 5) is now a **transactional saga** across five providers. Any step failure triggers reverse-order rollback. The saga is implemented in `src/lib/repo-genesis/saga.ts`.

### 7.1 Steps and Compensations

| # | Step | Provider | Forward action | Compensation |
|---|---|---|---|---|
| 1 | Create repo | GitHub App | `POST /repos` | `DELETE /repos/{owner}/{name}` |
| 2 | Provision runtime | Railway | `mutation projectCreate` + services + postgres | `mutation projectDelete` |
| 3 | Wire edge | Cloudflare DNS + Workers | `POST /zones/{id}/dns_records` x N + `PUT /workers/scripts/*` | `DELETE /zones/{id}/dns_records/{id}` x N + `DELETE /workers/scripts/*` |
| 4 | Provision storage | Cloudflare R2 | `POST /accounts/{id}/r2/buckets` + presign-key mint | `DELETE /accounts/{id}/r2/buckets/{name}` |
| 5 | Provision sandbox | Daytona | `POST /workspace-template` | `DELETE /workspace-template/{id}` |

### 7.2 Saga Pseudocode

```ts
// src/lib/repo-genesis/saga.ts (pseudocode)
type Step = {
  name: string;
  forward: () => Promise<Record<string, unknown>>;
  compensate: (state: Record<string, unknown>) => Promise<void>;
};

export async function runRepoGenesisSaga(
  projectId: string,
  steps: Step[],
  logger: EventEmitter,
): Promise<SagaResult> {
  const completed: Array<{ step: Step; state: Record<string, unknown> }> = [];

  for (const step of steps) {
    logger.emit("repo_genesis.step.start", { projectId, name: step.name });
    try {
      const state = await step.forward();
      completed.push({ step, state });
      logger.emit("repo_genesis.step.ok", { projectId, name: step.name });
    } catch (err) {
      logger.emit("repo_genesis.step.fail", {
        projectId,
        name: step.name,
        error: asError(err).message,
      });

      // Reverse-order compensation
      for (const done of completed.reverse()) {
        try {
          await done.step.compensate(done.state);
          logger.emit("repo_genesis.compensate.ok", {
            projectId,
            name: done.step.name,
          });
        } catch (compErr) {
          logger.emit("repo_genesis.compensate.fail", {
            projectId,
            name: done.step.name,
            error: asError(compErr).message,
          });
          // Orphaned resource — surface to ops dashboard; do not retry blindly.
        }
      }
      return { ok: false, failedAt: step.name };
    }
  }

  return { ok: true };
}
```

**Guarantees:**
- Idempotent: each forward step must be a no-op on retry (external provider's create API should return existing resource). If not natively idempotent, we wrap in a "check-then-create".
- Partial-failure-visible: the operator dashboard shows orphaned resources from failed compensations (rare, but possible).
- User-visible: the Studio UI shows a 5-step progress bar during Repo-Genesis. On failure, the failed step highlights red with the actionable error.

### 7.3 Timing Budget

| Step | p50 | p95 | Timeout |
|---|---|---|---|
| GitHub repo create | 2s | 6s | 20s |
| Railway project + services + postgres | 12s | 30s | 90s |
| Cloudflare DNS + Workers | 8s | 20s | 60s |
| R2 bucket + presign | 3s | 8s | 30s |
| Daytona workspace-template | 5s | 15s | 60s |
| **Total** | **30s** | **75s** | **260s (hard cap)** |

---

## 8. BYOK-for-Infra

V2.0 already ships BYOK for LLM providers via `src/lib/byok.ts` (AES-GCM, per-User keys). V2.5 extends the same pattern to infra providers.

### 8.1 Providers

| Provider | BYOK format | Validation endpoint |
|---|---|---|
| Railway | API token | `query { me { id email } }` on GraphQL |
| Cloudflare | Scoped API token | `GET /user/tokens/verify` |
| Daytona | Account token | `GET /api/user` |
| GitHub | already per-user via GitHub-App installation | installation-token exchange |

### 8.2 Flow

1. User goes to Studio → Settings → BYOK-Infra.
2. Pastes each token. UI shows required scopes per provider.
3. On submit: each token is **test-called** against its validation endpoint. Fail = red banner with the exact scope missing.
4. On pass: token is AES-GCM-encrypted via the same keyring as LLM-BYOK (same `src/lib/crypto.ts`), stored as `ProviderCredential` row.
5. Per-Project toggle: **Managed (PatchParty-hosted)** vs **BYOK**.
6. In BYOK mode, PatchParty never sees raw provider bills — they go to the user directly.

### 8.3 Cost Implications (shown in UI at BYOK toggle)

| Mode | Infra cost | LLM cost | PatchParty margin |
|---|---|---|---|
| Fully-Managed | Pass-through (no markup) | Pass-through (no markup) | Studio-subscription ($19/mo flat) |
| BYOK-LLM, Managed-Infra | Pass-through | Zero (user's bill) | Studio-subscription |
| Managed-LLM, BYOK-Infra | Zero (user's bill) | Pass-through | Studio-subscription |
| Fully-BYOK | Zero | Zero | Studio-subscription only |

We are not a cost-arbitrage business. We are a Studio. BYOK is offered because B2B enterprise buyers will not sign if their infra is on our bill. Explicit in all sales conversations.

### 8.4 Validation Code (shape)

```ts
// src/lib/byok/validate.ts
export async function validateRailwayToken(token: string): Promise<ValidationResult> {
  const res = await fetch("https://backboard.railway.app/graphql/v2", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: "{ me { id email } }" }),
  });
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  const body = (await res.json()) as { data?: { me?: { id: string } } };
  if (!body.data?.me?.id) return { ok: false, reason: "no_me" };
  return { ok: true, identity: body.data.me.id };
}

export async function validateCloudflareToken(token: string): Promise<ValidationResult> {
  const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  const body = (await res.json()) as { success: boolean; result?: { status?: string } };
  if (!body.success || body.result?.status !== "active") {
    return { ok: false, reason: "token_inactive" };
  }
  return { ok: true };
}

export async function validateDaytonaToken(token: string): Promise<ValidationResult> {
  const res = await fetch("https://api.daytona.io/api/user", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  return { ok: true };
}
```

All three land in `ProviderCredential.status = "validated" | "invalid" | "expired"` and are re-validated nightly by a cron.

---

## 9. New Prisma Models

Additive-only. No change to existing V2.0 models except the two fields on `Project`.

```prisma
// schema.prisma — v3.0 additions

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

model Project {
  id                   String   @id @default(cuid())
  slug                 String   @unique
  ownerId              String
  region               ProjectRegion @default(EU)
  primaryCustomDomain  String?  @unique
  // ... existing V2.0 fields

  deploymentConfigs    DeploymentConfig[]
  deploymentRuns       DeploymentRun[]
  previewEnvs          PreviewEnv[]
  providerCredentials  ProviderCredential[]

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
  daytonaTemplateId String?
  healthPath        String              @default("/api/health")
  healthTimeoutS    Int                 @default(30)
  canaryLadder      Json                @default("[5, 25, 50, 100]")
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
  lastValidAt  DateTime?
  lastErrorAt  DateTime?
  lastErrorMsg String?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  @@unique([userId, provider, projectId])
  @@index([status])
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
```

**Migration impact:** additive. Existing Brownfield V2.0 Projects get `region = EU` as migration default, `primaryCustomDomain = null`. No backfill needed for DeploymentConfig/Run — they are created on first Release-phase run.

---

## 10. ADR-008: Three-Layer Infra Stack (Railway + Cloudflare + Daytona)

**Status:** Accepted, 2026-04-18.
**Deciders:** Nelson Mehlis (founder), Squad I (infra).
**Supersedes:** none.
**Superseded by:** none.

### Context

PatchParty Studio must ship shipped product, not just code. "Shipped" means: live under a domain, with TLS, WAF, DDoS, CDN, region-pinning for GDPR, auditability, backups, and a 99.9%-SLA-capable release mechanism. The V2.0 Brownfield codebase already runs on Railway (Nelson's existing convention), and V2.0 already uses Daytona for sandboxes. The open questions were (a) whether to consolidate to a single vendor (Vercel+Supabase, or AWS) or stay multi-vendor, and (b) what the edge layer is.

### Decision

PatchParty commits to a three-layer, three-vendor stack:

1. **Railway** — prod runtime (backend, frontend, Postgres, Redis).
2. **Cloudflare** — edge (DNS, CDN, WAF, DDoS, Workers, R2, Access, Pages).
3. **Daytona** — sandboxes (race, preview-env, dev-env).

Each layer has one vendor, picked once, not cross-shopped. No layer is optional.

### Alternatives Considered

**Vercel + Supabase (rejected).**
- Pro: single-vendor simplicity; Next.js first-class; edge functions and Postgres in one pitch.
- Con: **egress lock-in** — Vercel's bandwidth cost blows up at scale; Supabase's Postgres is not region-pinnable in the same way as Railway's dedicated Postgres; custom Workers/Edge logic is Vercel-specific, non-portable.
- Con: Vercel is a direct competitor in the "agentic app-builder" space (v0). Building on their runtime is strategically hostile.
- Con: Supabase egress + Vercel egress is 2x the cost of R2 + Railway on any non-trivial asset-heavy project.

**AWS + Amplify (rejected).**
- Pro: maximum control, SOC-2 off-the-shelf, every region.
- Con: **operational surface eats the founder.** One person cannot maintain IAM, VPC, Route53, CloudFront, ACM, WAF, S3, RDS, ECS, Lambda, Secrets Manager, and their respective Terraform modules while also shipping a product. This is the lesson of every solo-founder SaaS that went AWS early and never recovered.
- Con: DX is 10x worse than Railway; agent-driven provisioning would require Terraform or CDK, adding a toolchain layer.
- Con: cost is unpredictable without FinOps tooling we do not have.

**Fly.io + Neon (seriously considered).**
- Pro: Fly's region-pinning and anycast routing are excellent; Neon's branching-Postgres matches our loser-branch model conceptually.
- Con: Fly's billing model is instance-hours with cold-start variability; Railway's is predictable-subscription.
- Con: Neon-branching-as-git-branching is architecturally seductive but operationally unproven for our scale of parallelism (5 race-candidates × N projects × M users).
- Con: **Nelson's mental-model is already Railway** — switching costs his productivity before our productivity.

### Consequences

**Positive:**
- Predictable cost: Railway $20-50/mo/project, Cloudflare $0-20/mo/project, Daytona pay-per-use.
- DX compounds: one CLI (`railway`), one edge-CLI (`wrangler`), one sandbox-CLI (`daytona`). All three are scriptable from a Node.js process.
- Multi-region story is coherent from day 1 — no retrofit.
- Each vendor is best-in-class at their layer; none is a kitchen-sink.

**Negative:**
- **Vendor concentration risk per layer.** Railway outage = global prod-outage for PatchParty Projects. Cloudflare outage = global edge outage (but this is true for 40%+ of the internet anyway). Daytona outage = agent-plane outage (dev can fall back to local).
- Three vendors means three status-pages, three support channels, three billing relationships. Mitigated by shared ops-dashboard.
- No cross-vendor portability: a Project cannot "lift-and-shift" off Railway without a migration. Mitigated by BYOK (§8) + open-source reference implementation (Non-Negotiable from 00-vision §12).

**Neutral:**
- We commit to the Cloudflare edge whether or not we ever need it for a specific Project. Most Free-Tier. Acceptable.

### Review Trigger

Re-open this ADR if:
- Railway raises pricing by >2x or EOLs the GraphQL API.
- Cloudflare changes R2 egress pricing away from $0.
- Daytona is acquired and pricing changes materially.
- Any single-vendor competitor ships a demonstrably superior end-to-end pitch (Vercel+v0+AI-SDK with embedded sandbox would be the canonical threat).

---

## 11. Failure Modes (10)

Every infra failure mode has a detection, a mitigation, and a PartyEvent.

### 11.1 Railway API rate-limit during Repo-Genesis

- **Symptom:** `projectCreate` mutation returns `429` or `5xx` during saga step 2.
- **Mitigation:** exponential backoff `250ms, 500ms, 1s, 2s, 4s` (max 5 retries), then saga-compensate.
- **Event:** `infra.railway.rate_limited`.
- **User-visible:** "Railway is throttling our requests — retrying in 2s." No user action required.

### 11.2 Cloudflare DNS propagation delay

- **Symptom:** DNS record created via API but not yet resolvable globally (caches, GeoDNS).
- **Mitigation:** 300s grace period with active polling (`dig +short` via DoH from 3 geographically distinct resolvers). UI shows "propagating…" with a progress bar. After 300s: actionable error with resolver-check instructions.
- **Event:** `infra.cf.dns_propagation_slow` (after 60s), `infra.cf.dns_propagation_failed` (after 300s).

### 11.3 Daytona workspace OOM

- **Symptom:** workspace process killed by OOM-killer; container restarts detected via workspace API.
- **Mitigation:** auto-resize one tier up (Small→Medium, Medium→Large). If already Large: PartyEvent + user notification, do not auto-scale to XL.
- **Event:** `infra.daytona.oom_autoresize` with `{ from_tier, to_tier }`.

### 11.4 Cross-region data leak via `railway link` to wrong region

- **Symptom:** user's local CLI links to a Railway project in a different region than `Project.region` in our DB.
- **Mitigation:** **region-check guard** — every `railway up` invocation from our tool-call layer first queries the target project's region via GraphQL and aborts if mismatch. Error is loud: "Your Project is pinned to `europe-west4` but your link points to `us-west2`. Aborting to prevent cross-region data leak."
- **Event:** `infra.railway.region_mismatch_blocked`.

### 11.5 Preview-env URL leak

- **Symptom:** a preview-env URL appears in an external context (pastebin, screenshot, search engine).
- **Mitigation:** **CF-Access gate is mandatory** on all preview URLs. An unauthenticated GET returns a 302 to the Access login, not the content. URL leak alone is not a data leak.
- **Event:** `infra.cf.preview_unauthorized_attempt` with `{ url, ip_country }`.

### 11.6 Canary traffic stuck at 5% (health-gate flapping)

- **Symptom:** health-check alternates pass/fail across the 5-min window; never reaches the 25% threshold.
- **Mitigation:** **manual-promotion override** — Director-mode operator can click "Promote anyway" with a typed confirmation (`I understand the risk`). Autopilot-mode does not get this override — it auto-rolls back after 3 flapping cycles.
- **Event:** `deploy.canary.health_flapping`, `deploy.canary.manual_override`.

### 11.7 R2 bucket quota exceeded

- **Symptom:** presign issuance fails with quota-exceeded.
- **Mitigation:** dunning flow — email user, show banner, grace-period 7 days (existing assets still readable; new uploads blocked). After 7 days: new uploads stay blocked until payment clears or Project is archived.
- **Event:** `infra.cf.r2_quota_exceeded`, `infra.cf.r2_dunning_email_sent`.

### 11.8 Daytona cold-start > 30s

- **Symptom:** preview-env resume from paused state takes > 30s, user sees timeout.
- **Mitigation V3.0:** show "warming up, ~15s remaining" UI with a progress bar. Increase CF Worker timeout to 45s.
- **Mitigation V3.5+:** pre-warm pool of N idle workspaces per region; on resume, swap user-state into a pre-warm instead of cold-starting.
- **Event:** `infra.daytona.cold_start_slow` with `{ actual_ms, tier }`.

### 11.9 CF cert-issuance fails (DNS misconfigured)

- **Symptom:** custom-hostname stuck in `pending_validation` beyond 15 minutes.
- **Mitigation:** actionable error message — Studio UI shows the exact DNS record the user needs to add or fix, with a "copy" button. Auto-retry the ACME challenge every 5 min for up to 2 hours.
- **Event:** `infra.cf.cert_issuance_failed` with `{ hostname, reason }`.

### 11.10 Railway deploy silently succeeds but service unhealthy

- **Symptom:** `railway up` exits 0, deploy is "SUCCESS", but the service returns 5xx on every request (e.g. bad env-var, DB migration failed).
- **Mitigation:** **mandatory health-check gate** after every deploy. Studio does not mark `DeploymentRun.status = SUCCEEDED` until `/api/health` returns 200 for 60 consecutive seconds. If it fails: auto-rollback by re-pointing the active service to the previous deploy ID.
- **Event:** `deploy.health_gate_failed`, `deploy.auto_rollback`.

---

## 12. V2.5 / V3.0 / V3.5 / V4.0 Phasing

This amends 00-vision §14 Roadmap. The infra story sequences as follows.

### V2.5 — "Railway Deploy + CF DNS + Daytona Race" (MVP, +6 → +18 wks)

**In scope:**
- Railway provisioning via GraphQL (saga step 2 of Repo-Genesis).
- Cloudflare DNS wiring for `{slug}.patchparty.app` (saga step 3, DNS-only).
- Daytona race-sandbox (already V2.0, no change).
- TLS auto via Universal SSL.
- Big-Bang release strategy only (direct `railway up`).
- Managed-mode only (no BYOK-infra).

**Out of scope:**
- Workers (no Canary, no rate-limit Worker yet).
- Preview-envs.
- Custom domains.
- Blue-Green.

**Ship criteria:**
- Greenfield Brief → `{slug}.patchparty.app` live in under 4 minutes median, under 10 minutes p95.
- Repo-Genesis saga passes a 100-run chaos test with ≤ 2% orphaned-resource rate.

### V3.0 — "CF Workers + Preview-Envs" (+22 → +32 wks)

**In scope:**
- Three Workers (rate-limit, canary, auth-gate) deployed per Project.
- Canary release strategy (5→25→50→100% ladder).
- Preview-envs per PR via Daytona, CF-Access-gated.
- Custom domains (user-owned CNAME).
- BYOK-infra for Railway + Cloudflare (Daytona BYOK deferred to V3.5).
- R2 bucket provisioning (saga step 4) — unblocks 08-asset-pipeline.md V3.0 image assets.

**Ship criteria:**
- Canary promotion 0→100% in <30 min with all health-gates green.
- Preview-env from `git push` to live URL in under 90s p95.

### V3.5 — "Dev-Envs + Multi-Region" (+32 → +38 wks)

**In scope:**
- Daytona Dev-Env (VS-Code-in-browser) with persistent lifecycle.
- Multi-region provisioning at Project-create time (EU/US/APAC).
- Daytona BYOK.
- CF Pages integration for marketing/docs sites.
- Pre-warm pool for preview-env cold-starts.

**Ship criteria:**
- Dev-Env launch time <8s p95.
- Multi-region end-to-end latency test: EU Project p95 < 400ms TTFB from Frankfurt, APAC Project p95 < 400ms TTFB from Singapore.

### V4.0 — "Blue-Green default + SOC-2" (+38 wks → …)

**In scope:**
- Blue-Green becomes the default release strategy (Canary remains available).
- CF Pages for marketing.
- SOC-2 Type-1 audit-ready (365d audit log retention, MFA enforcement on all Access, documented controls).
- Region-migration flow (user-initiated move of Project from EU→US).
- Autopilot-safe Canary (health-gate-driven, no human in the loop for passing promotions).

---

## 13. PartyEvent Telemetry (deploy.* and preview.*)

Every infra operation emits a PartyEvent. The schema follows the V2.0 telemetry pipeline. Below is the V2.5→V3.0 event catalogue for deploy + preview + infra.

```ts
// src/lib/events/types.ts additions
export type DeployPreviewEvent =
  | { type: "deploy.requested"; projectId: string; strategy: DeploymentStrategy; commitSha: string; initiatedBy: string }
  | { type: "deploy.provisioning_started"; deploymentRunId: string; projectId: string }
  | { type: "deploy.railway.up_invoked"; deploymentRunId: string; service: "backend" | "frontend"; detached: boolean }
  | { type: "deploy.railway.up_completed"; deploymentRunId: string; service: string; durationMs: number; deployId: string }
  | { type: "deploy.health_gate_started"; deploymentRunId: string; path: string; windowS: number }
  | { type: "deploy.health_gate_passed"; deploymentRunId: string; durationMs: number; p95Ms: number; errorRate: number }
  | { type: "deploy.health_gate_failed"; deploymentRunId: string; reason: string; p95Ms?: number; errorRate?: number }
  | { type: "deploy.canary.step_promoted"; deploymentRunId: string; stepFrom: number; stepTo: number; healthSnapshot: unknown }
  | { type: "deploy.canary.health_flapping"; deploymentRunId: string; flapCount: number }
  | { type: "deploy.canary.manual_override"; deploymentRunId: string; userId: string; reason: string }
  | { type: "deploy.bluegreen.swapped"; deploymentRunId: string; fromColor: "blue" | "green"; toColor: "blue" | "green"; cnameTtlS: number }
  | { type: "deploy.bigbang.executed"; deploymentRunId: string; warned: true; userAck: string }
  | { type: "deploy.auto_rollback"; deploymentRunId: string; toDeployId: string; reason: string }
  | { type: "deploy.completed"; deploymentRunId: string; status: DeploymentStatus; durationMs: number }
  | { type: "preview.created"; previewEnvId: string; projectId: string; branch: string; prNumber?: number; url: string }
  | { type: "preview.resumed"; previewEnvId: string; coldStartMs: number }
  | { type: "preview.paused"; previewEnvId: string; reason: "idle_30m" | "user_request" }
  | { type: "preview.destroyed"; previewEnvId: string; reason: "ttl_7d" | "pr_closed" | "user_request" };
```

Total: 18 event shapes. All ingested by the existing V2.0 telemetry pipeline; no schema extension needed beyond the type union.

---

## 14. Open Questions (need answers before V2.5 ship)

1. **Workspace-template versioning.** Do we version workspace-templates in the Project's repo (`.patchparty/daytona/workspace.v1.yaml`, `v2.yaml`) or in our managed registry? Repo-side = user-portable; registry-side = we can hotfix across fleet. Lean: repo-side with fallback to registry.

2. **CF-Access identity-provider default.** GitHub is the obvious default (we already have the user's GitHub identity), but enterprise B2B buyers will want SAML/Okta from day one. Do we ship GitHub-only V3.0 and SAML V3.5, or do both in V3.0?

3. **Canary header-sticky-hash function.** The `canary-split` Worker hashes on `IP + UA`. Is this GDPR-safe (IP is PII)? Alternative: hash on a cookie we set (our own random ID). Trade-off: cookie adds a round-trip on first request; IP+UA is stable and fast.

4. **Region-inference fallback when user is in a country we don't map.** Fallback EU is the conservative default but might annoy US users who never explicitly set. Do we show a modal on first Project-create, or infer silently?

5. **BYOK-Daytona billing.** Daytona doesn't have a first-class "child-account" model today. In BYOK-Daytona mode, do we create workspaces under the user's account directly (requiring their token to have write scope to their workspaces) or require them to pre-provision a Daytona org we then belong to?

6. **Preview-env DB strategy.** Does each preview-env get its own forked Postgres (Neon-branching style, but Railway doesn't support branches natively) or share the staging Postgres with schema isolation? V3.0 proposal: shared staging Postgres with per-preview schema. V4.0 explore Railway-branch-Postgres if available.

7. **Region-migration flow (V4.0).** When a user moves a Project from EU→US, what's the cutover window and the data-migration strategy? Stop-the-world Postgres dump-and-restore is simplest but implies downtime. Live-replication-and-cutover is operational complexity we may not want as a solo team.

8. **Third-party integrations at the edge.** Does PatchParty ever proxy through Workers for third-party integrations (Stripe webhooks, OAuth callbacks), or do those always hit Railway directly? Trade-off: Workers can do signature verification before Railway sees the payload (DDoS-proofing webhooks); Railway-direct keeps Worker footprint small.

---

## 15. Handoff

**What this document changes downstream:**

- `00-vision.md §4 Phase 8 (Release)` — the three strategies are now concrete configs, not labels. This document is the canonical reference; 00-vision should link here.
- `00-vision.md §5 Race-Mechanic Principle 7 (Budget-Governor)` — infra costs join LLM costs in the budget bar (§8.3 cost implications). Budget-Governor must read from two sources.
- `00-vision.md §12 Risks` — "Vendor concentration risk per layer" (§10 ADR consequences) is a new residual-risk row.
- `00-vision.md §14 Roadmap` — V2.5/V3.0/V3.5/V4.0 entries must sync with §12 of this doc.
- `08-asset-pipeline.md` — R2 is confirmed as asset-store at the edge; this document is the authoritative source for R2-provisioning flow (saga step 4).
- `09-autopilot-mode.md` (when written) — Autopilot-mode's "reversibility-cliff" intervention-policy must include a gate before any Blue-Green swap or Canary 100% promotion.
- `src/lib/byok.ts` (V2.0 code) — extended to handle `InfraProvider` enum in V2.5.
- New files: `src/lib/repo-genesis/saga.ts`, `src/lib/railway/client.ts`, `src/lib/cloudflare/client.ts`, `src/lib/daytona/client.ts`, `workers/rate-limit/`, `workers/canary-split/`, `workers/auth-preview-gate/`, `scripts/canary-promote.sh`, `scripts/bluegreen-swap.sh`.

**What a next-session agent reads first to extend this:**

1. `00-vision.md §4` and `§14` for phasing context.
2. This doc (11-deployment-infra.md) end-to-end.
3. `08-asset-pipeline.md` for R2 details.
4. `src/lib/byok.ts` in the V2.0 codebase for the encryption pattern.
5. The three Worker TypeScript files referenced in §3.4 as source-of-truth.

**Status of this spec:** v1.0, accepted 2026-04-18 as the load-bearing infra spec. Awaiting: ADR-008 ratification by the architect squad, Round 3 Squad G sign-off on R2 + asset-pipeline alignment, and Nelson's final review on the BYOK cost-implications table (§8.3) before V2.5 implementation begins.

**This is the international-standard stack. Railway. Cloudflare. Daytona. Three layers, picked on purpose.**
