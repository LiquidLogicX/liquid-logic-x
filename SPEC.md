# Liquid Logic X — Specification

**Status:** Draft v0.1 · September 10, 2026
**Repo:** `LiquidLogicX/liquid-logic-x`
**Stack:** Solidity + Zama fhEVM · Ethereum Sepolia (11155111) · Zama Gateway Testnet (10901)

---

## 1. What this is

A confidential treasury layer for AI agent fleets.

A principal (a person or company running agents) funds each agent with an **encrypted
spending allowance**. Agents pay for services from that allowance. The contract enforces
the limit on-chain, but the allowance, the balance, and every payment amount stay
encrypted. Nobody — including the service the agent is paying — can read them.

The principal holds a view key and can audit everything at any time. Allowances can be
revoked instantly.

---

## 2. The problem

Autonomous agents are the first user class that is natively on-chain. They already hold
wallets, already pay per-call for services, and already settle without a human in the
loop. They are also completely exposed.

A public chain publishes an agent's entire operating picture:

| Leaked | Consequence |
|---|---|
| Wallet balance | Counterparties can price against a visible budget |
| Every payment amount | Service rates and negotiated discounts become public |
| Payment frequency | Burn rate and scaling plans are readable |
| Counterparty addresses | The fleet's vendor stack and dependencies are mapped |

For a single hobby agent this is harmless. For a company running a fleet it is a
continuous disclosure of budget, strategy and supplier relationships to competitors.

### Why encryption specifically

The important property is not secrecy for its own sake. It is this:

> **A spending cap can be enforced without revealing the cap.**

Today a principal has two options, and both are bad. Publish the budget on-chain and
enforce it trustlessly but publicly. Or enforce it off-chain in a custodial service and
lose the on-chain guarantee entirely. FHE is what collapses that trade-off — the
contract computes on the encrypted allowance and rejects an overspend without ever
decrypting it.

That is the whole reason this project exists. Any feature that does not depend on that
property does not belong here.

---

## 3. Who it is for

**Primary:** operators running more than one agent with a real budget — agent fleet
companies, trading-agent operators, automated research and data pipelines.

**Secondary:** service providers selling to agents, who would rather not publish their
per-customer pricing on a public ledger.

**Not the user:** individual hobbyist agents with trivial balances. There is nothing
worth hiding and the FHE overhead is not worth paying.

---

## 4. Scope

### In scope

- Encrypted per-agent allowances issued by a principal
- Spend against an allowance with on-chain cap enforcement, amounts encrypted
- View-key grants so the principal (and any auditor they nominate) can decrypt
- Instant revocation of an allowance
- Top-up of an existing allowance without revealing the new total

### Explicitly out of scope (v1)

- **Per-query micropayments.** Each encrypted input costs a proof and Gateway
  round-trips add latency. Sub-cent per-call payments are the wrong shape for FHE. Those
  net off-chain and settle here in batches.
- **Bridging.** No cross-chain movement. Sepolia only.
- **A token.** Funding the project is a separate decision from the protocol design and
  must not distort it.
- **Mainnet.** See §8 on licensing.

---

## 5. Architecture

```
Principal (human / company)
    │  funds + sets encrypted allowance
    ▼
ConfidentialTreasury ──── grants view key ────► Auditor
    │
    │  encrypted allowance per agent
    ▼
Agent A     Agent B     Agent C
    │
    │  spend(recipient, encryptedAmount)
    ▼
Service provider  ◄── receives value, cannot read the payer's balance
```

### Built on

Milestone 1 already merged the two primitives this needs:

- **Encrypted balance** (`euint` confidential token, ERC7984-shaped)
- **ACL** — an address with no grant cannot read a balance. Tested: 4/4 passing,
  including the deny case.

Deployed and Sourcify-verified on Sepolia at
`0x0b576f4bBd7862279a0bE1982eE71f910eBDB3ac`.


### Threshold disclosure (Milestone 2 framing)

Selective disclosure is not “give the verifier the balance.” An agent proves an encrypted
balance **clears a threshold** without revealing the balance: `FHE.ge(balance, threshold)`
yields an `ebool`, and `FHE.allow` grants the verifier ACL on that comparison result only.
Acceptance: verifier decrypts the `ebool` (learns whether `balance >= threshold`) and
**cannot** decrypt the balance handle. Audited fhEVM ops only — no custom cryptography.

### Core interface (crew brief — see `docs/crew-allowance.md`)

```solidity
function setAllowance(address agent, externalEuint64 amount, bytes calldata proof) external;
function topUp(address agent, externalEuint64 amount, bytes calldata proof) external;
function revoke(address agent) external;

function spend(address to, externalEuint64 amount, bytes calldata proof) external;

function grantView(address auditor, address agent) external;
function allowanceOf(address agent) external view returns (euint64);
```

Hard requirements for implementers:

- **`setAllowance`:** cap is an `euint`; ACL to the **principal only** — never the agent.
- **`spend`:** fail **closed and silent** — no revert on overspend, no outcome-differentiated
  events, no intentional gas / control-flow oracle an agent can use to learn the cap.
- **`revoke`:** immediate, single tx.
- **`grantView`:** principal delegates read on the **balance**, not the **cap**.
- **Test that matters:** an agent trying to binary-search its own cap by spending must be
  unable to distinguish success from failure.

---

## 6. The USDC problem

x402 and the existing agent payment rails settle in USDC. A confidential token does not
interoperate with plaintext USDC. This is a real gap and it needs an answer in the
design, not a discovery later.

**v1 answer:** wrap at the edges. A principal deposits a plaintext asset, receives
confidential balance inside the treasury, and unwraps on exit. Confidentiality holds
for everything that happens *inside* — which is where the allowance logic, the spending
and the counterparty relationships live. The deposit and withdrawal are visible.

That leaks the fleet's total budget at funding time while hiding its allocation and
spending. An honest partial win. Full end-to-end confidentiality would require the
service providers to accept the confidential asset directly, which is a chicken-and-egg
problem not worth fighting in v1.

---

## 7. Milestones

| # | Deliverable | Status |
|---|---|---|
| 0 | Feasibility — Zama fhEVM on Sepolia | ✅ Done |
| 1 | Confidential balance + ACL, 4/4 tests | ✅ Merged (PR #2) |
| 2 | Sepolia deploy + Sourcify (+ later Etherscan) | ✅ Done |
| 2b | Threshold viewing key — decrypt `ebool`, not the balance | ✅ Merged (PR #4) + Sepolia M2 |
| 3 | Threshold demo UI at `/demo` (GitHub Pages) | ✅ Merged (PR #7 / #8) |
| 4 | `setAllowance` / silent `spend` / `revoke` / balance-only `grantView` + binary-search test | Next — `docs/crew-allowance.md` |
| 5 | Wrap / unwrap at the plaintext boundary | |
| 6 | Reference agent — pays from an allowance end to end | |

Milestone 6 is the one that proves the thesis. Everything before it is plumbing.

---

## 8. Constraints and open questions

**Licensing.** Zama's libraries are BSD-3-Clause-Clear — free for development,
research, prototyping and experimentation only. Any commercial use requires a patent
licence from Zama (hello@zama.ai). This must be resolved before any revenue product or
mainnet deployment. It is not a blocker for remaining testnet milestones.

**Cost.** 1 $ZAMA per encrypted input proof, 75/day from the testnet faucet. Enough for
development; a constraint on test suite size.

**Open — how are allowances denominated?** A stable unit is required for a spending cap
to mean anything, which points back to §6.

**Open — multi-principal.** Can one agent hold allowances from several principals? It
is a natural fit for agents working for more than one client, and it complicates the
ACL model considerably. Deferred past v1.

**Open — key management.** If the principal loses their view key, the audit trail is
unreadable. Recovery design is undecided.

---

## 9. Non-goals

This project is not a general privacy chain, not a mixer, and not a compliance-evasion
tool. Every balance in the system is readable by the principal who funded it and by any
auditor they nominate. Confidentiality here is directional — hidden from competitors
and counterparties, transparent to the owner.
