# LLX Private Send: spec addendum ("the Midnight model on Base")

**Status:** docs only, for Claude's review. Nothing here is built, deployed or merged. Nothing frozen is touched (liquid-logic-treasurer-web, arc-settlement-recorder, llx-pay and proofs stay as they are during Colosseum judging).
**Date:** Oct 17, 2026. **Home:** this file lives in `liquid-logic-x` until the `llx-private-send` repo exists (that repo hasn't been created; creating it needs Miles's direct OK). It then moves to `llx-private-send/docs/`.
**Builds on:** the LLX Private Send brief (Send Wallet = Layer 1, cLLX = Layer 2; Send Wallet mainnet first, cLLX on testnet until an outside audit is funded), `docs/cllx-confidential-balance-research.md` (PR #3) and `docs/llx-pay-privacy-options.md` (PR #1, Noir).

**Numbers marked PROPOSAL or TBD are the crew's starting points for review, not decisions.**

---

## 0. Positioning (copy for the doc and, later, the site)

> **Rational privacy on Base: pay anyone without showing them what you hold. Not a mixer.**

| Stays visible (by design) | Stays private |
|---|---|
| Sender address (your Send Wallet) and receiver address | What your main wallet holds: the receiver only sees a Send Wallet with a small balance |
| Amount and time of each USDC/LLX send in v1 | With cLLX (later): your $LLX balance itself, encrypted on-chain |
| That a Send Wallet was created and loaded | Which policy proofs you passed beyond yes/no (Noir proofs reveal only the statement) |

- **Not a mixer.** No shielded pool, no breaking of sender/receiver links, no anonymity set. Payments stay traceable as payments. This is privacy of *holdings*, not of *who paid whom*.
- **Auditor-key path for compliance.** Two layers:
  1. *User-side disclosure (v1):* the owner can export a signed statement linking their main wallet to their Send Wallet(s), with history, for an accountant, auditor or regulator. Nothing is disclosed unless the user signs it.
  2. *cLLX auditor view (with cLLX):* an auditor key can be given read access to cLLX balances. It is rotatable, its address is published, and every grant is an on-chain event. **Decision for Miles:** opt-in per user (recommended default), or a single protocol-wide auditor like Avalanche eERC's (only if counsel says it's required). Either way the docs say plainly that the path exists.
- **Honest limits to carry into copy:** loading a Send Wallet straight from your main wallet is a public transfer that links the two (use "Fund from exchange" or, later, the cLLX top-up). The Send Wallet's owner must not be your main wallet in plain sight (see §6.1).

## 1. DUST-style send allowance: "hold $LLX, earn free private sends"

Midnight's model: holding NIGHT generates DUST, a non-transferable resource that pays for transactions and recharges over about a week. Our version on Base has no new token and no new chain.

### 1.1 Mechanics

- **What it is:** an internal counter, `sendCredits[sendWallet]`, in the Send Wallet factory/policy contract (working name `SendAllowance`). **Not a token:** no `transfer`, no approval, nothing to sell, nothing on Basescan's token list.
- **What earns it:** $LLX held over time, measured as a **time-weighted average balance (TWAB)** over each weekly epoch, not a snapshot. cLLX counts too once cLLX exists (see §1.6).
- **Regenerates weekly:** credits for epoch *e+1* are computed from TWAB in epoch *e*. Unused credits expire at the end of the epoch (PROPOSAL: no rollover, like a battery that refills to full but not past it).
- **Spending:** each Private Send uses 1 credit. When credits hit 0, the user pays the normal fee in USDC, or in LLX at the discount ratio (PROPOSAL: same ratio X-Lock uses, 7 USDC-equivalent in LLX vs 10 USDC, i.e. 30% off).
- **Gas:** always sponsored by the ERC-4337 paymaster, funded from the fee pool. A free send costs the pool only gas; a paid send pays its fee into the pool.
- **Policy caps still apply** (per-send and daily caps). Credits never bypass them.

### 1.2 Where the balance history comes from (checked Oct 17)

$LLX (`0xB9Dd…380f`, Base) has **no on-chain balance history**: `clock()`, `CLOCK_MODE()`, `numCheckpoints()` and `getVotes()` all revert on a Base mainnet `eth_call`. So a contract can't read "balance over the last week" directly. Options:

| Option | How | Custody | Trust | Recommendation |
|---|---|---|---|---|
| **A. Weekly Merkle root (v1)** | An open-source indexer computes each wallet's TWAB to the second from public LLX `Transfer` logs, then publishes a Merkle root of `(holder, epoch, credits)` to `SendAllowance`. The holder claims with a proof. | None: LLX never leaves the holder's wallet | The root poster (Miles's key or a multisig, never a crew key). Anyone can recompute the root from public logs. PROPOSAL: 24 h challenge window before a root goes live | **Recommended for M1.** Same claim path serves the launch drop (§3) |
| B. Hold-deposit contract | Holder deposits LLX into a non-custodial contract that updates a TWAB accumulator on every deposit and withdrawal (PoolTogether-style) | Contract holds LLX | Code only, but it makes the Send Wallet stack custodial for LLX, which brings back the paid-audit requirement M1 avoids | Later, maybe merged with the cLLX vault |
| C. Snapshot balance | Read `balanceOf` at claim time | None | n/a | **Rejected:** farmable (see §1.4, row 6) |

### 1.3 Allowance model (PROPOSAL, all numbers TBD)

```
epoch            = 7 days, starting Monday 00:00 UTC
TWAB_e(w)        = (1 / epochLength) × ∫ balance_w(t) dt over epoch e        (LLX, to the second)
eligible(w)      = TWAB_e(w) ≥ MIN
credits_{e+1}(w) = eligible ? floor( TWAB_e(w) / S ) : 0
if Σ credits > G: credits_{e+1}(w) = floor( G × TWAB_e(w) / Σ TWAB_e(eligible) )   (pro-rata when the weekly budget binds)
```

| Parameter | PROPOSAL | Why |
|---|---|---|
| `S`: LLX per weekly free send | **250,000 LLX** | Price-independent unit set in LLX, like X-Lock's LLX fee. At GeckoTerminal's Oct 17 price (≈ $0.0000092/LLX, about $24 of pool liquidity, so a thin and unreliable price) that's about $2.30 of LLX per weekly free send |
| `MIN`: minimum TWAB to earn | **250,000 LLX** (= 1 × S) | No free base allowance per wallet, so splitting dust across wallets earns nothing |
| `G`: global free sends per week | **1,000** at launch | Caps paymaster exposure. At an assumed ≤ $0.01 gas per sponsored send on Base (est.; PR #1 read 0.006 gwei on Oct 16) that's ≤ about $10/week of pool gas |
| Per-wallet cap | **None** (optional knob) | A per-wallet cap gives whales a reason to split. Pro-rata under `G` already bounds the total. If Miles wants a cap anyway, say 20/week, the doc should note that it brings back the split incentive |
| Normal fee when credits = 0 | **$0.10 USDC per send**, or LLX at 30% off | Placeholder until Private Send pricing is set |
| Rollover | **None** | Regenerates weekly, so idle credit can't be stockpiled |
| Excluded from earning | LP pools, the cLLX vault, X-Lock/X-Escrow factories, known CEX and bridge addresses | Contracts and custodians can't earn on users' behalf. Whether treasury and team wallets earn: **TBD, Miles to decide** |
| X-Lock bonus (option) | LLX locked in X-Lock counts 1.5× toward TWAB | Rewards locking. The indexer can attribute lock-wallet balances to owners from factory events. TBD |

**Why not "X sends per 1,000 LLX"?** At today's price 1,000 LLX is under one cent. If 10% of supply (100M LLX) qualified, 1 send per 1,000 LLX would be 100,000 free sends a week. Weekly sends if a given share of the 1B supply qualifies (before `G`):

| `S` (LLX per free send) | 10% qualifies | 25% | 50% |
|---|---|---|---|
| 1,000 | 100,000 | 250,000 | 500,000 |
| 100,000 | 1,000 | 2,500 | 5,000 |
| **250,000 (proposal)** | **400** | **1,000** | **2,000** |
| 1,000,000 | 100 | 250 | 500 |

**Example wallets** (S = MIN = 250,000; `G` not binding):

| TWAB over the week | Free sends next week |
|---|---|
| 100,000 LLX | 0 (below MIN) |
| 250,000 | 1 |
| 900,000 | 3 |
| 2,500,000 | 10 |
| 5,000,000 | 20 |
| 50,000,000 | 200 (no cap; still subject to `G` and the policy caps) |

### 1.4 Farming analysis: moving one bag between wallets doesn't multiply allowance

The key property: **at every instant a bag sits in exactly one wallet, so TWAB adds up.** For any set of wallets, Σ TWAB = the TWAB of the total held, so Σ floor(TWAB/S) ≤ floor(Σ TWAB / S). Moving can only lose credits to rounding and to `MIN`, never gain.

Bag of **1,250,000 LLX** (= 5 × S) over one epoch:

| # | Strategy | TWAB per wallet | Credits | Total |
|---|---|---|---|---|
| 1 | Hold in wallet A all week | A: 1,250,000 | 5 | **5** |
| 2 | Move A→B at mid-week | 625,000 each | 2 + 2 | **4** (loses to rounding) |
| 3 | Rotate through 5 wallets, 1.4 days each | 250,000 each | 1 × 5 | **5** (no gain) |
| 4 | Rotate through 10 wallets, 0.7 days each | 125,000 each | 0 (below MIN) | **0** |
| 5 | Flash-loan 100M LLX into one wallet for one 2 s block | 100M × 2 / 604,800 ≈ 331 | 0 | **0** |
| 6 | *Snapshot model (what we avoid):* show the bag to 5 wallets in 5 consecutive blocks at claim time | n/a | 5 each | **25** |

- **Splitting a large bag** (e.g. 50M into ten 5M wallets): 10 × 20 = 200, the same as one wallet. With no per-wallet cap there's nothing to gain.
- **Many tiny wallets:** below `MIN` they earn 0, and there's no free base allowance per wallet.
- **Buy, earn, sell:** credits for week *e+1* need a full week of holding in *e*. Selling mid-epoch cuts TWAB proportionally, and credits can't be resold.
- **Residual risk:** a holder who really does keep LLX all week earns exactly their share. That's the intended behaviour, not farming.

### 1.5 Contract surface (M1, testnet first)

- `SendAllowance` (inside or beside the Send Wallet policy contract):
  - `postRoot(epoch, root)`: poster role only. Goes live after the challenge window. A root can't be replaced once it's live.
  - `claim(epoch, holder, credits, proof, sendWallet, holderSig)`: the holder binds that epoch's credits to one Send Wallet. One claim per holder per epoch.
  - `consume(sendWallet)`: called only by the policy/paymaster on a sponsored send. Decrements by 1, or returns false so the fee path runs.
  - Events: `RootPosted`, `CreditsClaimed`, `CreditUsed`. No balances or holdings are emitted beyond what the claim already reveals.
- **Paymaster rule:** sponsor the UserOp if `consume()` succeeds. Otherwise require the fee transfer (USDC, or LLX at the discount) in the same UserOp, and sponsor gas from the pool.
- **Privacy note:** a v1 claim **links the holder address to the Send Wallet** on-chain. Users who care should claim from a wallet they don't mind linking. **Later (v2):** a Noir claim that proves "I own a leaf `(holder, credits)` in this epoch's root" with an epoch nullifier, without revealing which holder. That's the Midnight pattern (shielded proof that earns a resource), built from the same Merkle and Poseidon pieces as PR #1.

### 1.6 cLLX and the allowance

cLLX balances are encrypted, so the indexer can't compute TWAB from cLLX transfers. Until a cLLX-native method exists, cLLX holders earn on their LLX before wrapping and get **no credit for cLLX** (TBD). Candidate later method: the holder proves "my cLLX balance was ≥ X at each of N checkpoints" (FHE `ge` grant per the M2 threshold-proof pattern, or a Noir proof on the backend chosen in PR #3). Not in v1.

## 2. Selective disclosure menu (Noir + UltraHonk, per PR #1)

| Proof | Statement (what the verifier learns) | Ships |
|---|---|---|
| **Under-budget** | "This payment keeps the payer under their per-payment/daily cap", without revealing the cap or headroom (`spent + amount ≤ cap` over Poseidon commitments; measured 3,046 gates, 0.08 s to prove, about 2.2M gas to verify on-chain or 0.006 s free off-chain, PR #1) | **v1** |
| **Proof of funds** | "Payer's committed balance ≥ price", without revealing the balance | **v1**, with an honest scope: it's meaningful against a committed or encrypted balance (cLLX testnet vault, LLX Pay commitments). A Send Wallet's plain balance is public anyway, so on mainnet before cLLX this mainly helps agent-to-service flows |
| **Third-party attestation hook** | "An approved issuer attests a fact about me (age over 18, KYC passed, jurisdiction)", without revealing identity details | **Later.** v1 ships only the interface: `IAttestationVerifier.verify(subject, schemaId, proof) → bool`, with a registry of allowed issuers and schemas. Candidate sources to evaluate: EAS attestations on Base (e.g. Coinbase Verifications) and zk passport-style proofs. None is integrated or endorsed yet |
| Locked ≥ N months (X-Lock), escrow milestone, settlement batch | As in PR #1's reuse table | Later; settlement proofs wait for judging to end |

## 3. Launch distribution: Glacier-Drop-style claim (credits, not tokens)

Midnight's Glacier Drop let holders of other chains' tokens claim NIGHT. Ours gives **allowance credits only, no LLX tokens**, so there's no sell pressure and the counter stays non-transferable.

- **Who (PROPOSAL, candidates only):** holders of **3–5 Base-native tokens**. Candidate shortlist to evaluate: AERO, DEGEN, BRETT, TOSHI, with VIRTUAL as an affinity pick ($LLX is a Virtuals agent token; check whether VIRTUAL counts as "Base-native", since it didn't start on Base) and HIGHER or CLANKER as alternates. **No holder counts or distribution data have been checked.** Crew will run read-only counts before any sizing.
- **Selection criteria (PROPOSAL):** launched on Base, ≥ 6 months old, real DEX liquidity, community overlap with payments/agents/privacy, no association with sanctioned services.
- **Eligibility (PROPOSAL):** a 30-day TWAB ≥ a USD-equivalent floor (e.g. $20) of any listed token, ending at a **past snapshot block chosen before the announcement** so it can't be farmed after the fact. Same exclusions as §1.3 (contracts, LPs, CEX/bridge addresses).
- **Claim:** one Merkle claim per address via the §1.5 path. Credits go to the claimer's Send Wallet, so the drop also onboards users. PROPOSAL: K = 3 free sends per eligible address, expiring 90 days after claim, with a claim window of 60–90 days.
- **Sizing: TBD.** Total budget = (eligible addresses × K × expected claim rate) × gas per send, capped by a fixed credit pool set by Miles. Drop credits draw on a separate budget from the weekly `G`.

## 4. Midnight as a later deployment target (not a priority)

Midnight is live (genesis March 2026; permissionless contract deployment on mainnet since Sep 28, 2026 per Midnight's September update). Contracts are written in Compact, a TypeScript-based language that handles public and private state in one contract, and fees use the NIGHT/DUST model this spec borrows. A cLLX deployment there would be a separate build: a Compact contract, a bridge or representation of LLX from Base, Midnight wallets, and Ledger 8 vs 9 toolchain churn (Compact 0.31.x for today's mainnet, 0.35 targets an undeployed ledger). That's worth a feasibility note after cLLX on Base is audited. **It is not on the current roadmap and gets no crew time now.**

## 5. Updated milestone plan (durations are estimates; dates start when Miles OKs the `llx-private-send` repo)

| Milestone | Scope | Gate | Est. |
|---|---|---|---|
| **M0** (now) | This spec + PR #3 research. Claude review | Claude review; docs merge on Miles's OK | days |
| **M1** Send Wallet on Base Sepolia | 4337 account factory, policy (per-send/daily caps), paymaster from fee pool, Load/Send UI, Fund-from-exchange path, USDC + LLX, fee in USDC or LLX at the discount. **New in M1:** `SendAllowance` counter, root posting with a challenge window, claim and consume paths, indexer script (TWAB from mock-LLX logs on testnet), §6.1 owner-unlinkability | Fuzz + invariants on caps and credits (credits never go negative, never transferable, one claim per holder per epoch) | 3–4 weeks |
| **M1a** Selective disclosure v1 | Noir under-budget + proof-of-funds circuits and verifier on testnet. `IAttestationVerifier` interface stub only | Claude review | +1–2 weeks, parallel |
| **M1-main** Send Wallet on Base mainnet | Caps-first (per-send and daily caps), allowance live with conservative `S`/`G`, TWAB indexer on real LLX logs. **Launch claim** (§3) opens at launch | Claude security review, then Miles's "deploy", fresh single-use deployer, crew never holds keys | days after review |
| **M2** cLLX + vault on testnet | Per PR #3 (Zama ERC-7984 target, backend behind an interface), differential invariant (cLLX supply == LLX in vault). Public status: "cLLX on testnet, audit in progress" | Claude review + crew formal tests | 2–3 weeks + 1 week |
| **M3** Vault → Send Wallet top-up | Removes the funding link. The UI shows the cLLX top-up as "coming" from M1 | Claude review | 1–2 weeks |
| **M4** Audit scope and pricing | Vault + cLLX + top-up + `SendAllowance`. Code4rena/Sherlock contest vs boutique firm, ranges posted to the bridge | Miles funds the audit | n/a |
| **M5** cLLX mainnet | Caps-first (per-wallet wrap cap). cLLX starts counting toward allowance (§1.6) | Audit fixes, then Miles's "deploy" | days after audit |
| **Later** | v2 unlinkable ZK claim (§1.5); attestation issuers (age/KYC); cLLX auditor view (§0); Midnight feasibility note (§4) | Each on Miles's OK | n/a |

## 6. Design notes and open questions for Claude

1. **Owner unlinkability (applies to M1 as a whole):** a 4337 account's owner is readable on-chain (storage and creation calldata). If the owner is the user's main wallet, a receiver can look it up and see the holdings Private Send is meant to hide. Proposal: the owner is a passkey (P-256; Base supports the RIP-7212 precompile) or an app-side signer derived from a main-wallet signature, so the main wallet address is never stored. Recovery path TBD.
2. Root poster key: Miles's wallet or a 2-of-3 multisig? Never a crew key.
3. `S`, `MIN`, `G`, fee, X-Lock bonus, and treasury/team eligibility: Miles to set. The table above is a starting point.
4. Does the allowance credit the Send Wallet (as proposed) or the owner, so it's shared across several Send Wallets?
5. Auditor path: opt-in per user vs protocol-wide (§0).
6. Launch-drop token list and credit pool size, after read-only holder counts.

## 7. Boundaries

Docs only. No contracts, deploys, env or secret changes. The `llx-private-send` repo hasn't been created and won't be until Miles OKs it. Nothing frozen during Colosseum judging is touched. Claude reviews before any merge. Mainnet only on Miles's "deploy", with a fresh single-use deployer, and the crew never holds keys.
