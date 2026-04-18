# Security Policy

## Reporting a vulnerability

Please do **not** file a public GitHub issue for security vulnerabilities.

Email `nelson@ultranova.io` with:

- A description of the issue
- Steps to reproduce (proof-of-concept if possible)
- The affected commit SHA or release tag
- Your name / handle for credit (optional)

You will get an acknowledgment within 72 hours. We aim to ship a fix or mitigation within 14 days for critical issues, longer for low-severity ones.

## Scope

PatchParty is a side project — best-effort security, not a commercial SLA. Things we care about:

- **Secret leakage.** API keys, tokens, or user data surfacing in logs, error responses, or the public preview proxy.
- **Auth bypass.** Anything that lets one user act on another user's behalf, view another user's parties, or impersonate a session.
- **Sandbox escape.** The Daytona sandbox boundary is load-bearing — breaking out of it into the host app or Railway environment is critical.
- **Preview-proxy abuse.** The iframe proxy at `/api/preview/[target]/[[...path]]` rewrites URLs and strips headers; SSRF or path-traversal findings are in scope.
- **RCE via agent prompt injection.** The agents execute code in sandboxes. If a crafted GitHub issue can make an agent do something out-of-sandbox, that is in scope.

## Not in scope

- Rate limiting / DoS of the hosted service (we throttle at the edge).
- Missing security headers on non-authenticated routes.
- Findings on dependencies with no upgrade path (we track these in [`npm audit`](https://github.com/ThePyth0nKid/patchPartyDaytonaLovable/security) and fix as upstream fixes ship).

## Supported versions

Only `main` is supported. Tagged releases are hackathon snapshots — no backports.

## Credit

We will credit reporters in the release notes unless you request otherwise.
