# Agent privacy specs (draft)

Status: **draft spec, docs only.** No code, deploys or env changes. Nothing here touches the services frozen for judging (treasurer, recorder, llx-pay, proofs). Implementation starts after judging, in a new service/package, each step needing owner approval.

Motivation (generic): an agent with read-only access to private financial data can still disclose it. Read-only limits *actions*, not *where output goes*. One real-world pattern: an agent resolves an ambiguous destination name ("exec team") to the wrong channel and posts private data to a shared work space. The fix belongs in deterministic code outside the model, not in the model's judgment. This doc does not name any product or incident.

---

## Spec 1: Audience-scoped data and destination policy

### 1.1 Goal
A deterministic gate that decides, outside the model, whether a piece of data of a given class may be sent to a given destination. Extends LLX Pay's existing model (allow-list, max per payment, daily cap) from "where money may go" to "where data may go".

### 1.2 Concepts
- **Data class**: label on data at its source (e.g. `finance.personal`, `finance.company`, `credentials`, `pii`, `public`). Assigned by the connector/tool that fetched it, never by the model.
- **Destination**: a *resolved, canonical* target, not a name: `{ provider, workspaceId, channelId|chatId|address, visibility }`. Display names are never used for matching.
- **Audience**: who can read a destination: `self`, `named:<ids>`, `workspace`, `public`.
- **Taint**: output derived from classed data inherits the class (conservative: a message built from any `finance.personal` input is `finance.personal`).

### 1.3 Policy schema (JSON, versioned)
```json
{
  "version": 1,
  "defaultAction": "deny",
  "destinations": {
    "slack:T123/C456": { "label": "exec-channel", "audience": "workspace", "ownerDomain": "work" },
    "chat:abc":        { "label": "exec-group",   "audience": "named:[u1,u2]", "ownerDomain": "personal" },
    "dm:self":         { "audience": "self", "ownerDomain": "personal" }
  },
  "rules": [
    { "id": "r1", "class": "finance.personal", "allow": ["dm:self"] },
    { "id": "r2", "class": "finance.company",  "allow": ["slack:T123/C456"], "maxAudience": "workspace" },
    { "id": "r3", "class": "credentials",      "allow": [] },
    { "id": "r4", "class": "public",           "allow": ["*"] }
  ],
  "ambiguity": "deny",
  "requireApprovalAbove": { "audience": "workspace", "classes": ["pii"] },
  "limits": { "maxBytesPerSend": 4000, "maxSendsPerDay": 50 },
  "audit": { "log": "metadata-only" }
}
```
Rules: first match by class; `deny` wins over `allow`; unknown class or destination is denied; policy file is signed or hash-pinned by the owner so the agent cannot edit it.

### 1.4 Decision API
```
check({ classes: ["finance.personal"], destination: {provider, id}, bytes, nameRef? })
 -> { decision: "allow" | "deny" | "needs-approval", ruleId, reason }
```
- `nameRef`: if the agent supplied a display name instead of an ID, the resolver must find **exactly one** canonical destination across all connected providers; zero or more than one => `deny` with reason `AMBIGUOUS_DESTINATION`.
- Owner-domain separation: a `personal` data class may never go to a `work` destination (and vice versa) unless an explicit rule says so.

### 1.5 Enforcement points (all outside the model)
1. **Egress wrapper** around every send-capable tool (message, email, post, webhook, file share). The model calls the wrapper; the wrapper calls `check` and only then the real tool. No direct tool handles are exposed.
2. **Destination resolver** that canonicalizes names to IDs and reports ambiguity.
3. **Data labeling at ingestion**: connectors tag classes; the model cannot relabel.
4. **Taint propagation** in the runtime that assembles messages (fail closed if provenance is unknown).
5. **LLX Pay link**: payments use the same policy file (payee allow-list, caps); one signed policy for money and data.
6. **Approval hook**: `needs-approval` pauses and asks the owner out of band; timeout = deny.
7. **Audit log**: metadata only (time, rule, decision, class, destination ID, byte count). Never message content.

### 1.6 Examples
| Case | Input | Result |
|---|---|---|
| Right place | `finance.personal` -> `dm:self` | allow (r1) |
| Name collision | `finance.personal`, `nameRef:"exec team"` matching a chat and a channel | deny `AMBIGUOUS_DESTINATION` |
| Wrong audience | `finance.personal` -> `slack:T123/C456` | deny (not in r1) |
| Credentials | `credentials` -> anything | deny (r3) |
| Public | `public` -> any known destination | allow (r4) |
| Derived content | summary built from `finance.personal` + `public` | treated as `finance.personal` |
| Unknown class | `unlabeled` | deny (default) |
| Oversize | 50 KB to allowed dest | deny `LIMIT_BYTES` |
| PII to workspace | `pii` -> workspace audience | needs-approval |

### 1.7 Tests and fixtures (fixtures only, no real data)
- `fixtures/policy-basic.json`, `policy-ambiguous.json`, `policy-no-default.json`, `policy-tampered.json`.
- `fixtures/destinations-collision.json` (same display name in two providers).
- Unit tests: allow/deny matrix from 1.6; deny-wins; first-match; default deny; unknown destination; taint merge (max class); ambiguity (0, 1, 2+ matches); byte and daily limits; approval timeout = deny; display-name never used for matching; policy hash mismatch = refuse to run.
- Property test: no input combination yields `allow` for a class not listed in any rule.
- Egress-wrapper test: a mock tool is never called when `check` denies; no code path bypasses the wrapper.
- Log test: audit entries contain no message body (assert on a canary string).
- LLX Pay parity test: payment decisions unchanged when the data policy is added.

### 1.8 Limits (state plainly)
- Only as good as labeling: unlabeled data is denied, but wrong labels at the source pass.
- Cannot stop an authorized recipient from re-sharing, or a human pasting data elsewhere.
- Covers tools routed through the wrapper; an agent with any ungated send path defeats it.
- Taint is conservative and will block some legitimate sends (tuned via approvals).
- Does not hide data from the model or provider; it controls egress only.
- Not a guarantee or certification.

### 1.9 Rollout
Library + fixtures + demo (no real data) -> dry-run mode (log would-deny) -> enforce. Separate package, not inside frozen services. Testnet-style pilot with owner's own agent; publish limits with it.

---

## Spec 2: Paid agent leak-check endpoint (x402)

### 2.1 Goal
`GET/POST /api/leak-check` on the audit app pattern (`LiquidLogicX/liquid-logic-agent`, `apps/audit`): an agent or developer submits a **redacted description** of an agent setup and gets deterministic findings about leak risks (ambiguous destinations, shared connections, missing audience rules). Same x402 wrapper: Base USDC via CDP, verify first, run handler, settle only on status < 400.

### 2.2 Pricing
- **$0.02 USDC** per call at launch (range $0.01-$0.03). Single price, simple. Revisit after real usage.
- Charged only on 200; 400/413/429/503 are free (same as existing endpoints).
- Cost is near zero (pure computation, no RPC, no LLM in v1), so price covers abuse resistance and listing viability, not compute.

### 2.3 Input (JSON, size cap 32 KB, schema-validated)
```json
{
  "agent": { "name": "cfo-agent", "readsData": ["finance.personal"] },
  "connections": [
    { "provider": "slack",  "kind": "channel", "displayName": "exec-team", "visibility": "workspace" },
    { "provider": "chat",   "kind": "group",   "displayName": "exec-team", "visibility": "named" }
  ],
  "instructions": ["Update Exec team every Monday"],
  "policy": { "present": true, "defaultAction": "allow", "rules": [] },
  "tools": [{ "name": "send_message", "canSend": true }]
}
```
Users must submit **structure and labels, not secrets or real data**. The API docs say: never send keys, tokens, balances, or customer data; the endpoint rejects obvious secrets (see 2.6).

### 2.4 Output
```json
{
  "score": null,
  "findings": [
    { "id": "AMBIGUOUS_DESTINATION", "severity": "high",
      "evidence": ["connections[0]", "connections[1]", "instructions[0]"],
      "why": "Display name 'exec-team' matches 2 destinations; an instruction refers to it by name.",
      "fix": "Resolve to canonical IDs and deny on ambiguity." }
  ],
  "checksRun": 9, "checksPassed": 6,
  "limits": "Static review of what you submitted. Not a guarantee, certification or audit.",
  "version": "leak-check/1"
}
```
No numeric "safe" score in v1 (avoids false assurance). `score` stays null until independently validated.

### 2.5 What it checks (v1, deterministic rules, no LLM)
1. `AMBIGUOUS_DESTINATION`: same/similar display name across connections or providers.
2. `NAME_BASED_INSTRUCTION`: instructions that target a destination by name, not ID.
3. `MIXED_DOMAINS`: personal-class data reader with work-visibility send connections.
4. `NO_POLICY` / `DEFAULT_ALLOW`: no policy, or default allow.
5. `NO_AUDIENCE_RULES`: sendable tools but no class-to-destination rules.
6. `BROAD_AUDIENCE`: sensitive classes allowed to `workspace`/`public` audience.
7. `UNGATED_SEND_TOOL`: send-capable tool not marked as behind an egress gate.
8. `NO_LIMITS`: no byte/daily send limits.
9. `NO_APPROVAL_PATH`: no approval for high-audience sends of sensitive classes.
Each finding has stable ID, severity, evidence pointers into the submitted input, and a fix referencing Spec 1.

### 2.6 Privacy and abuse risks
- **Never store submitted data.** Process in memory, no request-body logging, no analytics on bodies, no caching keyed by content, no error reporters that capture bodies. Logs: timestamp, status, size, payer address (needed for payment), finding IDs only. Add a canary test proving a unique string in the body never appears in logs.
- **Secret submission**: reject (400, free, nothing echoed) inputs matching common key/token patterns or long hex strings; message tells the user to redact.
- **Payer-address metadata**: payer wallet is public on-chain anyway; do not link to input content.
- **Abuse**: payload size cap 32 KB, rate limit per payer and IP, schema depth/length limits, no regex catastrophic patterns (linear-time matching only), no outbound requests from user input (no SSRF surface).
- **Prompt-injection**: v1 has no LLM so none. If an LLM tier is added later, treat input as untrusted data and it needs a separate review.
- **False assurance**: wording is "findings", never "safe/secure"; no badge in v1.
- **Reputation/liability**: no claims about any third party product; outputs refer only to the submitted config.
- **Tampered responses**: not signed in v1; optionally sign response hash later.

### 2.7 Implementation notes (for later, not now)
- New route `apps/audit/app/api/leak-check/route.ts` using `with-x402-dual.ts` Base-only path like `/api/prove`; rules in `lib/leak-check/rules.ts`; Bazaar metadata and `output.example` in `lib/bazaar-meta.ts` style.
- No new env vars (no keys, no storage). Tests: `npm run check-leak-check` with fixtures.
- **Changing apps/audit is a deploy and needs owner approval; do not do it during the judging hold** (audit is separate from the frozen services but shares the repo/CI; confirm scope first).

### 2.8 Tests and fixtures
- Fixtures: `lc-ambiguous.json` (expects AMBIGUOUS_DESTINATION + NAME_BASED_INSTRUCTION), `lc-clean.json` (zero findings), `lc-mixed-domains.json`, `lc-no-policy.json`, `lc-secret-like.json` (expects 400), `lc-oversize.json` (413), `lc-malformed.json` (400).
- Tests: one per rule; stable finding IDs/order; determinism (same input same output); free statuses never settle; settle only on 200; size and rate limits; no body in logs (canary); secret rejection does not echo input; no outbound network calls (assert none).
- Output example in Bazaar metadata generated from a fixture, not hand typed.

### 2.9 Rollout
1. Spec review and owner OK (this PR).
2. After judging: implement rules + fixtures, local only.
3. Testnet/preview deploy with a free dry-run mode; review privacy of logs.
4. Owner approval for production deploy, one paid test call, and Agentic Market listing.
5. Observe usage 2-4 weeks; consider adding Spec 1 library as the "fix" link and a score only after independent validation.

---

## Approvals needed (nothing done yet)
Merging this PR; any implementation PR; any deploy or env change; new Render/Vercel services; paid x402 calls and listings; any public post about the topic; outreach to anyone.
