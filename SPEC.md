# SPEC.md — Liquid Logic X

## What we are proving

One thing only: **an onchain token balance can be encrypted, and its holder can grant a
specific address permission to read it.**

If that works, there is a product here. If it doesn't, we stop. This spec exists to answer
that question in days, not months.

## Non-goals

Do not build these. If a task seems to require one, stop and report.

- No real assets. No mainnet. Testnet only.
- No custody of anyone's funds.
- No bridge, no cross-chain messaging.
- **No custom cryptography.** Use an audited library. If you find yourself implementing a
  scheme rather than calling one, stop.
- No UI beyond what is needed to demonstrate the two states.
- No token, no launch, no marketing surface.

## Milestone 0 — Feasibility check (do this first, report before coding)

Before writing any contract, confirm the tooling actually exists and works today.

Deliverable: a short written report in a PR, answering:

1. Where is Zama's fhEVM (or an equivalent audited FHE/zk confidential-token library)
   actually deployed and usable right now? Name the chain, RPC endpoint, faucet, and SDK
   version.
2. Can a fresh Hardhat project compile and deploy their example encrypted ERC-20 to that
   network? Yes or no, with the command output.
3. What does it cost in testnet gas, and is the faucet sufficient?

**Note on chain choice:** FHE contracts need the coprocessor deployed on the target chain.
That almost certainly means building on whatever network the library supports, **not**
Robinhood Chain. Do not attempt to deploy FHE contracts to an arbitrary Arbitrum Orbit
chain. If Milestone 0 shows no public testnet supports this, say so and stop — that is a
valid and useful result.

## Milestone 1 — Confidential balance

An encrypted ERC-20 with `mint`, `transfer`, and an encrypted balance.

**Acceptance:** deploy to testnet, mint to an address, and show that the block explorer
displays no readable balance for that address. Screenshot in the PR.

## Milestone 2 — Viewing key

The holder can grant a chosen address permission to decrypt their balance.

**Acceptance:** address X, granted permission, reads the balance successfully. Address Y,
not granted, cannot. Both cases covered by a passing test.

## Milestone 3 — Minimal demo page

A single static page: connect wallet, show your own balance decrypted, show another
address's balance as ciphertext. Plain HTML is fine.

Deploy to the Vercel project. Password protection stays on.

## Working rules

- Branch and PR for everything. **Never push to main.**
- One PR per milestone. Small and reviewable.
- Every contract needs tests. A milestone without passing tests is not done.
- **Report blockers instead of working around them.** If a library doesn't do what this
  spec assumes, that is information, not an obstacle to route around.
- No secrets in the repo. No API keys, no private keys, no `.env` committed.
- Testnet keys only. Never a key that has touched real funds.

## Open questions for the human

Do not decide these yourself:

- Which chain this ultimately targets.
- Whether this becomes a product or stays a demo.
- Anything touching real assets, securities, or regulated instruments.
