# LLX Pay privacy options: ZK vs Oasis Sapphire vs Zama

**Date:** 2026-10-16 · **Status:** research only. Nothing in this doc is built or deployed.
**Property in question:** *an agent is under its spend cap, and nobody learns the cap or the balance.*

**Why:** the Zama commercial-licence ticket (5115) has had no reply since Sep 18, and SPEC §8 says mainnet needs that licence. M1/M2 on Sepolia (`ConfidentialToken`, `FHE.ge` threshold proof) stay as they are. This doc looks for a path that doesn't depend on Zama.

## Recommendation

**Build on Noir + UltraHonk (Barretenberg).** The licences are permissive: the Noir compiler is Apache-2.0/MIT and the generated Solidity verifier is Apache-2.0. One universal setup covers every circuit, so we don't need a new trusted-setup ceremony for each of the five products below. Proving is fast on any server (0.08 s measured, below). An on-chain verify costs about 2.2M gas, which on Base today works out to roughly 0.00001 ETH.

Keep **Circom/Groth16** as the fallback if gas ever matters (≈10× cheaper to verify). It costs a per-circuit ceremony and brings GPL-3.0 tooling. **Skip the zkVMs** for this job. **Keep Zama (C)** as the "full confidentiality" track if the licence comes through. **Don't port to Sapphire (B)** unless we decide we're willing to trust a TEE.

**Honest scope (same spirit as SPEC §6):** ZK hides the **cap and the remaining headroom**. It doesn't hide USDC transfer amounts or payees, which stay public on Base. Hiding those would take a shielded pool, and llx-pay hard rule 3 rules that out ("No privacy toggles, mixers, or swaps"). FHE (C) is still the only option here that keeps the amounts themselves encrypted on-chain.

## Comparison

**Measured** = run on the shared LLX box (Intel Xeon, 8 vCPU, 15 GB) on 2026-10-16 using the same sketch circuit on both stacks. The circuit takes a hidden cap and a hidden spent-so-far, each behind a Poseidon commitment, plus a public amount. It proves `spent + amount <= cap` and outputs the new spent commitment. Versions: nargo 1.0.0-beta.25 + bb 5.2.0 (3,046 gates), circom 2.2.3 + snarkjs 0.7.6 (987 non-linear + 830 linear constraints), forge 1.8.3. Gas is the `verify` call's execution gas under forge and excludes calldata/L1 data fees.

| Option | Verifier on Base | Gas per verify | Proving time (small server) | Licence (primary source) | Rough effort to testnet demo |
|---|---|---|---|---|---|
| **A1 Noir / UltraHonk** | `bb write_solidity_verifier` → our own `HonkVerifier` ([guide](https://barretenberg.aztec.network/docs/how_to_guides/how-to-solidity-verifier/)). 18,175 B runtime, under EIP-170 | **2,203,613 measured**. Proof is 7,232 B. Others report 1.86–2.06M ([Semaphore-Noir](https://hashcloak.github.io/semaphore-noir-final-report/benchmarks.html)) and 2.45–2.57M ([noir-rlwe](https://github.com/aryaethn/noir-rlwe-gadgets/blob/main/BENCHMARKS.md)), nearly flat as circuits grow | **0.08 s** measured (0.31 s on 1 core), 24 MiB RAM. Off-chain verify 0.006 s | [Noir](https://github.com/noir-lang/noir): Apache-2.0 + MIT. [Barretenberg](https://github.com/AztecProtocol/aztec-packages/blob/next/barretenberg/LICENSE): Apache-2.0. Generated verifier SPDX: Apache-2.0. [noir-lang/poseidon](https://github.com/noir-lang/poseidon): Apache-2.0 | ~2–3 weeks *(estimate)* |
| **A2 Circom / snarkjs (Groth16)** | `snarkjs zkey export solidityverifier` (1,636 B) | **208,946 measured** (4 public inputs). Matches the published ~207.7k + 7.16k per input ([Horizen Labs](https://horizenlabs.io/blog/zk-analysis-the-true-cost-of-zk-verification), [EIP-1108](https://eips.ethereum.org/EIPS/eip-1108) pairing prices). snarkjs PLONK verifiers run ~300k+ ([7BlockLabs](https://www.7blocklabs.com/blog/how-hard-is-it-to-build-a-verifier-that-accepts-both-groth16-and-plonk-proofs-on-ethereum), secondary) | **0.56 s** measured (snarkjs in Node). Witness 0.12 s | [circom](https://github.com/iden3/circom) and [snarkjs](https://github.com/iden3/snarkjs): **GPL-3.0**. [circomlib](https://github.com/iden3/circomlib): LGPL-3.0 on GitHub, GPL-3.0 in its npm `package.json`. Generated verifier header: GPL-3.0. Groth16 also needs a **per-circuit phase-2 ceremony** | ~2–3 weeks plus a ceremony per circuit *(estimate)* |
| **A3 RISC Zero** | Shared `RiscZeroVerifierRouter` already on Base, `0x0b14…b711` ([docs](https://dev.risczero.com/api/blockchain-integration/contracts/verifier)) | ~200–300k (Groth16 wrap). Third-party figure ([eco.com](https://eco.com/support/en/articles/11803106-what-is-risc-zero-zkvm-verifiable-computation)), not measured | Not measured. Local Groth16 is **x86-only** ([docs](https://dev.risczero.com/api/generating-proofs/local-proving)). Remote proving (Boundless) means "whoever is generating the proofs can see all private information", including the cap | [risc0](https://github.com/risc0/risc0): Apache-2.0 + MIT | ~3 weeks plus a proving box *(estimate)* |
| **A4 SP1** | Shared SP1 verifier gateways, Base listed ([docs](https://docs.succinct.xyz/docs/sp1/verification/contract-addresses)) | ~270k Groth16 / ~300k PLONK ([docs](https://docs.succinct.xyz/docs/sp1/generating-proofs/proof-types)) | Not measured. Local Groth16 wrap needs **16 GB+ RAM, 16+ cores** (PLONK 64 GB+) ([docs](https://docs.succinct.xyz/docs/sp1/getting-started/hardware-requirements)). The prover network sees the witness | [sp1](https://github.com/succinctlabs/sp1): Apache-2.0 + MIT. [sp1-contracts](https://github.com/succinctlabs/sp1-contracts) SPDX: MIT | ~3 weeks plus a proving box *(estimate)* |
| **B Oasis Sapphire** | None on Base. Logic runs on Sapphire. Results reach Base over [OPL / Hyperlane](https://docs.oasis.io/build/opl/hyperlane/) (relayer + ISM) | Normal EVM gas on Sapphire. No proof to verify | n/a | [sapphire-paratime](https://github.com/oasisprotocol/sapphire-paratime): Apache-2.0. No commercial licence needed | Port ~1–2 weeks, plus Base messaging ~1–2 weeks *(estimate)* |
| **C Zama (as today)** | n/a. Zama mainnet hosts are Ethereum, Polygon, BSC, HyperEVM and Solana. **Base is not listed** ([chains](https://docs.zama.org/protocol/protocol-apps/chains), checked 2026-10-16) | M1 deploy used 2.40M gas, M2 2.48M (`docs/deployments.md`). FHE ops also pay $ZAMA fees (testnet: 1 per input proof, 0.1 per decrypt, `docs/milestone-0-feasibility.md`) | Gateway / relayer round-trips | [fhevm](https://github.com/zama-ai/fhevm/blob/main/LICENSE): BSD-3-Clause-Clear, "NO EXPRESS OR IMPLIED LICENSES TO ANY PARTY'S PATENT RIGHTS". Needs the commercial licence | M4 brief (`docs/crew-allowance.md`) is ready to start. Blocked on the licence for mainnet |

Base cost check *(estimate)*: on 2026-10-16 at 19:27 PT, `cast gas-price` on `mainnet.base.org` read 0.006 gwei. At that price, 2.2M gas is about 0.000013 ETH and 209k gas is about 0.0000013 ETH, before the L1 data fee. One published Base Noir verify cost 0.0000096 ETH ([saleel/noir-solidity-example](https://github.com/saleel/noir-solidity-example/)).

### What each option means for M1/M2

- **A (ZK):** the property flips from "the contract computes on ciphertext" to "the **treasurer** (the principal's service) holds the cap and proves compliance". The agent never sees the cap; only the treasurer does, because the prover has to know its inputs. On-chain, a small `SpendGuard` vault stores `capCommit` and `spentCommit`. It releases USDC only when the proof verifies against those commitments, so enforcement stays on-chain. M2's `proveThreshold` maps to the same circuit with `>=` (see reuse item 4). One catch: the "agent can't binary-search its cap" test (crew brief §6) becomes a **treasurer API** property (uniform responses, rate limits), not a contract property.
- **B (Sapphire):** M1/M2 port almost line for line. `euint64` becomes plain `uint64`, since contract state is encrypted by default ([concepts](https://docs.oasis.io/build/sapphire/develop/concept)). `FHE.ge` becomes `>=`. ACL `FHE.allow` becomes `msg.sender` checks on **signed** view calls (unsigned calls zero `msg.sender`). The silent `spend` uses `Sapphire.padGas` to even out gas between branches ([security](https://docs.oasis.io/build/sapphire/develop/security.md)). Trust assumptions:
  - Confidentiality rests on Intel SGX enclaves and a key-manager committee limited to trusted operators ([Oasis](https://oasis.net/blog/how-oasis-protects-privacy-despite-tee-vulnerabilities)).
  - Storage access patterns, value sizes and events are **not** hidden by default.
  - Bridging the result to Base adds Hyperlane relayer/ISM trust.
  - Agents need ROSE for gas.
- **C (Zama):** nothing changes. The licence, plus Base not being a Zama host chain, are the blockers.

## How it plugs into the plain LLX Pay policy SDK

The policy stays as it is today: `TreasurerPolicy` (allowlist, `maxPerPaymentUsdc`, `dailyCapUsdc`, UTC-day window) in liquid-logic-agent `packages/shared/src/policy.ts`, and `evaluateTempoPayment` → `allow | hold | refuse` on the Tempo rail. Each option changes only where the cap lives and what gets published:

- **A:** the evaluator keeps running privately in the treasurer. On `allow`, it calls `proveSpend({cap, spentToday, amount, salts, day})` with NoirJS/bb.js (TypeScript, same process), then sends `(amount, newSpentCommit, proof)` to `SpendGuard` or attaches the proof to the receipt. Public `policy.json` and `AllowanceReport` drop `dailyCapUsdc`, `capUsdc` and `remainingUsdc` and publish `capCommit` instead, which is the leak this whole exercise is meant to close. Allowlist and hold rules stay plain.
- **B:** the evaluator becomes a Sapphire contract. The SDK calls it through `@oasisprotocol/sapphire-paratime` (encrypted calldata, signed queries) and relays `allow` to Base.
- **C:** the SDK encrypts amounts with `@zama-fhe/sdk` and calls `spend(to, externalEuint64, proof)` as in the crew brief.

## Reuse: Noir as a shared LLX privacy layer

All five use the same building blocks: Poseidon commitments, range checks, comparisons, and Merkle membership for 3 and 5. UltraHonk verify gas stays nearly flat as circuits grow (benchmarks above), so a shared verifier pattern carries over. Every effort figure below is an *estimate*, counted on top of item 1.

| # | Product | Same circuit family? | Extra effort | Caveat |
|---|---|---|---|---|
| 1 | **LLX Pay**: under spend cap, cap/balance hidden (**build first**) | Base circuit (the sketch above) | ~2–3 weeks total to a Base Sepolia demo | Amounts and payees stay public. Needs an audit before mainnet |
| 2 | **X-Escrow**: hidden amount, release condition proven | Yes: commitment to amount and terms, plus a proof that the release condition holds (deadline, milestone hash, `amount <= committed`) | +1–2 weeks | The USDC release transfer shows the amount at settlement, so it's hidden only until then. Means a new X-Escrow version: the current contract is live on 10 mainnets and had Claude's review only |
| 3 | **X-Lock**: prove "locked >= N months" without the quantity | Partly: Merkle membership over `(owner, amount, unlockTime)` leaves plus `unlockTime >= now + N` | +2–3 weeks | Existing X-Lock locks are **public on-chain**, so this hides *which* lock from the verifier, not the quantity from the chain. Also needs a published lock-set root (indexer or storage proof) |
| 4 | **Proof of funds**: agent covers a payment before service (M2 ported) | Yes: same as 1 with `balance >= price` | +2–4 days | Only meaningful against a committed balance (the vault from 1). A public wallet's balance is already visible. Services can verify off-chain for free (0.006 s measured) |
| 5 | **Settlement Proofs**: one proof that a batch followed policy | Yes: fixed-size loop of per-payment checks over a Merkle root of payments, or recursion | +2–3 weeks | Waits until Colosseum judging ends (recorder/proofs are frozen). Payments are still visible on-chain; the proof saves a consumer from re-checking each one |

## Sources

All primary sources are linked inline. Licences were read from each repo's GitHub licence metadata, LICENSE file, and the SPDX header of generated verifiers on 2026-10-16. Every measured number above came from one run of this research and isn't a production benchmark.
